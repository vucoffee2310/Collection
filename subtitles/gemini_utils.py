import os
from google import genai
from google.genai import types
import sys
import re
import logging
from subtitles.regex_patterns import prepare_regex_patterns
from subtitles.similarity import find_longest_approx_common_string_k_mismatches_reduced

logger = logging.getLogger(__name__)

# --- Constants ---
DEFAULT_CONTEXT_CHARS = 150
MODEL_NAME = "gemini-2.5-flash-preview-05-20"
MAX_OUTPUT_TOKENS = 65000
TEMPERATURE = 1.5
TOP_P = 0.5
SYSTEM_INSTRUCTION_TEXT = "Translate to Vietnamese. Keep `(` and `)`. Output as JSON."

# --- Private Helper Functions ---
def _initialize_gemini_client(api_key):
    try:
        client = genai.Client(api_key=api_key)
        logger.info("Google GenAI Client initialized successfully.")
        return client
    except Exception as e:
        logger.error(f"Error initializing Google GenAI Client: {e.args}", exc_info=True)
        return None

def _get_generation_config_and_contents(input_text):
    contents_list = [types.Content(role="user", parts=[types.Part.from_text(text=input_text)])]
    generation_config = types.GenerateContentConfig(
        temperature=TEMPERATURE,
        top_p=TOP_P,
        candidate_count=1,
        max_output_tokens=MAX_OUTPUT_TOKENS,
        response_mime_type="text/plain",
        system_instruction=[types.Part.from_text(text=SYSTEM_INSTRUCTION_TEXT)],
    )
    logger.debug("Generation config and contents prepared.")
    return MODEL_NAME, contents_list, generation_config

def _handle_no_segmentation(client, model_name, contents_list, generation_config, output_filename, input_text_preview):
    logger.info(f"Starting content generation for '{input_text_preview}...' to '{output_filename}' (no segmentation).")
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            stream = client.models.generate_content_stream(
                model=model_name, contents=contents_list, config=generation_config
            )
            chunk_count = 0
            for chunk_idx, chunk in enumerate(stream):
                if chunk.text:
                    f.write(chunk.text)
                    f.flush()
                    chunk_count += 1
                    if chunk_idx % 50 == 0: # Log progress every 50 chunks
                         logger.debug(f"Received chunk {chunk_count} (no segmentation)...")
        logger.info(f"Content generation complete (no segmentation). Total chunks: {chunk_count}. Saved to '{output_filename}'")
    except Exception as e:
        logger.error(f"Error during generation or file writing (no segmentation): {e}", exc_info=True)

def _save_matched_segment_to_file(captured_content, segment_filename, print_message, content_description, compiled_pattern):
    try:
        with open(segment_filename, "w", encoding="utf-8") as seg_f:
            seg_f.write(captured_content)
        logger.info(f"--- Pattern Matched & Saved! ---")
        logger.info(print_message)
        logger.info(f"{content_description} saved to '{segment_filename}'")
        logger.debug(f"Captured content preview: '{captured_content[:150]}...'")
        logger.debug(f"Regex pattern: {compiled_pattern.pattern}")
    except IOError as io_err:
        logger.error(f"Error saving segment to file {segment_filename}: {io_err}", exc_info=True)

