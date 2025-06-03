import os
import re
import io
import logging

# --- Configuration for KeyPair Processing ---
REQUIRED_NON_WHITESPACE_AROUND_KEYS = 150
OFFSET_CHARS_FOR_NEXT_P1_SEARCH = 250  # Constraint 1

# --- Core Helper Functions (Utility, no class needed) ---
def count_non_whitespace_threshold(text_source, start_idx, end_idx, threshold):
    """
    Checks if 'threshold' non-whitespace characters exist in text_source[start_idx:end_idx].
    Returns (True, count_at_stop_or_total)
    """
    count = 0
    effective_end_idx = min(end_idx, len(text_source))
    for i in range(start_idx, effective_end_idx):
        if not text_source[i].isspace():
            count += 1
        if count >= threshold:
            return True, count
    return False, count

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

class TargetPair:
    """
    Represents a pair of keys (p1, p2) to be found and manages its state.
    """
    def __init__(self, p1_key, p2_key, original_index, total_pairs_in_list):
        self.p1_key_text = p1_key
        self.p2_key_text = p2_key
        self.original_list_index = original_index

        self.p1_found_at_index = -1
        self.p2_conceptual_end_index = -1

        self.is_permanently_skipped = False
        self.is_fully_processed = False

        self.before_content_sufficient = False
        self.after_content_sufficient = False
        self.actual_before_nw_count = 0
        self.actual_after_nw_count = 0

        self.is_first_pair_in_definition = (original_index == 0)
        self.is_last_pair_with_empty_p2 = (
            original_index == total_pairs_in_list - 1 and not p2_key
        )

        self.requires_before_content_check = not self.is_first_pair_in_definition
        self.requires_after_content_check = not self.is_last_pair_with_empty_p2
        self.is_candidate_for_deferred_write = self.is_last_pair_with_empty_p2

    def __repr__(self):
        return (f"Pair(p1='{self.p1_key_text}', p2='{self.p2_key_text or '<END>'}', "
                f"idx={self.original_list_index}, p1_idx={self.p1_found_at_index}, "
                f"skipped={self.is_permanently_skipped}, processed={self.is_fully_processed})")

    def are_both_keys_found(self):
        return self.p1_found_at_index != -1 and self.p2_conceptual_end_index != -1

    def p1_end_index(self):
        if self.p1_found_at_index == -1: return -1
        return self.p1_found_at_index + len(self.p1_key_text)

    def p2_actual_content_end_index(self):
        if self.p2_conceptual_end_index == -1: return -1
        return self.p2_conceptual_end_index + len(self.p2_key_text or "")


