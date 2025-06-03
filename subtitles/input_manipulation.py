import re
import random
import string
from datetime import timedelta
import logging
import sys
from typing import Tuple, List, Dict, Optional, Any # Explicit typing for clarity

# --- Logger Setup ---
# Configure logger for this module
logger = logging.getLogger(__name__)

# --- Default Configuration ---
# These settings control how the subtitle text is processed.
DEFAULT_CONFIG = {
    # How many individual subtitle lines are joined into a small group.
    "group_size": 5,
    # How many of these small groups are combined into a larger segment.
    "combine_size": 35,
    # Length of the random keys generated for each final text segment.
    "random_key_length": 4,
    # Regular expression to identify and filter out non-dialogue lines (e.g., [SOUND], [LAUGHTER]).
    "marker_regex": r"^\s*\[[^\]]+\]\s*$",
}

# --- Helper Functions ---

def _generate_random_string(length: int, character_set: str) -> str:
    """Generates a random string of a given length from a given character set."""
    return ''.join(random.choice(character_set) for _ in range(length))

def _generate_random_delimiter() -> str:
    """Generates a random 2-letter delimiter, e.g., (ab)."""
    letters = _generate_random_string(2, string.ascii_letters)
    return f"({letters})"

def _generate_random_alphanumeric_key(length: int) -> str:
    """Generates a random alphanumeric key."""
    return _generate_random_string(length, string.ascii_letters + string.digits)

def _parse_time_string_to_timedelta(time_str: str) -> timedelta:
    """
    Converts a subtitle time string (e.g., "00:00:20,123") to a timedelta object.
    Raises ValueError if the format is incorrect.
    """
    try:
        # Normalize millisecond separator
        parts = time_str.replace('.', ',').split(',')
        if len(parts) != 2:
            raise ValueError("Time string must have one comma for milliseconds.")

        time_part = parts[0]
        milliseconds_str = parts[1]

        h, m, s = map(int, time_part.split(':'))
        ms = int(milliseconds_str)
        return timedelta(hours=h, minutes=m, seconds=s, milliseconds=ms)
    except ValueError as e:
        # Re-raise with more context for easier debugging
        raise ValueError(f"Time string format error: expected 'H:M:S,ms', got '{time_str}'. Original error: {e}")

# --- Core Subtitle Processing Functions ---

def _extract_valid_dialogue_from_block(
    subtitle_block_lines: List[str],
    marker_pattern: re.Pattern
) -> Optional[str]:
    """
    Parses a single subtitle block (list of lines) and extracts dialogue text.
    Performs validation for structure, time, and filters markers.

    Args:
        subtitle_block_lines: Lines of a single subtitle block.
        marker_pattern: Compiled regex pattern for filtering markers.

    Returns:
        The dialogue text if valid, otherwise None.
    """
    if len(subtitle_block_lines) < 3:
        # A valid block needs at least index, timestamp, and text.
        logger.debug(f"Skipping malformed block (too few lines): '{subtitle_block_lines[0] if subtitle_block_lines else 'Empty block'}'")
        return None

    index_str = subtitle_block_lines[0]
    time_line_str = subtitle_block_lines[1]
    dialogue_text_lines = subtitle_block_lines[2:]
    dialogue_text = '\n'.join(dialogue_text_lines).strip()

    # Validate index (mostly for logging context)
    try:
        int(index_str) # We don't use the index value, just check if it's a number
    except ValueError:
        logger.warning(f"Skipping malformed block: cannot parse index '{index_str}'. Block content: '{' '.join(subtitle_block_lines)[:50]}...'")
        return None

    # Validate time and duration
    try:
        start_time_str, end_time_str = time_line_str.split(' --> ')
        start_td = _parse_time_string_to_timedelta(start_time_str)
        end_td = _parse_time_string_to_timedelta(end_time_str)
        if (end_td - start_td).total_seconds() < 0:
            logger.warning(f"Negative duration for index {index_str}. Start: {start_time_str}, End: {end_time_str}. Skipping.")
            return None
    except ValueError as e:
        logger.warning(f"Skipping malformed block (index '{index_str}'): Time parsing error: {e}. Time line: '{time_line_str}'")
        return None

    # Filter out empty text or markers
    if not dialogue_text or marker_pattern.fullmatch(dialogue_text):
        logger.debug(f"Skipping marker or empty text entry (index {index_str}): '{dialogue_text}'")
        return None

    return dialogue_text


