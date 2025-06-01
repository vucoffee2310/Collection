import os
from google import genai
from google.genai import types
import sys
import re
from regex_patterns import prepare_regex_patterns
from similarity import find_longest_approx_common_string_k_mismatches_reduced # NEW: Import similarity function

# --- Private Helper Functions ---

def _initialize_gemini_client(api_key):
    """Initializes and returns the Google GenAI Client."""
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Google GenAI Client: {e.args}")
        return None

def _get_generation_config_and_contents(input_text):
    """Prepares the model name, contents, and generation configuration."""
    model_name = "gemini-2.5-flash-preview-05-20"
    contents_list = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=input_text)],
        ),
    ]
    generation_config = types.GenerateContentConfig(
        temperature=1.5,
        top_p=0.5,
        candidateCount=1,
        maxOutputTokens=65000,
        response_mime_type="text/plain",
        system_instruction=[types.Part.from_text(text="Translate to Vietnamese. Keep `(` and `)`. Output as JSON.")],
    )
    return model_name, contents_list, generation_config

def _handle_no_segmentation(client, model_name, contents_list, generation_config, output_filename, input_text):
    """Handles content generation when no segmentation keys are provided."""
    print(f"Starting content generation for '{input_text[:50]}...' to '{output_filename}' (no segmentation).")
    print("Generating content (dots indicate received chunks):")
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            stream = client.models.generate_content_stream(
                model=model_name,
                contents=contents_list,
                config=generation_config
            )
            chunk_count = 0
            for chunk in stream:
                if chunk.text:
                    f.write(chunk.text)
                    f.flush()
                    print(".", end="")
                    sys.stdout.flush()
                    chunk_count += 1
        print(f"\nContent generation complete. Total chunks received: {chunk_count}")
        print(f"Content saved to '{output_filename}'")
    except Exception as e:
        print(f"\nError during generation or file writing: {e}")

def _save_matched_segment_to_file(captured_content, segment_filename, print_message, print_captured_type, compiled_pattern):
    """Saves a matched segment to its file and prints information."""
    try:
        with open(segment_filename, "w", encoding="utf-8") as seg_f:
            seg_f.write(captured_content)
        print(f"\n--- Pattern Matched & Saved! ---")
        print(print_message)
        print(f"{print_captured_type} saved to '{segment_filename}'")
        print(f"Captured content preview (full match): '{captured_content[:150]}...'")
        print(f"Full regex pattern: {compiled_pattern.pattern}")
        print("---------------------\n", end="")
        sys.stdout.flush()
    except IOError as io_err:
        print(f"\nError saving segment to file {segment_filename}: {io_err}")