class KeyPairProcessor:
    """
    Manages the state and logic for finding and processing target key pairs from text chunks.
    """
    def __init__(self, target_pair_definitions, output_directory):
        self.output_directory = output_directory
        os.makedirs(self.output_directory, exist_ok=True)

        num_total_pairs = len(target_pair_definitions)
        self.all_target_pairs = [
            TargetPair(p1, p2, idx, num_total_pairs)
            for idx, (p1, p2) in enumerate(target_pair_definitions)
        ]
        
        self.cumulative_text_buffer = io.StringIO()
        self.current_total_text_length = 0
        self.global_p1_search_start_offset = 0
        self.deferred_final_pair_object = None
        self.processed_files_count = 0


    def _extract_and_format_segments(self, pair_object, full_text_content):
        """Extracts text segments for a qualified pair."""
        segments = {
            'before': "", 'key1': pair_object.p1_key_text, 'between': "",
            'key2': pair_object.p2_key_text or "", 'after': ""
        }
        p1_start_idx = pair_object.p1_found_at_index
        p1_end_idx = pair_object.p1_end_index()
        p2_starts_idx = pair_object.p2_conceptual_end_index
        p2_content_ends_idx = pair_object.p2_actual_content_end_index()

        if pair_object.requires_before_content_check:
            segments['before'] = extract_n_non_whitespace(
                full_text_content[0:p1_start_idx],
                REQUIRED_NON_WHITESPACE_AROUND_KEYS, from_start=False
            )
        if pair_object.is_last_pair_with_empty_p2:
            segments['between'] = full_text_content[p1_end_idx:]
        else:
            segments['between'] = full_text_content[p1_end_idx : p2_starts_idx]
        if pair_object.requires_after_content_check:
            segments['after'] = extract_n_non_whitespace(
                full_text_content[p2_content_ends_idx:],
                REQUIRED_NON_WHITESPACE_AROUND_KEYS, from_start=True
            )
        return segments

    def _save_pair_data_to_file(self, segments_dict, p1_key, p2_key):
        """Saves the extracted segments to a file."""
        pair_filename_p2_part = p2_key if p2_key else "end"
        safe_p1 = re.sub(r'[^\w_.)( -]', '', p1_key)
        safe_p2_part = re.sub(r'[^\w_.)( -]', '', pair_filename_p2_part)
        individual_filename = f"qualified_pair_{safe_p1}_to_{safe_p2_part}.txt"
        full_output_path = os.path.join(self.output_directory, individual_filename)
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
            self.processed_files_count += 1
        except IOError as e:
            logging.error(f"Error writing file {full_output_path}: {e}")

    def process_chunk(self, chunk_text):
        """Processes a new chunk of text to find and qualify pairs."""
        if not chunk_text:
            return

        self.cumulative_text_buffer.write(chunk_text)
        self.current_total_text_length += len(chunk_text)
        full_text_so_far = self.cumulative_text_buffer.getvalue()

        logging.debug(f"--- Processing Chunk (New total length: {self.current_total_text_length}, "
                      f"Global P1 search from: {self.global_p1_search_start_offset}) ---")

        for current_pair in self.all_target_pairs:
            if current_pair.is_permanently_skipped or current_pair.is_fully_processed:
                continue

            # 1. Find P1 Key
            if current_pair.p1_found_at_index == -1:
                found_idx = full_text_so_far.find(current_pair.p1_key_text, self.global_p1_search_start_offset)
                if found_idx != -1:
                    current_pair.p1_found_at_index = found_idx
                    logging.info(f"  Found P1='{current_pair.p1_key_text}' for pair {current_pair.original_list_index} "
                                 f"at index {found_idx} (searched from {self.global_p1_search_start_offset}).")
                    for prev_pair_scan_idx in range(current_pair.original_list_index):
                        earlier_pair = self.all_target_pairs[prev_pair_scan_idx]
                        if earlier_pair.p1_found_at_index == -1 and not earlier_pair.is_permanently_skipped:
                            earlier_pair.is_permanently_skipped = True
                            logging.info(f"    INFO: Pair {earlier_pair.original_list_index} "
                                         f"('{earlier_pair.p1_key_text}') was not found before pair "
                                         f"{current_pair.original_list_index}. Permanently skipping.")

            # 2. Find P2 Key
            if current_pair.p1_found_at_index != -1 and current_pair.p2_conceptual_end_index == -1:
                search_p2_from = current_pair.p1_end_index()
                if current_pair.p2_key_text:
                    found_idx2 = full_text_so_far.find(current_pair.p2_key_text, search_p2_from)
                    if found_idx2 != -1:
                        current_pair.p2_conceptual_end_index = found_idx2
                        logging.info(f"  Found P2='{current_pair.p2_key_text}' for pair {current_pair.original_list_index} "
                                     f"at index {found_idx2}.")
                        content_between_start = search_p2_from
                        content_between_end = found_idx2
                        length_between = content_between_end - content_between_start
                        offset_in_between = max(0, length_between - OFFSET_CHARS_FOR_NEXT_P1_SEARCH)
                        self.global_p1_search_start_offset = content_between_start + offset_in_between
                        logging.info(f"    Updated global P1 search offset to: {self.global_p1_search_start_offset}.")
                else: # P2 is empty
                    current_pair.p2_conceptual_end_index = search_p2_from
                    logging.info(f"  P2 is empty for pair {current_pair.original_list_index}, conceptual end at {search_p2_from}.")
                    self.global_p1_search_start_offset = search_p2_from
                    logging.info(f"    Updated global P1 search offset to: {self.global_p1_search_start_offset}.")
            
            # 3. Check content conditions if keys found
            if current_pair.are_both_keys_found() and not current_pair.is_fully_processed:
                if current_pair.requires_before_content_check and not current_pair.before_content_sufficient:
                    is_sufficient, count = count_non_whitespace_threshold(
                        full_text_so_far, 0, current_pair.p1_found_at_index, REQUIRED_NON_WHITESPACE_AROUND_KEYS
                    )
                    current_pair.actual_before_nw_count = count
                    if is_sufficient: current_pair.before_content_sufficient = True
                
                after_content_starts_at = current_pair.p2_actual_content_end_index()
                if current_pair.requires_after_content_check and not current_pair.after_content_sufficient:
                    is_sufficient, count = count_non_whitespace_threshold(
                        full_text_so_far, after_content_starts_at, 
                        self.current_total_text_length, REQUIRED_NON_WHITESPACE_AROUND_KEYS
                    )
                    current_pair.actual_after_nw_count = count
                    if is_sufficient: current_pair.after_content_sufficient = True

                all_conditions_met = True
                if current_pair.requires_before_content_check and not current_pair.before_content_sufficient:
                    all_conditions_met = False
                if current_pair.requires_after_content_check and not current_pair.after_content_sufficient:
                    all_conditions_met = False
                
                log_before = current_pair.actual_before_nw_count if current_pair.requires_before_content_check else 'N/A'
                log_after = current_pair.actual_after_nw_count if current_pair.requires_after_content_check else 'N/A'
                logging.debug(f"  Pair {current_pair.original_list_index} ('{current_pair.p1_key_text}', '{current_pair.p2_key_text or '<END>'}'): "
                              f"Before OK? ({current_pair.before_content_sufficient if current_pair.requires_before_content_check else 'N/A'}), Cnt: {log_before}. "
                              f"After OK? ({current_pair.after_content_sufficient if current_pair.requires_after_content_check else 'N/A'}), Cnt: {log_after}.")

                if all_conditions_met:
                    current_pair.is_fully_processed = True
                    if current_pair.is_candidate_for_deferred_write:
                        logging.info(f"\n!!! DEFERRED: Pair {current_pair.original_list_index} qualified. File later. !!!")
                        self.deferred_final_pair_object = current_pair
                    else:
                        logging.info(f"\n!!! QUALIFIED PAIR: {current_pair.original_list_index}. Saving. !!!")
                        segments = self._extract_and_format_segments(current_pair, full_text_so_far)
                        self._save_pair_data_to_file(segments, current_pair.p1_key_text, current_pair.p2_key_text)

    def finalize_processing(self):
        """Called after all chunks are processed to handle deferred items and summarize."""
        final_complete_text = self.cumulative_text_buffer.getvalue()
        if self.deferred_final_pair_object:
            pair_to_save = self.deferred_final_pair_object
            if not pair_to_save.is_permanently_skipped: # Should be true if it was deferred
                logging.info(f"\n--- Processing DEFERRED final pair ('{pair_to_save.p1_key_text}', "
                             f"'{pair_to_save.p2_key_text or '<END>'}') after stream completion ---")
                segments = self._extract_and_format_segments(pair_to_save, final_complete_text)
                self._save_pair_data_to_file(segments, pair_to_save.p1_key_text, pair_to_save.p2_key_text)
            else:
                logging.warning(f"Deferred pair {pair_to_save} was marked as skipped. Not saving.")
        
        logging.info(f"\nFinal cumulative output length: {self.current_total_text_length} characters.")
        num_skipped = sum(1 for p in self.all_target_pairs if p.is_permanently_skipped)
        if num_skipped > 0:
            logging.info(f"Number of pairs permanently skipped: {num_skipped}")
        
        if self.processed_files_count > 0:
            logging.info(f"Total fully qualified pair files saved: {self.processed_files_count}")
        else:
            logging.info("No fully qualified target pairs were detected and saved.")
        
        self.cumulative_text_buffer.close()
