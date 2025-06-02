import re
import random
import string
from datetime import timedelta
import json
import logging
import sys # Added for logging stream

logger = logging.getLogger(__name__)

# --- Default Configuration (can be overridden by run_generation.py if needed) ---
DEFAULT_CONFIG = {
    "group_size": 5,
    "combine_size": 25,
    "random_key_length": 4,
    "marker_regex": r"^\s*\[[^\]]+\]\s*$",
    "output_json_file": "processed_input_structure.json", # Optional output
    "output_indent": 2
}

# --- Functions for parsing subtitle data ---
def parse_time_str(time_str: str) -> timedelta:
    parts = time_str.replace('.', ',').split(',')
    if len(parts) != 2:
        raise ValueError(f"Time string format error: expected 'H:M:S,ms', got '{time_str}'")
    h, m, s = map(int, parts[0].split(':'))
    ms = int(parts[1])
    return timedelta(hours=h, minutes=m, seconds=s, milliseconds=ms)

def format_timedelta_str(td_object: timedelta) -> str:
    total_seconds = int(td_object.total_seconds())
    milliseconds = td_object.microseconds // 1000
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def generate_delimiter() -> str:
    return f"({random.choice(string.ascii_letters)}{random.choice(string.ascii_letters)})"

def _process_subtitle_text(text_input: str, config: dict) -> list[dict]:
    results: list[dict] = []
    blocks = re.split(r'\n\s*\n', text_input.strip())
    marker_pattern = re.compile(config["marker_regex"])

    for block_idx, block in enumerate(blocks):
        lines = block.strip().split('\n')
        if len(lines) < 3:
            logger.debug(f"Skipping malformed block #{block_idx+1} (too few lines): '{lines[0] if lines else 'Empty block'}'")
            continue
        try:
            index = int(lines[0])
            time_line = lines[1]
            text_content = '\n'.join(lines[2:]).strip()

            if not text_content or marker_pattern.fullmatch(text_content):
                logger.debug(f"Skipping marker or empty text entry (index {index}): '{text_content}'")
                continue

            start_time_str, end_time_str = time_line.split(' --> ')
            start_td = parse_time_str(start_time_str)
            end_td = parse_time_str(end_time_str)
            duration_td = end_td - start_td
            
            if duration_td.total_seconds() < 0:
                logger.warning(f"Negative duration for index {index}. Start: {start_time_str}, End: {end_time_str}. Clamping to 0.")
                duration_td = timedelta(0)

            results.append({
                "index": index,
                "start": format_timedelta_str(start_td),
                "end": format_timedelta_str(end_td),
                "duration": format_timedelta_str(duration_td),
                "word_length": len(text_content.split()),
                "character_length": len(text_content),
                "text": text_content,
                "delimiter": generate_delimiter()
            })
        except (ValueError, IndexError, AttributeError) as e:
            logger.warning(f"Skipping malformed block (index {lines[0] if lines else 'N/A'}). Error: {e}")
    return results

def _merge_text_and_delimiter(data_list: list[dict], group_size: int) -> list[dict]:
    merged_results: list[dict] = []
    for i in range(0, len(data_list), group_size):
        current_group = data_list[i : i + group_size]
        if not current_group: continue
        
        merged_text_segment = " ".join(item['text'] for item in current_group)
        last_item_in_group = current_group[-1]
        merged_results.append({
            "full_string": f"{merged_text_segment} {last_item_in_group['delimiter']}",
            "last_original_text": last_item_in_group['text'],
            "last_original_delimiter": last_item_in_group['delimiter'],
            "group_word_lengths": [item['word_length'] for item in current_group]
        })
    logger.debug(f"Merged {len(data_list)} items into {len(merged_results)} segments (group_size={group_size}).")
    return merged_results

def _combine_merged_results(initial_merged_data: list[dict], combine_size: int) -> list[dict]:
    final_combined_results: list[dict] = []
    for i in range(0, len(initial_merged_data), combine_size):
        current_segment_dicts = initial_merged_data[i : i + combine_size]
        if not current_segment_dicts: continue

        combined_string = " ".join(d["full_string"] for d in current_segment_dicts)
        word_length_object_for_segment = {
            d["last_original_delimiter"]: d["group_word_lengths"]
            for d in current_segment_dicts
        }
        last_dict_in_segment = current_segment_dicts[-1]
        final_combined_results.append({
            "combined_string": combined_string,
            "last_text_for_next_prepend": last_dict_in_segment["last_original_text"],
            "last_delimiter_for_next_prepend": last_dict_in_segment["last_original_delimiter"],
            "word_length_object": word_length_object_for_segment
        })
    logger.debug(f"Combined {len(initial_merged_data)} merged segments into {len(final_combined_results)} final segments (combine_size={combine_size}).")
    return final_combined_results

def generate_random_key(length: int) -> str:
    return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(length))

