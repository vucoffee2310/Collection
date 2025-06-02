import os
from google import genai
from google.genai import types
import sys
import re
from subtitles.regex_patterns import prepare_regex_patterns # Assuming same level import
from subtitles.similarity import find_longest_approx_common_string_k_mismatches_reduced

# --- Constants ---
DEFAULT_CONTEXT_CHARS = 150
MODEL_NAME = "gemini-2.5-flash-preview-05-20" # Or make this configurable
MAX_OUTPUT_TOKENS = 65000
TEMPERATURE = 1.5
TOP_P = 0.5
SYSTEM_INSTRUCTION_TEXT = "Translate to Vietnamese. Keep `(` and `)`. Output as JSON."

# --- Private Helper Functions ---

def _initialize_gemini_client(api_key):
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Google GenAI Client: {e.args}")
        return None

def _get_generation_config_and_contents(input_text):
    contents_list = [types.Content(role="user", parts=[types.Part.from_text(text=input_text)])]
    generation_config = types.GenerateContentConfig(
        temperature=TEMPERATURE,
        top_p=TOP_P,
        candidate_count=1, # candidateCount to candidate_count
        max_output_tokens=MAX_OUTPUT_TOKENS, # maxOutputTokens to max_output_tokens
        response_mime_type="text/plain",
        system_instruction=[types.Part.from_text(text=SYSTEM_INSTRUCTION_TEXT)],
    )
    return MODEL_NAME, contents_list, generation_config