def _process_stream_and_segments(client, model_name, contents_list, generation_config, output_file_handle, patterns_to_check):
    total_generated_content = ""
    found_patterns_reported = set()
    last_key_overall_start_index = -1
    chunk_count = 0

    logger.info("Generating content with segmentation (streaming)...")
    stream = client.models.generate_content_stream(
        model=model_name, contents=contents_list, config=generation_config
    )

    for chunk_idx, chunk in enumerate(stream):
        if not chunk.text:
            continue
        
        output_file_handle.write(chunk.text)
        output_file_handle.flush()
        total_generated_content += chunk.text
        chunk_count += 1
        if chunk_idx % 50 == 0: # Log progress every 50 chunks
            logger.debug(f"Received chunk {chunk_count} (with segmentation)...")


        for pattern_info in patterns_to_check:
            compiled_pattern = pattern_info["compiled_pattern"]
            pattern_identifier = compiled_pattern.pattern

            if pattern_identifier in found_patterns_reported:
                continue

            match = compiled_pattern.search(total_generated_content)
            if not match:
                continue

            logger.info(f"Regex pattern matched: '{pattern_info['pattern_name']}'")
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
                        logger.info(f"Trimmed '{pattern_name}' (before overlap). Overlap: '{overlap_match[:50]}...'. New G{content_group_idx} preview: '{current_segment_content[:50]}...'")
            elif pattern_name == "general_pair":
                g1_content = match.group(pattern_info["comparison_groups"]["first_compare"]["s1_group"])
                g3_content = match.group(content_group_idx)
                g5_content = match.group(pattern_info["comparison_groups"]["second_compare"]["s1_group"])
                
                s1_compare_1 = g1_content
                s2_compare_1 = g3_content[:pattern_info["comparison_groups"]["first_compare"]["s2_end_len"]]
                overlap1 = find_longest_approx_common_string_k_mismatches_reduced(s1_compare_1, s2_compare_1)
                if overlap1:
                    start_idx_in_g3 = g3_content.find(overlap1)
                    if start_idx_in_g3 != -1:
                        g3_content = g3_content[start_idx_in_g3:]
                        logger.info(f"Trimmed '{pattern_name}' (after overlap1). Overlap1: '{overlap1[:50]}...'. New G{content_group_idx} preview: '{g3_content[:50]}...'")
                
                s1_compare_2 = g5_content
                s2_compare_2 = g3_content[pattern_info["comparison_groups"]["second_compare"]["s2_start_len"]:]
                overlap2 = find_longest_approx_common_string_k_mismatches_reduced(s1_compare_2, s2_compare_2)
                if overlap2:
                    end_idx_in_g3 = g3_content.rfind(overlap2)
                    if end_idx_in_g3 != -1:
                        g3_content = g3_content[:end_idx_in_g3]
                        logger.info(f"Trimmed '{pattern_name}' (before overlap2). Overlap2: '{overlap2[:50]}...'. New G{content_group_idx} preview: '{g3_content[:50]}...'")
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
                        logger.info(f"Trimmed '{pattern_name}' (after overlap). Overlap: '{overlap_match[:50]}...'. New G{content_group_idx} preview: '{current_segment_content[:50]}...'")
            else: 
                current_segment_content = match.group(0) 
                processed_content_description = "Entire matched segment (fallback, no specific processing)"
                logger.warning(f"Pattern '{pattern_name}' used fallback to save entire match group 0.")

            filename_suffix = ""
            log_message = ""
            if len(pattern_info["keys_involved"]) == 2:
                key1, key2 = pattern_info["keys_involved"]
                filename_suffix = f"{key1}_to_{key2}.txt"
                log_message = f"Keys '{key1}' and '{key2}' found with '{pattern_info['pattern_name']}'."
            else:
                single_key = pattern_info["keys_involved"][0]
                filename_suffix = f"{single_key}.txt"
                log_message = f"Key '{single_key}' found with '{pattern_info['pattern_name']}'."
                if pattern_info["is_final_extraction_pattern"]:
                    last_key_overall_start_index = match.start(pattern_info["key_group_idx"])
            
            segment_filename = f"matched_segment_{filename_suffix}"
            _save_matched_segment_to_file(
                current_segment_content, segment_filename, log_message,
                processed_content_description, compiled_pattern
            )
            found_patterns_reported.add(pattern_identifier)

    logger.info(f"Content generation stream complete. Total chunks received: {chunk_count}")
    return total_generated_content, last_key_overall_start_index

def _extract_and_save_final_slice(total_generated_content, last_key_start_idx, final_key_str):
    if last_key_start_idx == -1 or not final_key_str:
        if final_key_str : # only log if a key was expected but not found for slice
             logger.debug("Final slice not extracted: last_key_start_idx not set or final_key_str missing.")
        return
    
    final_segment_content = total_generated_content[last_key_start_idx:]
    final_slice_filename = f"final_segment_slice_from_{final_key_str}_to_absolute_end.txt"
    try:
        with open(final_slice_filename, "w", encoding="utf-8") as final_f:
            final_f.write(final_segment_content)
        logger.info(f"--- Final Segment Slice Extraction ---")
        logger.info(f"Segment from key '{final_key_str}' to end saved to '{final_slice_filename}'")
        logger.debug(f"Final slice preview: '{final_segment_content[:200]}...' (length: {len(final_segment_content)})")
    except IOError as io_err:
        logger.error(f"Error saving final segment slice to {final_slice_filename}: {io_err}", exc_info=True)

# --- Main Public Function ---
def generate_and_save(input_text, output_filename, api_key, generated_keys, context_chars_for_regex=DEFAULT_CONTEXT_CHARS):
    if not api_key:
        logger.error("GEMINI_API_KEY not provided for generate_and_save.")
        return

    logger.info(f"Preparing to generate content. Output: {output_filename}. Keys: {generated_keys}")
    patterns_to_check, final_segment_key_str = prepare_regex_patterns(generated_keys, context_chars=context_chars_for_regex)
    client = _initialize_gemini_client(api_key)
    if not client:
        return # Error already logged by _initialize_gemini_client

    model_name, contents_list, generation_config = _get_generation_config_and_contents(input_text)
    input_text_preview = input_text[:70].replace("\n", " ")


    if not patterns_to_check:
        logger.warning("No segmentation patterns formed. Proceeding without segmentation.")
        _handle_no_segmentation(client, model_name, contents_list, generation_config, output_filename, input_text_preview)
        return

    logger.info(f"Starting content generation for '{input_text_preview}...' to '{output_filename}' with segmentation.")
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
        logger.info(f"All content processing complete. Main output saved to '{output_filename}'")
    except Exception as e:
        logger.error(f"Error during main generation process or file writing: {e}", exc_info=True)
