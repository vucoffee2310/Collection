from typing import List, Tuple

def find_longest_approx_common_string_k_mismatches_reduced(
    s1: str, s2: str, min_matched_words: int = 3, max_mismatches: int = 3
) -> str:
    """
    Finds the longest contiguous segment in s1 that approximately matches a substring in s2,
    allowing up to max_mismatches, requiring min_matched_words.
    Priorities: Max matched words, Min mismatches, Min s1 segment length, Max s1 end index.
    """
    if min_matched_words < 1:
        raise ValueError("min_matched_words must be at least 1.")
    if max_mismatches < 0:
        raise ValueError("max_mismatches must be non-negative.")
    
    s1_words: List[str] = s1.split()
    s2_words: List[str] = s2.split()
    n, m = len(s1_words), len(s2_words)

    if not s1_words or not s2_words:
        return ""

    # dp[k][i][j] = (matched_words, s1_segment_length) using k mismatches, ending at s1_words[i-1], s2_words[j-1]
    dp: List[List[List[Tuple[int, int]]]] = \
        [[[(0, 0)] * (m + 1) for _ in range(n + 1)] for _ in range(max_mismatches + 1)]

    # (matched_words, -mismatches_used, -s1_segment_length, s1_end_idx_for_sort)
    # We negate some fields because max() is used, and we want to minimize them.
    # s1_end_idx is not negated as we want to maximize it as a tie-breaker.
    best_match_score: Tuple[int, int, int, int] = (0, -(max_mismatches + 1), 0, -1)
    best_s1_end_idx = -1
    best_s1_segment_len = 0


    for i in range(1, n + 1): # s1_idx
        for j in range(1, m + 1): # s2_idx
            for k in range(max_mismatches + 1): # mismatches_used
                options: List[Tuple[int, int]] = [] # (matched_words, segment_length_in_s1)

                # Option 1: Words match (extend previous match from dp[k][i-1][j-1])
                if s1_words[i - 1] == s2_words[j - 1]:
                    prev_matched, prev_len = dp[k][i - 1][j - 1]
                    options.append((prev_matched + 1, prev_len + 1))
                
                # Option 2: Mismatch (substitute, delete from s1, or insert into s1 relative to s2)
                # These operations consume one mismatch, so we look at dp[k-1]
                if k > 0:
                    # Substitution: s1_words[i-1] != s2_words[j-1] (costs 1 mismatch)
                    # Extends from dp[k-1][i-1][j-1]
                    # This effectively means we treat current words as a match despite them being different,
                    # using up a mismatch.
                    # The length of s1 segment increases by 1.
                    prev_matched_sub, prev_len_sub = dp[k - 1][i - 1][j - 1]
                    options.append((prev_matched_sub + 1, prev_len_sub + 1)) # +1 matched word (approx)

                    # Deletion from s1 (relative to s2): skip s1_words[i-1] (costs 1 mismatch)
                    # Extends from dp[k-1][i-1][j]. s1 segment length increases.
                    # No word is "matched" by this operation itself.
                    # prev_matched_del, prev_len_del = dp[k - 1][i - 1][j]
                    # options.append((prev_matched_del, prev_len_del + 1)) # No increase in matched_words here

                    # Insertion into s1 (relative to s2): skip s2_words[j-1] (costs 1 mismatch)
                    # Extends from dp[k-1][i][j-1]. s1 segment length does NOT increase from s1's perspective.
                    # No word is "matched" by this operation.
                    # prev_matched_ins, prev_len_ins = dp[k - 1][i][j - 1]
                    # options.append((prev_matched_ins, prev_len_ins))

                # If no options found (e.g., first char, or cannot extend), effectively reset.
                # The dp cell starts at (0,0), representing start of a new potential segment.
                # If options has valid continuations, pick the best.
                if options:
                    dp[k][i][j] = max(options, key=lambda x: (x[0], -x[1])) # Max matched_words, then min_length
                else:
                    # If words don't match and no mismatches left for substitution:
                    # this path cannot extend. dp[k][i][j] remains (0,0) - start new segment
                    pass


                # Update best match if current state is valid and better
                current_matched_words, current_s1_len = dp[k][i][j]
                if current_matched_words >= min_matched_words and current_s1_len > 0:
                    # Score: (matched_words, -mismatches_used, -s1_segment_length, s1_end_idx)
                    current_score = (current_matched_words, -k, -current_s1_len, i -1)
                    if current_score > best_match_score:
                        best_match_score = current_score
                        best_s1_end_idx = i - 1 # 0-indexed end
                        best_s1_segment_len = current_s1_len
    
    if best_s1_segment_len > 0:
        # best_match_score[0] would be final_matched_words
        # -best_match_score[1] would be final_mismatches
        start_idx = best_s1_end_idx - best_s1_segment_len + 1
        return " ".join(s1_words[start_idx : best_s1_end_idx + 1])
    return ""