def prepare_initial_subtitle_entries(
    raw_subtitle_content: str,
    config: Dict[str, Any]
) -> List[Dict[str, str]]:
    """
    Parses raw subtitle text, validates entries, and prepares a list of dialogue lines
    with associated delimiters.

    Args:
        raw_subtitle_content: The full SRT or similar subtitle text.
        config: The configuration dictionary.

    Returns:
        A list of dictionaries, e.g., [{"text": "Hello there", "delimiter": "(xy)"}, ...].
    """
    logger.info("Step 1: Preparing initial subtitle entries from raw text.")
    prepared_entries: List[Dict[str, str]] = []
    # Split by one or more blank lines (common in SRT)
    subtitle_blocks = re.split(r'\n\s*\n', raw_subtitle_content.strip())
    marker_pattern = re.compile(config["marker_regex"])

    for block_idx, block_text in enumerate(subtitle_blocks):
        if not block_text.strip(): # Skip if block is just whitespace
            continue
        block_lines = block_text.strip().split('\n')
        
        dialogue_text = _extract_valid_dialogue_from_block(block_lines, marker_pattern)
        
        if dialogue_text:
            entry = {
                "text": dialogue_text,
                "delimiter": _generate_random_delimiter()
            }
            prepared_entries.append(entry)
            # logger.debug(f"  Added entry: '{dialogue_text[:30]}...' with delimiter {entry['delimiter']}")
        # Removed redundant else for logging skipped blocks as _extract_valid_dialogue_from_block already logs it.
            
    logger.info(f"Step 1: Complete prepared {len(prepared_entries)} valid subtitle entries.")
    return prepared_entries


def merge_entries_into_groups(
    subtitle_entries: List[Dict[str, str]],
    group_size: int
) -> List[Dict[str, str]]:
    """
    Merges individual subtitle entries into small groups.
    Each group's text ends with the delimiter of its last original entry.
    It also stores the text and delimiter of that last original entry for later use.

    Args:
        subtitle_entries: List of {"text": ..., "delimiter": ...} dictionaries.
        group_size: Number of entries to merge into one group.

    Returns:
        A list of dictionaries, e.g.,
        [{"grouped_text_with_delimiter": "LineA LineB (db)",
          "last_original_text_in_group": "LineB",
          "last_original_delimiter_in_group": "(db)"}, ...]
    """
    logger.info(f"Step 2: Merging subtitle entries into groups of size {group_size}.")
    merged_groups: List[Dict[str, str]] = []
    for i in range(0, len(subtitle_entries), group_size):
        current_batch = subtitle_entries[i : i + group_size]
        if not current_batch:
            continue

        # Join texts of all entries in the batch
        texts_in_batch = [entry['text'] for entry in current_batch]
        combined_text_for_group = " ".join(texts_in_batch)

        # The delimiter for the whole group is the delimiter of its LAST original entry
        last_entry_in_batch = current_batch[-1]
        group_final_delimiter = last_entry_in_batch['delimiter']

        group_data = {
            "grouped_text_with_delimiter": f"{combined_text_for_group} {group_final_delimiter}",
            "last_original_text_in_group": last_entry_in_batch['text'],
            "last_original_delimiter_in_group": group_final_delimiter,
        }
        merged_groups.append(group_data)
        # logger.debug(f"  Created group: '{group_data['grouped_text_with_delimiter'][:50]}...'")

    logger.info(f"Step 2: Complete merged into {len(merged_groups)} groups.")
    return merged_groups


