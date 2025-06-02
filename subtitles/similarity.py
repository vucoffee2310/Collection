from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

def find_longest_approx_common_string_k_mismatches_reduced(
    s1: str, s2: str, min_matched_words: int = 3, max_mismatches: int = 3
) -> str:
    """
    Finds the longest contiguous segment in s1 that approximately matches a substring in s2.
    """
    if min_matched_words < 1:
        logger.error("min_matched_words must be at least 1.")
        raise ValueError("min_matched_words must be at least 1.")
    if max_mismatches < 0:
        logger.error("max_mismatches must be non-negative.")
        raise ValueError("max_mismatches must be non-negative.")
    
    s1_words: List[str] = s1.split()
    s2_words: List[str] = s2.split()
    n, m = len(s1_words), len(s2_words)

    if not s1_words or not s2_words:
        logger.debug("One or both input strings are empty after splitting into words.")
        return ""

    logger.debug(f"Finding longest approx common string: s1_words={n}, s2_words={m}, min_words={min_matched_words}, max_mismatch={max_mismatches}")

    dp: List[List[List[Tuple[int, int]]]] = \
        [[[(0, 0)] * (m + 1) for _ in range(n + 1)] for _ in range(max_mismatches + 1)]

    best_match_score: Tuple[int, int, int, int] = (0, -(max_mismatches + 1), 0, -1)
    best_s1_end_idx = -1
    best_s1_segment_len = 0

    for i in range(1, n + 1): 
        for j in range(1, m + 1): 
            for k in range(max_mismatches + 1): 
                options: List[Tuple[int, int]] = [] 

                if s1_words[i - 1] == s2_words[j - 1]:
                    prev_matched, prev_len = dp[k][i - 1][j - 1]
                    options.append((prev_matched + 1, prev_len + 1))
                
                if k > 0:
                    prev_matched_sub, prev_len_sub = dp[k - 1][i - 1][j - 1]
                    options.append((prev_matched_sub + 1, prev_len_sub + 1)) 

                if options:
                    dp[k][i][j] = max(options, key=lambda x: (x[0], -x[1]))
                
                current_matched_words, current_s1_len = dp[k][i][j]
                if current_matched_words >= min_matched_words and current_s1_len > 0:
                    current_score = (current_matched_words, -k, -current_s1_len, i -1)
                    if current_score > best_match_score:
                        best_match_score = current_score
                        best_s1_end_idx = i - 1 
                        best_s1_segment_len = current_s1_len
    
    if best_s1_segment_len > 0:
        start_idx = best_s1_end_idx - best_s1_segment_len + 1
        result = " ".join(s1_words[start_idx : best_s1_end_idx + 1])
        logger.debug(f"Best match found: '{result[:50]}...' (len: {best_s1_segment_len} words, score: {best_match_score})")
        return result
    
    logger.debug("No suitable approximate common string found.")
    return ""
