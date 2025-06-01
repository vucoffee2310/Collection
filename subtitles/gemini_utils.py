import os
from google import genai
from google.genai import types
import sys
import re
from regex_patterns import prepare_regex_patterns # Assuming this file exists

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

                        captured_content = match.group(0) # Entire regex match
                        key_group_idx = pattern_info["key_group_idx"]
                        is_final_extraction_pattern = pattern_info["is_final_extraction_pattern"]

                        filename_suffix = ""
                        print_message = ""
                        if len(pattern_info["keys_involved"]) == 2:
                            key1_str, key2_str = pattern_info["keys_involved"]
                            filename_suffix = f"{key1_str}_to_{key2_str}.txt"
                            print_message = f"Keys '{key1_str}' and '{key2_str}' found with pattern '{pattern_info['pattern_name']}'."
                        else:
                            single_key_str = pattern_info["keys_involved"][0]
                            filename_suffix = f"{single_key_str}_to_absolute_end.txt"
                            print_message = f"Key '{single_key_str}' found with pattern '{pattern_info['pattern_name']}'."
                            if is_final_extraction_pattern:
                                last_key_overall_start_index = match.start(key_group_idx)
                        
                        segment_filename = f"matched_segment_{filename_suffix}"
                        _save_matched_segment_to_file(
                            captured_content, 
                            segment_filename, 
                            print_message, 
                            "Entire matched segment (full regex match)",
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