def combine_groups_into_larger_segments(
    merged_groups: List[Dict[str, str]],
    combine_size: int
) -> List[Dict[str, str]]:
    """
    Combines multiple small groups into larger text segments.
    Each large segment's text is a concatenation of the 'grouped_text_with_delimiter'
    from its constituent groups.
    It also stores the tail information (last original text and delimiter) from the
    very last group that makes up this large segment, to be used for prepending to the NEXT large segment.

    Args:
        merged_groups: List of dictionaries from `merge_entries_into_groups`.
        combine_size: Number of small groups to combine into one large segment.

    Returns:
        A list of dictionaries, e.g.,
        [{"main_segment_content": "groupA_payload groupB_payload",
          "text_for_next_segment_prepend": "text_from_last_original_line_of_groupB",
          "delimiter_for_next_segment_prepend": "delimiter_from_last_original_line_of_groupB"}, ...]
    """
    logger.info(f"Step 3: Combining groups into larger segments (combine size: {combine_size}).")
    larger_segments: List[Dict[str, str]] = []
    for i in range(0, len(merged_groups), combine_size):
        current_batch_of_groups = merged_groups[i : i + combine_size]
        if not current_batch_of_groups:
            continue

        # Concatenate the 'grouped_text_with_delimiter' from each group in this batch
        segment_main_parts = [group['grouped_text_with_delimiter'] for group in current_batch_of_groups]
        segment_main_content = " ".join(segment_main_parts)

        # The "tail" for prepending to the *next* segment comes from the *last group* in *this current batch*
        last_group_in_this_batch = current_batch_of_groups[-1]

        segment_data = {
            "main_segment_content": segment_main_content,
            "text_for_next_segment_prepend": last_group_in_this_batch['last_original_text_in_group'],
            "delimiter_for_next_segment_prepend": last_group_in_this_batch['last_original_delimiter_in_group'],
        }
        larger_segments.append(segment_data)
        # logger.debug(f"  Created larger segment: '{segment_data['main_segment_content'][:70]}...'")

    logger.info(f"Step 3: Complete combined into {len(larger_segments)} larger segments.")
    return larger_segments

# --- Main Public Function ---

