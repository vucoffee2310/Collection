import os
import re
import io # For StringIO
import logging # For logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

# --- Global Configuration (Easier to find and modify) ---
# These were previously hardcoded or passed around less explicitly
# For the pair processing logic:
REQUIRED_NON_WHITESPACE_AROUND_KEYS = 150
OFFSET_CHARS_FOR_NEXT_P1_SEARCH = 250 # Constraint 1

# For GenAI API:
GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-05-20"
# --- End Global Configuration ---

# --- Core Helper Functions (Unchanged, crucial for logic) ---
def count_non_whitespace_threshold(text_source, start_idx, end_idx, threshold):
    """
    Checks if 'threshold' non-whitespace characters exist in text_source[start_idx:end_idx].
    Returns (True, count_at_stop_or_total)
    - True if threshold is met, count_at_stop_or_total will be >= threshold.
    - False if threshold is not met, count_at_stop_or_total will be the total found.
    """
    count = 0
    effective_end_idx = min(end_idx, len(text_source))
    for i in range(start_idx, effective_end_idx):
        if not text_source[i].isspace():
            count += 1
        if count >= threshold:
            return True, count # Threshold met
    return False, count # Threshold not met

def extract_n_non_whitespace(text_source, n_chars_to_extract, from_start=True):
    """
    Extracts a segment from text_source containing n_chars_to_extract non-whitespace characters.
    """
    if not text_source or n_chars_to_extract <= 0: return ""
    if from_start:
        buffer = []; nw_count = 0
        for char in text_source:
            buffer.append(char)
            if not char.isspace(): nw_count += 1
            if nw_count == n_chars_to_extract: break
        return "".join(buffer)
    else: # from_end
        nw_count = 0; start_idx_segment = len(text_source)
        for i in range(len(text_source) - 1, -1, -1):
            start_idx_segment = i
            if not text_source[i].isspace(): nw_count += 1
            if nw_count == n_chars_to_extract: break
        if nw_count < n_chars_to_extract and nw_count > 0: start_idx_segment = 0
        elif nw_count == 0: return ""
        return text_source[start_idx_segment:]

# --- New Class to Manage State for Each Target Pair ---
class TargetPair:
    """
    Represents a pair of keys (p1, p2) to be found and manages its state.
    """
    def __init__(self, p1_key, p2_key, original_index, total_pairs_in_list):
        self.p1_key_text = p1_key
        self.p2_key_text = p2_key
        self.original_list_index = original_index # Its order in the initial definition

        self.p1_found_at_index = -1
        self.p2_conceptual_end_index = -1 # Start of p2, or end of p1 if p2 is empty

        self.is_permanently_skipped = False # Due to Constraint 2 (out-of-order finding)
        self.is_fully_processed = False     # If file is written or it's deferred

        # Threshold check status
        self.before_content_sufficient = False
        self.after_content_sufficient = False
        self.actual_before_nw_count = 0
        self.actual_after_nw_count = 0

        # Rules derived from its position and p2 content
        self.is_first_pair_in_definition = (original_index == 0)
        self.is_last_pair_with_empty_p2 = (
            original_index == total_pairs_in_list - 1 and not p2_key
        )

        # Determine if checks are needed based on rules
        self.requires_before_content_check = not self.is_first_pair_in_definition
        self.requires_after_content_check = not self.is_last_pair_with_empty_p2
        # The last pair with empty p2 has its file written at the very end
        self.is_candidate_for_deferred_write = self.is_last_pair_with_empty_p2

    def __repr__(self):
        return (f"Pair(p1='{self.p1_key_text}', p2='{self.p2_key_text or '<END>'}', "
                f"p1_idx={self.p1_found_at_index}, p2_end_idx={self.p2_conceptual_end_index}, "
                f"skipped={self.is_permanently_skipped}, processed={self.is_fully_processed})")

    def are_both_keys_found(self):
        return self.p1_found_at_index != -1 and self.p2_conceptual_end_index != -1

    def p1_end_index(self):
        if self.p1_found_at_index == -1: return -1
        return self.p1_found_at_index + len(self.p1_key_text)

    def p2_actual_content_end_index(self):
        if self.p2_conceptual_end_index == -1: return -1
        return self.p2_conceptual_end_index + len(self.p2_key_text or "")


