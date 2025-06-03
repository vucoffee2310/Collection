import os
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- Core Helper Functions (from previous versions, kept for utility) ---
def count_non_whitespace_threshold(text_source, start_idx, end_idx, threshold):
    count = 0
    effective_end_idx = min(end_idx, len(text_source))
    for i in range(start_idx, effective_end_idx):
        if not text_source[i].isspace():
            count += 1
        if count >= threshold:
            return True, count
    return False, count

def extract_n_non_whitespace(text_source, n_chars_to_extract, from_start=True):
    if not text_source or n_chars_to_extract <= 0:
        return ""
    if from_start:
        buffer = []
        nw_count = 0
        for char in text_source:
            buffer.append(char)
            if not char.isspace():
                nw_count += 1
            if nw_count == n_chars_to_extract:
                break
        return "".join(buffer)
    else: # from_start == False
        nw_count = 0
        start_idx_segment = len(text_source)
        for i in range(len(text_source) - 1, -1, -1):
            start_idx_segment = i
            if not text_source[i].isspace():
                nw_count += 1
            if nw_count == n_chars_to_extract:
                break
        if nw_count < n_chars_to_extract and nw_count > 0: start_idx_segment = 0
        elif nw_count == 0: return ""
        return text_source[start_idx_segment:]

# --- New Refactored Helper Functions ---
def _determine_pair_processing_rules(k, num_total_pairs, p2_is_empty_str):
    """Determines the processing rules for a given pair based on its position."""
    is_first_pair = (k == 0)
    is_last_pair_in_list = (k == num_total_pairs - 1)

    rule = {
        'needs_before_check': False,
        'needs_after_check': False,
        'is_deferred_write': False,
        'rule_type': ''  # 'first', 'middle', 'last_special'
    }

    if is_first_pair:
        rule['needs_after_check'] = True
        rule['rule_type'] = 'first'
    elif is_last_pair_in_list and p2_is_empty_str:
        rule['needs_before_check'] = True
        rule['is_deferred_write'] = True
        rule['rule_type'] = 'last_special'
    else:  # Middle pairs, or a 'normal' last pair
        rule['needs_before_check'] = True
        rule['needs_after_check'] = True
        rule['rule_type'] = 'middle'
    return rule

def _extract_segments_for_output(rule_type, p1, p2, idx1, idx2_conceptual,
                                 cumulative_text_source, req_nw):
    """Extracts text segments based on the pair rule for file output."""
    segments = {
        'before': "", 'key1': p1, 'between': "", 'key2': p2 if p2 else "", 'after': ""
    }

    if rule_type == 'first':
        segments['between'] = cumulative_text_source[idx1 + len(p1) : idx2_conceptual]
        segments['after'] = extract_n_non_whitespace(
            cumulative_text_source[idx2_conceptual + len(p2):], req_nw, from_start=True
        )
    elif rule_type == 'last_special': # p2 is ""
        segments['before'] = extract_n_non_whitespace(
            cumulative_text_source[0:idx1], req_nw, from_start=False
        )
        segments['between'] = cumulative_text_source[idx1 + len(p1):] # From p1 to end
    elif rule_type == 'middle': # Includes 'normal' last pairs like ('56ca', '6f36')
        segments['before'] = extract_n_non_whitespace(
            cumulative_text_source[0:idx1], req_nw, from_start=False
        )
        segments['between'] = cumulative_text_source[idx1 + len(p1) : idx2_conceptual]
        segments['after'] = extract_n_non_whitespace(
            cumulative_text_source[idx2_conceptual + len(p2):], req_nw, from_start=True
        )
    return segments

def _write_pair_data_to_file(segments_dict, p1_key, p2_key, output_dir):
    """Writes the extracted segments to a formatted file."""
    pair_filename_p2_part = p2_key if p2_key else "end"
    safe_p1 = re.sub(r'[^\w_.)( -]', '', p1_key)
    safe_p2_part = re.sub(r'[^\w_.)( -]', '', pair_filename_p2_part)
    individual_filename = f"qualified_pair_{safe_p1}_to_{safe_p2_part}.txt"
    full_output_path = os.path.join(output_dir, individual_filename)

    output_content = (
        f"BEFORE_CONTENT:\n{segments_dict['before']}\n\n"
        f"KEY1:\n{segments_dict['key1']}\n\n"
        f"CONTENT_BETWEEN:\n{segments_dict['between']}\n\n"
        f"KEY2:\n{segments_dict['key2']}\n\n"
        f"AFTER_CONTENT:\n{segments_dict['after']}"
    )
    with open(full_output_path, "w", encoding="utf-8") as pair_file:
        pair_file.write(output_content)
    print(f"  >> Saved details to '{full_output_path}'")