def process_subtitle_to_structured_data(
    raw_subtitle_content: str,
    config_overrides: Optional[Dict[str, Any]] = None
) -> Optional[Tuple[List[Tuple[str, str]], List[Dict[str, str]]]]:
    """
    Processes raw subtitle text into a structured format: a list of key pairs
    and a list of text segments, where segments have overlap.

    Args:
        raw_subtitle_content: The raw subtitle text (e.g., SRT format).
        config_overrides: Dictionary to override default config values.

    Returns:
        A tuple: (key_pair_list, text_array_with_segments).
        - key_pair_list: List of (key1, key2) tuples for consecutive segments,
                         plus a final (last_key, '') pair.
        - text_array_with_segments: List of {key: text_segment} dictionaries.
        Returns None if no processable segments are generated.
    """
    current_config = DEFAULT_CONFIG.copy()
    if config_overrides:
        current_config.update(config_overrides)

    logger.info("Starting subtitle processing pipeline.")

    # Step 1: Parse raw text into individual, validated subtitle entries with delimiters
    initial_entries = prepare_initial_subtitle_entries(raw_subtitle_content, current_config)
    if not initial_entries:
        logger.warning("No valid subtitle entries found after initial parsing. Aborting.")
        return None

    # Step 2: Merge these entries into small groups
    grouped_entries = merge_entries_into_groups(initial_entries, current_config["group_size"])
    if not grouped_entries:
        logger.warning("No groups formed after merging entries. Aborting.")
        return None

    # Step 3: Combine small groups into larger segments (these are precursors to the final segments)
    combined_segments_precursors = combine_groups_into_larger_segments(grouped_entries, current_config["combine_size"])
    if not combined_segments_precursors:
        logger.warning("No larger segments formed after combining groups. Aborting.")
        return None

    # Step 4: Construct final text segments with prepending logic, assign keys
    logger.info("Step 4: Constructing final text segments with prepending and assigning keys.")
    all_segment_keys: List[str] = []
    text_array_with_segments: List[Dict[str, str]] = []

    # These will hold the tail of the *previous* segment to prepend to the *current* one
    text_to_prepend: Optional[str] = None
    delimiter_to_prepend: Optional[str] = None

    total_words_in_final_segments = 0
    total_chars_in_final_segments = 0

    for i, precursor_data in enumerate(combined_segments_precursors):
        current_segment_main_text = precursor_data["main_segment_content"]
        
        final_text_parts = []
        # Prepend if this is not the first segment and we have prepending info
        if i > 0 and text_to_prepend and delimiter_to_prepend:
            final_text_parts.append(text_to_prepend)
            final_text_parts.append(delimiter_to_prepend)
        
        final_text_parts.append(current_segment_main_text)
        final_segment_text = " ".join(final_text_parts)
        
        # Generate a unique key for this final segment
        random_key = _generate_random_alphanumeric_key(current_config["random_key_length"])
        
        all_segment_keys.append(random_key)
        text_array_with_segments.append({random_key: final_segment_text})

        # Store the tail of *this* segment to be used for prepending to the *next* segment
        text_to_prepend = precursor_data["text_for_next_segment_prepend"]
        delimiter_to_prepend = precursor_data["delimiter_for_next_segment_prepend"]
        
        # Logging for this final segment
        total_words_in_final_segments += len(final_segment_text.split())
        total_chars_in_final_segments += len(final_segment_text)
        # logger.debug(f"  Final Segment {i+1} (key: {random_key}): Length {len(final_segment_text)} chars. Content: '{final_segment_text[:70]}...'")

    # Step 5: Generate key pairs for consecutive segments AND add (last_key, '')
    logger.info(f"Step 5: Added final key pair.")
    key_pair_list: List[Tuple[str, str]] = []
    if len(all_segment_keys) > 1: # For pairs like (k1, k2), (k2, k3)
        for i in range(len(all_segment_keys) - 1):
            key_pair_list.append((all_segment_keys[i], all_segment_keys[i+1]))
    
    if all_segment_keys: # If there's at least one key, add (last_key, '')
        key_pair_list.append((all_segment_keys[-1], ''))
        # logger.debug(f"  Added final key pair: ({all_segment_keys[-1]}, '')")

    logger.info(f"  Total final segments: {len(all_segment_keys)}")
    logger.info(f"  Total words across all final segments: {total_words_in_final_segments}")
    logger.info(f"  Total characters across all final segments: {total_chars_in_final_segments}")
    logger.info(f"  Total key pairs: {len(key_pair_list)}") # This count will now include the (last_key, '') pair
    
    logger.info("Subtitle processing pipeline finished successfully.")
    return key_pair_list, text_array_with_segments

# --- Main execution example (for testing this script directly) ---
if __name__ == '__main__':
    # Configure logging for direct script execution
    logging.basicConfig(stream=sys.stdout, level=logging.DEBUG,
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    sample_srt_text_content = """TXT"""

    logger.info("\n--- Running example with custom test configuration ---")
    structured_result = process_subtitle_to_structured_data(
        sample_srt_text_content
    )

    if structured_result:
        generated_key_pairs, generated_text_array = structured_result
        print(generated_key_pairs, generated_text_array)
        
        # logger.info("\n--- Generated Key Pairs ---")
        # for pair_index, key_pair in enumerate(generated_key_pairs):
        #     logger.info(f"Pair {pair_index + 1}: {key_pair}")
        
        # logger.info("\n--- Generated Text Array (Segments) ---")
        # for entry_index, text_entry_dict in enumerate(generated_text_array):
        #     for key, text_segment in text_entry_dict.items(): # Should be only one key-value per dict
        #         logger.info(f"Segment {entry_index + 1} (Key: {key}):\n  '{text_segment}'")
    else:
        logger.info("No output was generated from the sample text.")