# --- Refactored Helper Functions for Pair Processing ---
def initialize_target_pair_objects(target_pair_definitions):
    """Converts list of (p1, p2) tuples to a list of TargetPair objects."""
    num_total_pairs = len(target_pair_definitions)
    return [
        TargetPair(p1, p2, idx, num_total_pairs)
        for idx, (p1, p2) in enumerate(target_pair_definitions)
    ]

def extract_and_format_segments(pair_object, full_text_content):
    """
    Extracts text segments ('before', 'between', 'after') for a qualified pair.
    """
    segments = {
        'before': "",
        'key1': pair_object.p1_key_text,
        'between': "",
        'key2': pair_object.p2_key_text or "", # Use empty string if p2_key_text is None or empty
        'after': ""
    }

    p1_start_idx = pair_object.p1_found_at_index
    p1_end_idx = pair_object.p1_end_index()
    # p2_conceptual_end_index is where p2 starts, or where p1 ends if p2 is empty
    p2_starts_idx = pair_object.p2_conceptual_end_index
    p2_content_ends_idx = pair_object.p2_actual_content_end_index()


    # BEFORE content
    if pair_object.requires_before_content_check:
        segments['before'] = extract_n_non_whitespace(
            full_text_content[0:p1_start_idx],
            REQUIRED_NON_WHITESPACE_AROUND_KEYS,
            from_start=False
        )

    # BETWEEN content
    if pair_object.is_last_pair_with_empty_p2:
        # For the special last pair, 'between' captures from after p1 to the very end
        segments['between'] = full_text_content[p1_end_idx:]
    else:
        segments['between'] = full_text_content[p1_end_idx : p2_starts_idx]

    # AFTER content
    if pair_object.requires_after_content_check:
        segments['after'] = extract_n_non_whitespace(
            full_text_content[p2_content_ends_idx:],
            REQUIRED_NON_WHITESPACE_AROUND_KEYS,
            from_start=True
        )
    return segments

def save_pair_data_to_file(segments_dict, p1_key, p2_key, output_directory):
    """Saves the extracted segments to a file."""
    pair_filename_p2_part = p2_key if p2_key else "end" # "end" if p2 is empty
    # Sanitize keys for filename
    safe_p1 = re.sub(r'[^\w_.)( -]', '', p1_key)
    safe_p2_part = re.sub(r'[^\w_.)( -]', '', pair_filename_p2_part)

    individual_filename = f"qualified_pair_{safe_p1}_to_{safe_p2_part}.txt"
    full_output_path = os.path.join(output_directory, individual_filename)

    output_content = (
        f"BEFORE_CONTENT:\n{segments_dict['before']}\n\n"
        f"KEY1:\n{segments_dict['key1']}\n\n"
        f"CONTENT_BETWEEN:\n{segments_dict['between']}\n\n"
        f"KEY2:\n{segments_dict['key2']}\n\n"
        f"AFTER_CONTENT:\n{segments_dict['after']}"
    )
    try:
        with open(full_output_path, "w", encoding="utf-8") as pair_file:
            pair_file.write(output_content)
        logging.info(f"  >> Saved details to '{full_output_path}'")
    except IOError as e:
        logging.error(f"Error writing file {full_output_path}: {e}")