def _handle_no_segmentation(client, model_name, contents_list, generation_config, output_filename, input_text_preview):
    print(f"Starting content generation for '{input_text_preview}...' to '{output_filename}' (no segmentation).")
    print("Generating content (dots indicate received chunks):")
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            stream = client.models.generate_content_stream(
                model=model_name, contents=contents_list, config=generation_config
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
        print(f"\nError during generation or file writing (no segmentation): {e}")

def _save_matched_segment_to_file(captured_content, segment_filename, print_message, content_description, compiled_pattern):
    try:
        with open(segment_filename, "w", encoding="utf-8") as seg_f:
            seg_f.write(captured_content)
        print(f"\n--- Pattern Matched & Saved! ---")
        print(print_message)
        print(f"{content_description} saved to '{segment_filename}'")
        print(f"Captured content preview: '{captured_content[:150]}...'")
        print(f"Regex pattern: {compiled_pattern.pattern}") # Simplified
        print("---------------------\n", end="")
        sys.stdout.flush()
    except IOError as io_err:
        print(f"\nError saving segment to file {segment_filename}: {io_err}")

def _process_stream_and_segments(client, model_name, contents_list, generation_config, output_file_handle, patterns_to_check):
    total_generated_content = ""
    found_patterns_reported = set()
    last_key_overall_start_index = -1
    chunk_count = 0

    print("Generating content (dots indicate received chunks; dashes indicate key matches):")
    stream = client.models.generate_content_stream(
        model=model_name, contents=contents_list, config=generation_config
    )

    for chunk in stream:
        if not chunk.text:
            continue
        
        output_file_handle.write(chunk.text)
        output_file_handle.flush()
        total_generated_content += chunk.text
        print(".", end="")
        sys.stdout.flush()
        chunk_count += 1

        for pattern_info in patterns_to_check:
            compiled_pattern = pattern_info["compiled_pattern"]
            pattern_identifier = compiled_pattern.pattern

            if pattern_identifier in found_patterns_reported:
                continue

            match = compiled_pattern.search(total_generated_content)
            if not match:
                continue

            print("-", end="") # Indicate a match
            sys.stdout.flush()

            current_segment_content = ""
            pattern_name = pattern_info["pattern_name"]
            content_group_idx = pattern_info["content_group_idx"]
            processed_content_description = f"Processed content from Group {content_group_idx}"


            if pattern_name == "first_key_pair":
                g2_content = match.group(content_group_idx)
                g4_content = match.group(pattern_info["comparison_groups"]["s2_to_compare"])
                s1_compare = g2_content[:pattern_info["comparison_groups"]["s1_start_len"]]
                
                overlap_match = find_longest_approx_common_string_k_mismatches_reduced(s1_compare, g4_content)
                current_segment_content = g2_content
                if overlap_match:
                    start_idx_in_g2 = g2_content.find(overlap_match)
                    if start_idx_in_g2 != -1:
                        current_segment_content = g2_content[:start_idx_in_g2]
                        print(f"\n--- Trimmed '{pattern_name}' (before overlap) ---")
                        print(f"Overlap: '{overlap_match}'. New G{content_group_idx} preview: '{current_segment_content[:100]}...'")
                        sys.stdout.flush()

            elif pattern_name == "general_pair":
                g1_content = match.group(pattern_info["comparison_groups"]["first_compare"]["s1_group"])
                g3_content = match.group(content_group_idx)
                g5_content = match.group(pattern_info["comparison_groups"]["second_compare"]["s1_group"])
                
                # First comparison
                s1_compare_1 = g1_content
                s2_compare_1 = g3_content[:pattern_info["comparison_groups"]["first_compare"]["s2_end_len"]]
                overlap1 = find_longest_approx_common_string_k_mismatches_reduced(s1_compare_1, s2_compare_1)
                if overlap1:
                    start_idx_in_g3 = g3_content.find(overlap1)
                    if start_idx_in_g3 != -1:
                        g3_content = g3_content[start_idx_in_g3:]
                        print(f"\n--- Trimmed '{pattern_name}' (after overlap1) ---")
                        print(f"Overlap1: '{overlap1}'. New G{content_group_idx} preview: '{g3_content[:100]}...'")
                        sys.stdout.flush()
                
                # Second comparison (on potentially modified g3_content)
                s1_compare_2 = g5_content
                s2_compare_2 = g3_content[pattern_info["comparison_groups"]["second_compare"]["s2_start_len"]:]
                overlap2 = find_longest_approx_common_string_k_mismatches_reduced(s1_compare_2, s2_compare_2)
                if overlap2:
                    end_idx_in_g3 = g3_content.rfind(overlap2)
                    if end_idx_in_g3 != -1:
                        g3_content = g3_content[:end_idx_in_g3]
                        print(f"\n--- Trimmed '{pattern_name}' (before overlap2) ---")
                        print(f"Overlap2: '{overlap2}'. New G{content_group_idx} preview: '{g3_content[:100]}...'")
                        sys.stdout.flush()
                current_segment_content = g3_content

            elif pattern_info["is_final_extraction_pattern"]:
                g1_content = match.group(pattern_info["comparison_groups"]["s1_group"])
                g3_content = match.group(content_group_idx)
                
                overlap_match = find_longest_approx_common_string_k_mismatches_reduced(g1_content, g3_content)
                current_segment_content = g3_content
                if overlap_match:
                    start_idx_in_g3 = g3_content.find(overlap_match)
                    if start_idx_in_g3 != -1:
                        current_segment_content = g3_content[start_idx_in_g3:]
                        print(f"\n--- Trimmed '{pattern_name}' (after overlap) ---")
                        print(f"Overlap: '{overlap_match}'. New G{content_group_idx} preview: '{current_segment_content[:100]}...'")
                        sys.stdout.flush()
            else: # Should not happen if patterns are well-defined
                current_segment_content = match.group(0) # Fallback
                processed_content_description = "Entire matched segment (fallback, no specific processing)"


            filename_suffix = ""
            print_message = ""
            if len(pattern_info["keys_involved"]) == 2:
                key1, key2 = pattern_info["keys_involved"]
                filename_suffix = f"{key1}_to_{key2}.txt"
                print_message = f"Keys '{key1}' and '{key2}' found with '{pattern_info['pattern_name']}'."
            else:
                single_key = pattern_info["keys_involved"][0]
                filename_suffix = f"{single_key}.txt"
                print_message = f"Key '{single_key}' found with '{pattern_info['pattern_name']}'."
                if pattern_info["is_final_extraction_pattern"]:
                    last_key_overall_start_index = match.start(pattern_info["key_group_idx"])
            
            segment_filename = f"matched_segment_{filename_suffix}"
            _save_matched_segment_to_file(
                current_segment_content, segment_filename, print_message,
                processed_content_description, compiled_pattern
            )
            found_patterns_reported.add(pattern_identifier)

    print(f"\nContent generation stream complete. Total chunks received: {chunk_count}")
    return total_generated_content, last_key_overall_start_index

def _extract_and_save_final_slice(total_generated_content, last_key_start_idx, final_key_str):
    if last_key_start_idx == -1 or not final_key_str:
        return
    
    final_segment_content = total_generated_content[last_key_start_idx:]
    final_slice_filename = f"final_segment_slice_from_{final_key_str}_to_absolute_end.txt"
    try:
        with open(final_slice_filename, "w", encoding="utf-8") as final_f:
            final_f.write(final_segment_content)
        print(f"\n--- Final Segment Slice Extraction ---")
        print(f"Segment from key '{final_key_str}' to end saved to '{final_slice_filename}'")
        print(f"Preview: '{final_segment_content[:200]}...' (length: {len(final_segment_content)})")
        print("-------------------------------\n")
        sys.stdout.flush()
    except IOError as io_err:
        print(f"\nError saving final segment slice to {final_slice_filename}: {io_err}")

# --- Main Public Function ---

def generate_and_save(input_text, output_filename, api_key, generated_keys, context_chars_for_regex=DEFAULT_CONTEXT_CHARS):
    if not api_key:
        print("Error: GEMINI_API_KEY not provided.")
        return

    patterns_to_check, final_segment_key_str = prepare_regex_patterns(generated_keys, context_chars=context_chars_for_regex)
    client = _initialize_gemini_client(api_key)
    if not client:
        return

    model_name, contents_list, generation_config = _get_generation_config_and_contents(input_text)
    input_text_preview = input_text[:50]

    if not patterns_to_check:
        print("Warning: No segmentation patterns. Proceeding without segmentation.")
        _handle_no_segmentation(client, model_name, contents_list, generation_config, output_filename, input_text_preview)
        return

    print(f"Starting content generation for '{input_text_preview}...' to '{output_filename}' with segmentation.")
    total_generated_content = ""
    last_key_overall_start_index = -1

    try:
        with open(output_filename, "w", encoding="utf-8") as f_main:
            total_generated_content, last_key_overall_start_index = _process_stream_and_segments(
                client, model_name, contents_list, generation_config, f_main, patterns_to_check
            )
        _extract_and_save_final_slice(
            total_generated_content, last_key_overall_start_index, final_segment_key_str
        )
        print(f"All content saved to '{output_filename}'")
    except Exception as e:
        print(f"\nError during main generation process or file writing: {e}")