def _process_stream_and_segments(client, model_name, contents_list, generation_config, output_file_handle, patterns_to_check):
    """
    Streams content, writes to the main file, and processes segments in real-time.
    Returns total_generated_content and the start index of the last key found.
    """
    total_generated_content = ""
    found_patterns_reported = set()
    last_key_overall_start_index = -1
    chunk_count = 0

    print("Generating content (dots indicate received chunks; dashes indicate key matches):")

    stream = client.models.generate_content_stream(
        model=model_name,
        contents=contents_list,
        config=generation_config
    )

    for chunk in stream:
        if chunk.text:
            output_file_handle.write(chunk.text)
            output_file_handle.flush()
            total_generated_content += chunk.text
            print(".", end="")
            sys.stdout.flush()
            chunk_count += 1

            for pattern_info in patterns_to_check:
                compiled_pattern = pattern_info["compiled_pattern"]
                pattern_identifier = compiled_pattern.pattern

                if pattern_identifier not in found_patterns_reported:
                    match = compiled_pattern.search(total_generated_content)
                    if match:
                        print("-", end="") # Indicate a match
                        sys.stdout.flush()

                        # --- Process content using similarity.py based on pattern type ---
                        current_segment_content = ""
                        processed_content_description = ""

                        pattern_name = pattern_info["pattern_name"]
                        content_group_idx = pattern_info["content_group_idx"] # The group holding the primary content

                        if pattern_name == "first_key_pair":
                            # Regex groups: (1=key1)(2=content_G2)(3=key2)(4=150_chars_after_key2)
                            g2_content = match.group(content_group_idx) # This is the main content to be saved
                            g4_content = match.group(pattern_info["comparison_groups"]["s2_to_compare"])

                            # Compare first 150 characters of group 2 to entire group 4
                            s1_compare = g2_content[:pattern_info["comparison_groups"]["s1_start_len"]]
                            s2_compare = g4_content

                            overlap_match = find_longest_approx_common_string_k_mismatches_reduced(
                                s1_compare, s2_compare, min_matched_words=3, max_mismatches=3
                            )

                            current_segment_content = g2_content
                            if overlap_match:
                                # "remove from the match to the end of group 2"
                                # This means keeping only the part *before* the overlap starts in G2.
                                start_idx_in_g2 = g2_content.find(overlap_match)
                                if start_idx_in_g2 != -1:
                                    current_segment_content = g2_content[:start_idx_in_g2]
                                    print(f"\n--- Trimmed '{pattern_name}' (before overlap) ---")
                                    print(f"Original G{content_group_idx} preview: '{g2_content[:100]}...'")
                                    print(f"Overlap found: '{overlap_match}'")
                                    print(f"New G{content_group_idx} preview: '{current_segment_content[:100]}...'")
                                    sys.stdout.flush()
                            processed_content_description = f"Processed content from Group {content_group_idx}"

                        elif pattern_name == "general_pair":
                            # Regex groups: (1=150_chars_before_key1)(2=key1)(3=content_G3)(4=key2)(5=150_chars_after_key2)
                            g1_content = match.group(pattern_info["comparison_groups"]["first_compare"]["s1_group"])
                            g3_content = match.group(content_group_idx) # This is the main content to be saved
                            g5_content = match.group(pattern_info["comparison_groups"]["second_compare"]["s1_group"])

                            original_g3_content = g3_content # Keep original for comparison

                            # First comparison: G1 vs G3[:150]
                            s1_compare_1 = g1_content
                            s2_compare_1 = g3_content[:pattern_info["comparison_groups"]["first_compare"]["s2_end_len"]]
                            overlap1 = find_longest_approx_common_string_k_mismatches_reduced(
                                s1_compare_1, s2_compare_1, min_matched_words=3, max_mismatches=3
                            )
                            if overlap1:
                                # "remove text before the match from group 3"
                                start_idx_in_g3 = g3_content.find(overlap1)
                                if start_idx_in_g3 != -1:
                                    g3_content = g3_content[start_idx_in_g3:]
                                    print(f"\n--- Trimmed '{pattern_name}' (after overlap1) ---")
                                    print(f"Original G{content_group_idx} preview: '{original_g3_content[:100]}...'")
                                    print(f"Overlap1 found: '{overlap1}'")
                                    print(f"New G{content_group_idx} preview: '{g3_content[:100]}...'")
                                    sys.stdout.flush()

                            # Second comparison: G5 vs G3[-150:] (using potentially modified g3_content)
                            s1_compare_2 = g5_content
                            s2_compare_2 = g3_content[pattern_info["comparison_groups"]["second_compare"]["s2_start_len"]:]
                            overlap2 = find_longest_approx_common_string_k_mismatches_reduced(
                                s1_compare_2, s2_compare_2, min_matched_words=3, max_mismatches=3
                            )
                            if overlap2:
                                # "remove from the match to the end of group 3."
                                # This means keep only the part *before* the overlap starts in G3.
                                end_idx_in_g3 = g3_content.rfind(overlap2) # Use rfind for the last occurrence
                                if end_idx_in_g3 != -1:
                                    g3_content = g3_content[:end_idx_in_g3]
                                    print(f"\n--- Trimmed '{pattern_name}' (before overlap2) ---")
                                    print(f"Overlap2 found: '{overlap2}'")
                                    print(f"New G{content_group_idx} preview: '{g3_content[:100]}...'")
                                    sys.stdout.flush()

                            current_segment_content = g3_content
                            processed_content_description = f"Processed content from Group {content_group_idx}"

                        elif pattern_info["is_final_extraction_pattern"]: # Catches 'last_key_segment_with_prefix' and 'single_last_key_segment_with_prefix'
                            # Regex groups: (1=150_chars_before_last_key)(2=last_key)(3=content_G3)
                            g1_content = match.group(pattern_info["comparison_groups"]["s1_group"])
                            g3_content = match.group(content_group_idx) # This is the main content to be saved

                            original_g3_content = g3_content

                            # Comparison: G1 vs G3
                            s1_compare = g1_content
                            s2_compare = g3_content
                            overlap_match = find_longest_approx_common_string_k_mismatches_reduced(
                                s1_compare, s2_compare, min_matched_words=3, max_mismatches=3
                            )

                            current_segment_content = g3_content
                            if overlap_match:
                                # "remove the text before the match from group 3."
                                # This means keep only the part *from* the overlap to the end of G3.
                                start_idx_in_g3 = g3_content.find(overlap_match)
                                if start_idx_in_g3 != -1:
                                    current_segment_content = g3_content[start_idx_in_g3:]
                                    print(f"\n--- Trimmed '{pattern_name}' (after overlap) ---")
                                    print(f"Original G{content_group_idx} preview: '{original_g3_content[:100]}...'")
                                    print(f"Overlap found: '{overlap_match}'")
                                    print(f"New G{content_group_idx} preview: '{current_segment_content[:100]}...'")
                                    sys.stdout.flush()
                            processed_content_description = f"Processed content from Group {content_group_idx}"

                        else:
                            # Default if no specific processing rule applies, save the entire matched segment
                            current_segment_content = match.group(0)
                            processed_content_description = "Entire matched segment (full regex match, no specific processing)"
                        # --- End similarity.py processing ---

                        filename_suffix = ""
                        print_message = ""
                        if len(pattern_info["keys_involved"]) == 2:
                            key1_str, key2_str = pattern_info["keys_involved"]
                            filename_suffix = f"{key1_str}_to_{key2_str}.txt"
                            print_message = f"Keys '{key1_str}' and '{key2_str}' found with pattern '{pattern_info['pattern_name']}'."
                        else:
                            single_key_str = pattern_info["keys_involved"][0]
                            # For single/last keys, the file saved here is just the processed content *after* the key, not the full slice.
                            # The full slice is handled separately by _extract_and_save_final_slice after the stream completes.
                            filename_suffix = f"{single_key_str}.txt"
                            print_message = f"Key '{single_key_str}' found with pattern '{pattern_info['pattern_name']}'."
                            if pattern_info["is_final_extraction_pattern"]:
                                last_key_overall_start_index = match.start(pattern_info["key_group_idx"]) # Use the group index of the key itself for overall start index tracking

                        segment_filename = f"matched_segment_{filename_suffix}"
                        _save_matched_segment_to_file(
                            current_segment_content, # Pass the processed content
                            segment_filename,
                            print_message,
                            processed_content_description, # Pass the new description
                            compiled_pattern
                        )
                        found_patterns_reported.add(pattern_identifier)

    print(f"\nContent generation stream complete. Total chunks received: {chunk_count}")
    return total_generated_content, last_key_overall_start_index