# --- Main Function ---
def generate_and_save(input_text, output_filename_base, api_key):
    if not api_key:
        print("Error: GEMINI_API_KEY not provided.")
        return

    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Google GenAI Client: {e}")
        return

    model_name = "gemini-2.5-flash-preview-05-20"
    gen_contents = [types.Content(role="user", parts=[types.Part.from_text(text=input_text)])]
    gen_config = types.GenerateContentConfig(
        temperature=1.5, top_p=0.5, candidateCount=1, maxOutputTokens=65000,
        thinking_config=types.ThinkingConfig(thinking_budget=500),
        response_mime_type="text/plain",
        system_instruction=[types.Part.from_text(text="Translate to Vietnamese. Keep `(` and `)`. Output as JSON.")],
    )

    print(f"Starting content generation for input (first 50 chars): '{input_text[:50]}...'")
    stream_output_file = f"{output_filename_base}_stream.txt"
    print(f"Full stream will be saved to '{stream_output_file}'")
    
    cumulative_text = ""
    target_pairs = [
        ('2f8e', '09e5'), ('09e5', 'ddc7'), ('ddc7', '29t9'),
        ('29t9', '56ca'), ('56ca', '6f36'), ('6f36', ''),
    ]
    REQUIRED_NON_WHITESPACE = 150
    output_pairs_dir = "output_pairs_data"
    os.makedirs(output_pairs_dir, exist_ok=True)

    basic_found_pairs = set()
    conditions_met_for_pair = set() # Tracks pairs whose char conditions are met (written or deferred)
    last_pair_deferred_info = None
    
    try:
        with open(stream_output_file, "w", encoding="utf-8") as f_stream:
            stream = client.models.generate_content_stream(model=model_name, contents=gen_contents, config=gen_config)
            for chunk_num, chunk in enumerate(stream):
                if not chunk.text: continue
                
                f_stream.write(chunk.text)
                cumulative_text += chunk.text
                print(f"\n--- Chunk {chunk_num+1} received ---")

                for k, (p1, p2) in enumerate(target_pairs):
                    if (p1, p2) in conditions_met_for_pair: continue

                    idx1 = cumulative_text.find(p1)
                    idx2_actual = -1 # Actual find result for p2
                    if p2:
                        idx2_actual = cumulative_text.find(p2, idx1 + len(p1) if idx1 != -1 else 0)
                    
                    # Determine conceptual idx2 for segment extraction logic
                    idx2_conceptual = idx2_actual if p2 else (idx1 + len(p1) if idx1 != -1 else -1)

                    pair_found_in_order = (idx1 != -1) and ( (not p2) or (p2 and idx2_actual != -1 and idx1 < idx2_actual) )

                    if pair_found_in_order:
                        pair_display_name = f"('{p1}', '{p2 if p2 else '<END>'}')"
                        if (p1, p2) not in basic_found_pairs:
                            print(f"\n--- Basic pair found: {pair_display_name} (p1 at {idx1}, p2 at {idx2_actual if p2 else 'N/A'}) ---")
                            basic_found_pairs.add((p1, p2))

                        rule = _determine_pair_processing_rules(k, len(target_pairs), not p2)
                        
                        met_before_req, met_after_req = True, True # Default to true if not needed
                        count_before, count_after = 0, 0

                        if rule['needs_before_check']:
                            met_before_req, count_before = count_non_whitespace_threshold(
                                cumulative_text, 0, idx1, REQUIRED_NON_WHITESPACE
                            )
                        if rule['needs_after_check']:
                            met_after_req, count_after = count_non_whitespace_threshold(
                                cumulative_text, idx2_conceptual + len(p2), len(cumulative_text), REQUIRED_NON_WHITESPACE
                            )
                        
                        print(f"  {pair_display_name}: Rule '{rule['rule_type']}'. Before Check: {rule['needs_before_check']}({count_before}), After Check: {rule['needs_after_check']}({count_after}).")

                        current_pair_conditions_met = met_before_req and met_after_req

                        if current_pair_conditions_met:
                            conditions_met_for_pair.add((p1, p2))
                            if rule['is_deferred_write']:
                                print(f"\n!!! LAST PAIR {pair_display_name} CONDITIONALLY QUALIFIED - File will be generated at stream end. !!!")
                                last_pair_deferred_info = {'p1': p1, 'p2': p2, 'idx1': idx1, 'rule_type': rule['rule_type']}
                            else:
                                print(f"\n!!! QUALIFIED PAIR: {pair_display_name} - Conditions met. Saving. !!!")
                                segments = _extract_segments_for_output(
                                    rule['rule_type'], p1, p2, idx1, idx2_conceptual,
                                    cumulative_text, REQUIRED_NON_WHITESPACE
                                )
                                _write_pair_data_to_file(segments, p1, p2, output_pairs_dir)
        
        # After stream processing: Handle deferred write for the last special pair
        if last_pair_deferred_info:
            info = last_pair_deferred_info
            print(f"\n--- Processing PENDING last pair ('{info['p1']}', '<END>') after stream completion ---")
            # For last_special, idx2_conceptual is idx1 + len(p1)
            idx2_conceptual_deferred = info['idx1'] + len(info['p1'])
            segments = _extract_segments_for_output(
                info['rule_type'], info['p1'], info['p2'], info['idx1'], idx2_conceptual_deferred,
                cumulative_text, # Use FINAL cumulative_text
                REQUIRED_NON_WHITESPACE
            )
            _write_pair_data_to_file(segments, info['p1'], info['p2'], output_pairs_dir)
                                        
        print(f"\nStream finished. Full content saved to '{stream_output_file}'")
        print(f"Final cumulative output length: {len(cumulative_text)} characters.")
        actual_files_saved = len(os.listdir(output_pairs_dir))
        if actual_files_saved > 0:
            print(f"Total fully qualified pair files saved: {actual_files_saved}")
            print(f"Saved pairs details are in the '{output_pairs_dir}' directory.")
        else:
            print("No fully qualified target pairs were detected and saved.")

    except Exception as e:
        print(f"Error during generation or file operations: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment variables.")
        print("Please create a .env file with GEMINI_API_KEY='YOUR_API_KEY_HERE'")
        exit()

    REQUIRED_NON_WHITESPACE_TEST = 150 
    
    def make_text_with_n_non_whitespace(target_n, base_char="x", prefix_text="", suffix_text=""):
        current_non_whitespace = sum(1 for c in prefix_text if not c.isspace()) + \
                                 sum(1 for c in suffix_text if not c.isspace())
        needed_from_base = max(0, target_n - current_non_whitespace)
        return prefix_text + (base_char * needed_from_base) + suffix_text

    input_text_for_test = f"""
    Text before first pair. {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "s", "START_")}
    2f8e
    Content between 2f8e and 09e5.
    09e5
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "a", "AFTER_FIRST_09e5_")} This text is after first pair (09e5).
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "b", "BEFORE_SECOND_09e5_")} This text is before second pair (09e5).
    ddc7
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "c", "AFTER_SECOND_ddc7_")} This text is after second pair (ddc7).
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "d", "BEFORE_THIRD_ddc7_")} This text is before third pair (ddc7).
    29t9
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "e", "AFTER_THIRD_29t9_")} This text is after third pair (29t9).
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "f", "BEFORE_FOURTH_29t9_")} This text is before fourth pair (29t9).
    56ca
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "g", "AFTER_FOURTH_56ca_")} This text is after fourth pair (56ca).
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "h", "BEFORE_FIFTH_56ca_")} This text is before fifth pair (56ca).
    6f36
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "i", "AFTER_FIFTH_6f36_")} This text is after fifth pair (6f36).
    {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST, "j", "BEFORE_LAST_TAG_")} This is the text BEFORE the final '6f36' for the special rule.
    6f36
    This is the final content that should be captured for 'CONTENT_BETWEEN' of the last '6f36' rule. It will extend to the very end of this entire input. {make_text_with_n_non_whitespace(REQUIRED_NON_WHITESPACE_TEST + 50, "k", "CONTENT_AFTER_LAST_TAG_")}
    And even more text at the absolute end.
    ## END OF DOCUMENT ##
    """
    generate_and_save(input_text_for_test, "generated_output_main", api_key)