def process_input_to_structured_data(
    raw_subtitle_text: str, 
    config_overrides: dict | None = None
) -> tuple[str, list[str], list[dict] | None]:
    """
    Processes raw subtitle text into a full string for translation, a list of generated keys,
    and optionally, the structured data that can be saved as JSON.

    Args:
        raw_subtitle_text: The raw subtitle text (e.g., SRT format).
        config_overrides: Dictionary to override default config values.

    Returns:
        A tuple: (full_text_for_translation, generated_keys, structured_data_for_json).
        structured_data_for_json will be None if no segments are processed.
    """
    current_config = DEFAULT_CONFIG.copy()
    if config_overrides:
        current_config.update(config_overrides)

    logger.info("Starting subtitle processing pipeline with input_manipulation.")
    
    parsed_data = _process_subtitle_text(raw_subtitle_text, current_config)
    logger.debug(f"Parsed {len(parsed_data)} subtitle entries (after filtering).")

    initial_merged_data = _merge_text_and_delimiter(parsed_data, current_config["group_size"])
    logger.debug(f"Merged into {len(initial_merged_data)} initial segments.")

    final_structured_output = _combine_merged_results(initial_merged_data, current_config["combine_size"])
    logger.debug(f"Combined into {len(final_structured_output)} final segments.")

    if not final_structured_output:
        logger.warning("No segments produced after parsing and combining. Returning empty results.")
        return "", [], None

    all_generated_keys: list[str] = []
    all_output_texts_for_gemini: list[str] = [] # These will be joined for the single Gemini input string
    
    # For constructing the optional JSON output
    segment_details_for_json_output: list[dict] = [] 
    total_words_sum = 0
    total_characters_sum = 0
    previous_text_for_prepend: str | None = None
    previous_delimiter_for_prepend: str | None = None
    total_segments_count = len(final_structured_output)

    for i, item in enumerate(final_structured_output):
        current_s = item["combined_string"]
        
        # This is the text for one "keyed" segment
        segment_text_parts = []
        if i > 0 and previous_text_for_prepend and previous_delimiter_for_prepend:
            segment_text_parts.extend([previous_text_for_prepend, previous_delimiter_for_prepend])
        segment_text_parts.append(current_s)
        final_segment_text = " ".join(segment_text_parts)
        all_output_texts_for_gemini.append(final_segment_text) # Collect parts for the full string
        
        segment_word_count = len(final_segment_text.split())
        segment_char_count = len(final_segment_text)
        total_words_sum += segment_word_count
        total_characters_sum += segment_char_count
        
        random_key = generate_random_key(current_config["random_key_length"])
        all_generated_keys.append(random_key)
        
        # Data for the optional JSON structure
        segment_data_for_json = {
            "text": final_segment_text, # This specific segment's text
            "word_length_object": item["word_length_object"],
            "segment_word_count": segment_word_count,
            "segment_char_count": segment_char_count,
            "total_segments": total_segments_count, # Global metadata
            "group_size_setting": current_config["group_size"],
            "combine_size_setting": current_config["combine_size"]
        }
        segment_details_for_json_output.append({"key": random_key, "data": segment_data_for_json})

        previous_text_for_prepend = item["last_text_for_next_prepend"]
        previous_delimiter_for_prepend = item["last_delimiter_for_next_prepend"]
        logger.debug(f"Segment {i} processed for input_manipulation. Key: {random_key}.")

    full_text_for_translation = " ".join(all_output_texts_for_gemini)
    
    # Construct the final JSON structure (optional output)
    final_json_list_for_file: list[dict] = []
    if all_generated_keys:
        final_json_list_for_file.append({"keys": all_generated_keys})
    
    for detail in segment_details_for_json_output:
        # Add global sums valid for the entire collection of segments
        detail["data"]["total_words_in_final_output"] = total_words_sum 
        detail["data"]["total_characters_in_final_output"] = total_characters_sum
        final_json_list_for_file.append({detail["key"]: detail["data"]})
    
    logger.info(f"Input manipulation complete. Generated {len(all_generated_keys)} keys.")
    logger.debug(f"Full text for translation preview: '{full_text_for_translation[:100]}...'")
    
    return full_text_for_translation, all_generated_keys, final_json_list_for_file


def save_structured_data_to_json(structured_data: list[dict], config: dict):
    """Saves the structured data list to a JSON file."""
    if not structured_data:
        logger.info("No structured data to save to JSON.")
        return
        
    output_file = config.get("output_json_file", DEFAULT_CONFIG["output_json_file"])
    indent = config.get("output_indent", DEFAULT_CONFIG["output_indent"])
    
    logger.info(f"Writing structured input data to {output_file}.")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(structured_data, f, indent=indent, ensure_ascii=False)
        logger.info(f"Structured input data successfully written to {output_file}.")
    except IOError as e:
        logger.error(f"Error writing structured input JSON to file {output_file}: {e}")