def _extract_and_save_final_slice(total_generated_content, last_key_overall_start_index, final_segment_key_str):
    """Extracts and saves the final segment slice from the last key to the absolute end."""
    if last_key_overall_start_index != -1 and final_segment_key_str:
        final_segment_content = total_generated_content[last_key_overall_start_index:]
        final_slice_filename = f"final_segment_slice_from_{final_segment_key_str}_to_absolute_end.txt"
        try:
            with open(final_slice_filename, "w", encoding="utf-8") as final_f:
                final_f.write(final_segment_content)
            print(f"\n--- Final Segment Slice Extraction ---")
            print(f"Full segment slice from key '{final_segment_key_str}' to end of content saved to '{final_slice_filename}'")
            print(f"Preview: '{final_segment_content[:500]}...' (truncated for display)")
            print(f"Total length of final segment slice: {len(final_segment_content)} characters.")
            print("-------------------------------\n")
            sys.stdout.flush()
        except IOError as io_err:
            print(f"\nError saving final segment slice to file {final_slice_filename}: {io_err}")

# --- Main Public Function ---

def generate_and_save(input_text, output_filename, api_key, generated_keys):
    """
    Generate content using Google GenAI API and save it to a file.
    Each matched content segment (the entire regex match) is saved to a separate .txt file.
    For the last key, the final segment (from the key to absolute end) is extracted AFTER the stream completes.
    """
    if not api_key:
        print("Error: GEMINI_API_KEY not provided for generate_and_save function.")
        return

    patterns_to_check, final_segment_key_str = prepare_regex_patterns(generated_keys)
    client = _initialize_gemini_client(api_key)
    if not client:
        return

    model_name, contents_list, generation_config = _get_generation_config_and_contents(input_text)

    if not patterns_to_check: # Handles empty generated_keys or if prepare_regex_patterns returns empty
        print("Warning: No segmentation patterns formed. Proceeding without segmentation.")
        _handle_no_segmentation(client, model_name, contents_list, generation_config, output_filename, input_text)
        return

    print(f"Starting content generation for '{input_text[:50]}...' to '{output_filename}' with segmentation.")

    total_generated_content = ""
    last_key_overall_start_index = -1

    try:
        with open(output_filename, "w", encoding="utf-8") as f_main:
            total_generated_content, last_key_overall_start_index = _process_stream_and_segments(
                client,
                model_name,
                contents_list,
                generation_config,
                f_main,
                patterns_to_check
            )

        _extract_and_save_final_slice(
            total_generated_content,
            last_key_overall_start_index,
            final_segment_key_str
        )

        print(f"All content saved to '{output_filename}'")
    except Exception as e:
        print(f"\nError during main generation process or file writing: {e}")