# --- Main Simplified Function ---
def generate_and_save_simplified(input_text_for_llm, output_filename_base, gemini_api_key):
    """
    Generates content using Gemini, processes it in chunks to find key pairs,
    checks surrounding content, and saves qualified pairs.
    """
    if not gemini_api_key:
        logging.error("GEMINI_API_KEY not provided.")
        return

    try:
        client = genai.Client(api_key=gemini_api_key)
    except Exception as e:
        logging.error(f"Error initializing Google GenAI Client: {e}")
        return

    gen_config = types.GenerateContentConfig(
        temperature=1.6, top_p=0.3, candidate_count=1, max_output_tokens=65000,
        thinking_config=types.ThinkingConfig(thinking_budget=500), # Corrected parameter name
        response_mime_type="text/plain",
        system_instruction=[types.Part.from_text(text="Translate to Vietnamese. Keep `(` and `)`. Output as JSON.")]
    )
    gen_contents = [types.Content(role="user", parts=[types.Part.from_text(text=input_text_for_llm)])]

    logging.info(f"Starting content generation for input (first 50 chars): '{input_text_for_llm[:50]}...'")
    stream_output_file = f"{output_filename_base}_stream_simplified.txt"
    logging.info(f"Full AI stream will be saved to '{stream_output_file}'")

    cumulative_text_buffer = io.StringIO()
    current_total_text_length = 0

    # Define the sequence of (p1, p2) keys to search for
    target_pair_definitions = [('nfipjW', 'UHSgF7'), ('UHSgF7', 'fJewqJ'), ('fJewqJ', 'zFCugl'), ('zFCugl', 'TvGgkB'), ('TvGgkB', 'ofm8pg'), ('ofm8pg', 'LSln7I'), ('LSln7I', 'FFmPGd'), ('FFmPGd', 'uoAq8u'), ('uoAq8u', '6fe0Hu'), ('6fe0Hu', 'QOnYXE'), ('QOnYXE', 'e7u7I2'), ('e7u7I2', 'vppl1t'), ('vppl1t', 'P0sqsI'), ('P0sqsI', 'tYS0OI'), ('tYS0OI', 'keAb06'), ('keAb06', 'H5s59u'), ('H5s59u', 'd10xXS'), ('d10xXS', 'NVOymb'), ('NVOymb', 'jWAB4X'), ('jWAB4X', 'IDOh1U'), ('IDOh1U', 'B4bgwd'), ('B4bgwd', 'RcrKDz'), ('RcrKDz', 'lStfBP'), ('lStfBP', '4deNAS'), ('4deNAS', '')]
    all_target_pairs = initialize_target_pair_objects(target_pair_definitions)
    
    output_pairs_dir = "output_pairs_data_simplified"
    os.makedirs(output_pairs_dir, exist_ok=True)

    # State variables for processing
    # Constraint 1: Where to start searching for the *next* P1 key.
    global_p1_search_start_offset = 0
    # For handling the special last pair that might be deferred
    deferred_final_pair_object = None

    try:
        with open(stream_output_file, "w", encoding="utf-8") as f_stream:
            # Updated API call according to recent google-generativeai versions
            stream = client.models.generate_content_stream(
                model=f"models/{GEMINI_MODEL_NAME}", # Model path usually includes "models/"
                contents=gen_contents,
                config=gen_config
            )

            for chunk_num, chunk in enumerate(stream):
                if not hasattr(chunk, 'text') or not chunk.text:
                    logging.debug(f"Chunk {chunk_num+1} has no text, skipping.")
                    continue

                chunk_text = chunk.text
                f_stream.write(chunk_text) # Save raw chunk
                cumulative_text_buffer.write(chunk_text)
                current_total_text_length += len(chunk_text)
                
                full_text_so_far = cumulative_text_buffer.getvalue()
                logging.debug(f"\n--- Chunk {chunk_num+1} received (New total length: {current_total_text_length}, "
                              f"Global P1 search from: {global_p1_search_start_offset}) ---")

                for pair_idx, current_pair in enumerate(all_target_pairs):
                    if current_pair.is_permanently_skipped or current_pair.is_fully_processed:
                        continue # Already dealt with this pair

                    # --- 1. Find P1 Key ---
                    if current_pair.p1_found_at_index == -1:
                        # Search for P1 from the global offset
                        found_idx = full_text_so_far.find(current_pair.p1_key_text, global_p1_search_start_offset)
                        if found_idx != -1:
                            current_pair.p1_found_at_index = found_idx
                            logging.info(f"  Found P1='{current_pair.p1_key_text}' for pair {current_pair.original_list_index} "
                                         f"at index {found_idx} (searched from {global_p1_search_start_offset}).")

                            # Constraint 2: Skip any *earlier* un-found pairs
                            for prev_pair_scan_idx in range(current_pair.original_list_index):
                                earlier_pair = all_target_pairs[prev_pair_scan_idx]
                                if earlier_pair.p1_found_at_index == -1 and not earlier_pair.is_permanently_skipped:
                                    earlier_pair.is_permanently_skipped = True
                                    logging.info(f"    INFO: Pair {earlier_pair.original_list_index} "
                                                 f"('{earlier_pair.p1_key_text}') was not found before pair "
                                                 f"{current_pair.original_list_index}. Permanently skipping earlier pair.")
                        # else: P1 not found in this chunk from the current global offset

                    # --- 2. Find P2 Key (if P1 is found for this pair) ---
                    if current_pair.p1_found_at_index != -1 and current_pair.p2_conceptual_end_index == -1:
                        search_p2_from = current_pair.p1_end_index()
                        if current_pair.p2_key_text: # If P2 is a non-empty string
                            found_idx2 = full_text_so_far.find(current_pair.p2_key_text, search_p2_from)
                            if found_idx2 != -1:
                                current_pair.p2_conceptual_end_index = found_idx2
                                logging.info(f"  Found P2='{current_pair.p2_key_text}' for pair {current_pair.original_list_index} "
                                             f"at index {found_idx2} (P1 was at {current_pair.p1_found_at_index}).")

                                # Constraint 1: Update global_p1_search_start_offset for *next* pair's P1
                                content_between_p1_and_p2_start = search_p2_from
                                content_between_p1_and_p2_end = found_idx2 # Start of P2
                                length_of_content_between = content_between_p1_and_p2_end - content_between_p1_and_p2_start
                                
                                offset_from_p1_end_in_between_segment = max(0, length_of_content_between - OFFSET_CHARS_FOR_NEXT_P1_SEARCH)
                                global_p1_search_start_offset = content_between_p1_and_p2_start + offset_from_p1_end_in_between_segment
                                logging.info(f"    Updated global P1 search offset to: {global_p1_search_start_offset} "
                                             f"(based on pair {current_pair.original_list_index}).")
                        else: # P2 is an empty string (e.g., for the last pair)
                            current_pair.p2_conceptual_end_index = search_p2_from # Conceptual end is right after P1
                            logging.info(f"  P2 is empty for pair {current_pair.original_list_index}, conceptual end is at {search_p2_from}.")
                            
                            # Constraint 1 (for empty P2): Update global P1 search for next pair
                            global_p1_search_start_offset = search_p2_from
                            logging.info(f"    Updated global P1 search offset to: {global_p1_search_start_offset} "
                                         f"(based on pair {current_pair.original_list_index} with empty P2).")
                    
                    # --- 3. If both keys found, check content conditions ---
                    if current_pair.are_both_keys_found() and not current_pair.is_fully_processed:
                        
                        # Check "Before P1" content
                        if current_pair.requires_before_content_check and not current_pair.before_content_sufficient:
                            is_sufficient, count = count_non_whitespace_threshold(
                                full_text_so_far, 0, current_pair.p1_found_at_index, REQUIRED_NON_WHITESPACE_AROUND_KEYS
                            )
                            current_pair.actual_before_nw_count = count
                            if is_sufficient:
                                current_pair.before_content_sufficient = True
                        
                        # Check "After P2" content
                        # Note: after_content_starts_at_idx uses p2_actual_content_end_index()
                        after_content_starts_at_idx = current_pair.p2_actual_content_end_index()
                        if current_pair.requires_after_content_check and not current_pair.after_content_sufficient:
                            is_sufficient, count = count_non_whitespace_threshold(
                                full_text_so_far,
                                after_content_starts_at_idx,
                                current_total_text_length, # Check till end of current cumulative text
                                REQUIRED_NON_WHITESPACE_AROUND_KEYS
                            )
                            current_pair.actual_after_nw_count = count
                            if is_sufficient:
                                current_pair.after_content_sufficient = True

                        # Determine if all conditions for this pair are met
                        all_conditions_met = True
                        if current_pair.requires_before_content_check and not current_pair.before_content_sufficient:
                            all_conditions_met = False
                        if current_pair.requires_after_content_check and not current_pair.after_content_sufficient:
                            all_conditions_met = False
                        
                        log_before_count = current_pair.actual_before_nw_count if current_pair.requires_before_content_check else 'N/A'
                        log_after_count = current_pair.actual_after_nw_count if current_pair.requires_after_content_check else 'N/A'
                        logging.debug(f"  Pair {current_pair.original_list_index} ('{current_pair.p1_key_text}', '{current_pair.p2_key_text or '<END>'}'): "
                                      f"Before Content OK? ({current_pair.before_content_sufficient if current_pair.requires_before_content_check else 'N/A'}), "
                                      f"Count: {log_before_count}. "
                                      f"After Content OK? ({current_pair.after_content_sufficient if current_pair.requires_after_content_check else 'N/A'}), "
                                      f"Count: {log_after_count}.")

                        if all_conditions_met:
                            current_pair.is_fully_processed = True # Mark as processed
                            if current_pair.is_candidate_for_deferred_write:
                                logging.info(f"\n!!! DEFERRED: Pair {current_pair.original_list_index} ('{current_pair.p1_key_text}', "
                                             f"'{current_pair.p2_key_text or '<END>'}') qualified. "
                                             f"File will be generated after stream ends. !!!")
                                deferred_final_pair_object = current_pair
                            else:
                                logging.info(f"\n!!! QUALIFIED PAIR: {current_pair.original_list_index} ('{current_pair.p1_key_text}', "
                                             f"'{current_pair.p2_key_text or '<END>'}') - Conditions met. Saving. !!!")
                                segments = extract_and_format_segments(current_pair, full_text_so_far)
                                save_pair_data_to_file(segments, current_pair.p1_key_text, current_pair.p2_key_text, output_pairs_dir)
        
        # --- After stream processing ---
        final_complete_text = cumulative_text_buffer.getvalue()
        if deferred_final_pair_object:
            # Ensure it wasn't somehow skipped later (shouldn't happen with current logic if it reached deferral)
            if not deferred_final_pair_object.is_permanently_skipped:
                logging.info(f"\n--- Processing DEFERRED final pair ('{deferred_final_pair_object.p1_key_text}', "
                             f"'{deferred_final_pair_object.p2_key_text or '<END>'}') after stream completion ---")
                # For the deferred last pair, its 'between' content goes to the very end of the text.
                segments = extract_and_format_segments(deferred_final_pair_object, final_complete_text)
                save_pair_data_to_file(segments, deferred_final_pair_object.p1_key_text,
                                       deferred_final_pair_object.p2_key_text, output_pairs_dir)
            else:
                logging.warning(f"Deferred pair {deferred_final_pair_object} was marked as skipped. Not saving.")
                                        
        logging.info(f"\nStream finished. Full content saved to '{stream_output_file}'")
        logging.info(f"Final cumulative output length: {current_total_text_length} characters.")

        num_skipped = sum(1 for p in all_target_pairs if p.is_permanently_skipped)
        if num_skipped > 0:
            logging.info(f"Number of pairs permanently skipped due to out-of-order finding: {num_skipped}")

        try:
            actual_files_saved = len(os.listdir(output_pairs_dir))
            if actual_files_saved > 0:
                logging.info(f"Total fully qualified pair files saved: {actual_files_saved}")
            else:
                logging.info("No fully qualified target pairs were detected and saved.")
        except FileNotFoundError:
             logging.info(f"Output directory {output_pairs_dir} not found or no files saved.")


    except Exception as e:
        logging.error(f"Error during generation or file operations: {e}", exc_info=True)
    finally:
        cumulative_text_buffer.close()


def setup_logging():
    """Configures basic logging."""
    logging.basicConfig(
        level=logging.INFO, # Change to logging.DEBUG for more verbose output
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(), # Output to console
            # You can add logging.FileHandler("script_log.log") here to also log to a file
        ]
    )

if __name__ == "__main__":
    setup_logging()
    load_dotenv() # Load environment variables from .env file

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logging.error("Error: GEMINI_API_KEY not found in environment variables.")
        logging.error("Please create a .env file with GEMINI_API_KEY='YOUR_API_KEY_HERE'")
        exit()

    # Example input for the LLM
    # For a real test, you'd want input that is likely to generate your target keys.
    # This empty input will likely not produce the target keys '2f8e', etc.
    # You would replace this with actual meaningful input.
    test_input_for_llm = """TXT"""

    # If you want to test with a pre-generated text file instead of calling the API:
    # You would need to modify the generate_and_save_simplified function to accept
    # text directly or read from a file, bypassing the API call.
    # For now, it's set up to call the API.

    generate_and_save_simplified(test_input_for_llm, "generated_output_simplified", api_key)

    logging.info("Script finished.")
