import re
import random
import string
from datetime import timedelta
import json
import logging

# --- Configuration ---
CONFIG = {
    "group_size": 5,
    "combine_size": 25,
    "random_key_length": 4,
    "log_level": "INFO", # Consider "DEBUG" for more verbose output during development
    "output_indent": 2,
    "output_file": "output.json",
    "marker_regex": r"^\s*\[[^\]]+\]\s*$"
}

# --- Logging Setup ---
def setup_logging(level: str):
    numeric_level = getattr(logging, level.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f"Invalid log level: {level}")
    logging.basicConfig(level=numeric_level, format='%(levelname)s: %(message)s', stream=sys.stdout)

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

def process_subtitle_text(text_input: str) -> list[dict]:
    results: list[dict] = []
    blocks = re.split(r'\n\s*\n', text_input.strip())
    marker_pattern = re.compile(CONFIG["marker_regex"])

    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3: # Need index, time, and at least one text line
            logging.debug(f"Skipping malformed block (too few lines): '{lines[0] if lines else 'Empty block'}'")
            continue
        try:
            index = int(lines[0])
            time_line = lines[1]
            text_content = '\n'.join(lines[2:]).strip()

            if not text_content or marker_pattern.fullmatch(text_content):
                logging.debug(f"Skipping marker or empty text entry (index {index}): '{text_content}'")
                continue

            start_time_str, end_time_str = time_line.split(' --> ')
            start_td = parse_time_str(start_time_str)
            end_td = parse_time_str(end_time_str)
            duration_td = end_td - start_td
            
            if duration_td.total_seconds() < 0:
                logging.warning(f"Negative duration for index {index}. Start: {start_time_str}, End: {end_time_str}. Clamping to 0.")
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
            logging.warning(f"Skipping malformed block (index {lines[0] if lines else 'N/A'}). Error: {e}")
    return results

# --- Functions for merging and combining ---
def merge_text_and_delimiter(data_list: list[dict], group_size: int) -> list[dict]:
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
    logging.debug(f"Merged {len(data_list)} items into {len(merged_results)} segments (group_size={group_size}).")
    return merged_results

def combine_merged_results(initial_merged_data: list[dict], combine_size: int) -> list[dict]:
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
    logging.debug(f"Combined {len(initial_merged_data)} merged segments into {len(final_combined_results)} final segments (combine_size={combine_size}).")
    return final_combined_results

def generate_random_key(length: int) -> str:
    return ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(length))

# --- Main execution flow ---
def process_input_to_json(text_input: str) -> str:
    """Processes raw subtitle text and returns a JSON string."""
    logging.info("Starting subtitle processing pipeline.")
    
    parsed_data = process_subtitle_text(text_input)
    logging.debug(f"Parsed {len(parsed_data)} subtitle entries (after filtering).")
    if logging.getLogger().isEnabledFor(logging.DEBUG) and parsed_data:
        logging.debug(f"Sample parsed_data[0]: {parsed_data[0]}")

    initial_merged_data = merge_text_and_delimiter(parsed_data, CONFIG["group_size"])
    logging.debug(f"Merged into {len(initial_merged_data)} initial segments.")
    if logging.getLogger().isEnabledFor(logging.DEBUG) and initial_merged_data:
        logging.debug(f"Sample initial_merged_data[0]: {initial_merged_data[0]}")

    final_structured_output = combine_merged_results(initial_merged_data, CONFIG["combine_size"])
    logging.debug(f"Combined into {len(final_structured_output)} final segments.")
    if logging.getLogger().isEnabledFor(logging.DEBUG) and final_structured_output:
        logging.debug(f"Sample final_structured_output[0]: {final_structured_output[0]}")

    segment_details_for_json = [] # Stores {"key": ..., "data": ...} dicts
    all_generated_keys: list[str] = []
    total_words_sum = 0
    total_characters_sum = 0
    previous_text_for_prepend: str | None = None
    previous_delimiter_for_prepend: str | None = None
    total_segments_count = len(final_structured_output)

    for i, item in enumerate(final_structured_output):
        current_s = item["combined_string"]
        
        output_text_parts = []
        if i > 0 and previous_text_for_prepend and previous_delimiter_for_prepend:
            output_text_parts.extend([previous_text_for_prepend, previous_delimiter_for_prepend])
            logging.debug(f"Prepending segment {i} with previous context.")
        output_text_parts.append(current_s)
        output_text = " ".join(output_text_parts)
        
        segment_word_count = len(output_text.split())
        segment_char_count = len(output_text)
        total_words_sum += segment_word_count
        total_characters_sum += segment_char_count
        
        random_key = generate_random_key(CONFIG["random_key_length"])
        all_generated_keys.append(random_key)
        
        segment_data = {
            "text": output_text,
            "word_length_object": item["word_length_object"],
            "segment_word_count": segment_word_count,
            "segment_char_count": segment_char_count,
            "total_segments": total_segments_count,
            "group_size_setting": CONFIG["group_size"],
            "combine_size_setting": CONFIG["combine_size"]
        }
        segment_details_for_json.append({"key": random_key, "data": segment_data})

        previous_text_for_prepend = item["last_text_for_next_prepend"]
        previous_delimiter_for_prepend = item["last_delimiter_for_next_prepend"]
        logging.debug(f"Segment {i} processed. Key: {random_key}.")

    final_json_list: list[dict] = []
    if all_generated_keys:
        final_json_list.append({"keys": all_generated_keys})
    elif final_structured_output:
        logging.warning("Segments processed, but no keys generated. 'keys' object not added.")
    else:
        logging.info("No segments processed, 'keys' object not added.")

    for detail in segment_details_for_json:
        detail["data"]["total_words_in_final_output"] = total_words_sum
        detail["data"]["total_characters_in_final_output"] = total_characters_sum
        final_json_list.append({detail["key"]: detail["data"]})
    
    return json.dumps(final_json_list, indent=CONFIG["output_indent"], ensure_ascii=False)

def main():
    setup_logging(CONFIG["log_level"])
    
    # In a real application, load this from a file or argument
    # For example:
    # with open("your_subtitles.srt", "r", encoding="utf-8") as f:
    #     text_input = f.read()
    text_input = """
1
00:00:01,000 --> 00:00:03,000
This is the first subtitle.

2
00:00:03,500 --> 00:00:05,500
And this is the second one.
[Marker]

3
00:00:06,000 --> 00:00:08,000
A third line for testing.
    """
    if not text_input.strip():
        logging.error("Input text is empty. Aborting.")
        return

    json_output_string = process_input_to_json(text_input)

    logging.info(f"Processing complete. Writing JSON output to {CONFIG['output_file']}.")
    try:
        with open(CONFIG["output_file"], 'w', encoding='utf-8') as f:
            f.write(json_output_string)
        logging.info(f"JSON output successfully written to {CONFIG['output_file']}.")
    except IOError as e:
        logging.error(f"Error writing JSON to file {CONFIG['output_file']}: {e}")

if __name__ == "__main__":
    main()
