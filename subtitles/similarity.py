from typing import List, Tuple

def find_longest_approx_common_string_k_mismatches_reduced(s1: str, s2: str, min_matched_words: int = 3, max_mismatches: int = 3) -> str:
    """
    Finds the longest contiguous segment in s1 that approximately matches a substring in s2,
    allowing up to max_mismatches mismatches, and requiring at least min_matched_words matched words.
    
    The "best" match is selected based on the following priorities:
    1. Maximize the number of matched words.
    2. Minimize the number of mismatches used.
    3. Minimize the length of the segment in s1 (preferring denser matches).
    4. Maximize the ending index in s1 (preferring matches that end later).
    
    Parameters:
    s1 (str): The first string, from which the contiguous segment is extracted.
    s2 (str): The second string, used for approximate matching.
    min_matched_words (int): The minimum number of words that must match. Must be at least 1. Default is 3.
    max_mismatches (int): The maximum number of allowed mismatches. Must be non-negative. Default is 3.
    
    Returns:
    str: The best matching contiguous substring from s1, or an empty string if no valid match is found.
    """
    # Input validation
    if min_matched_words < 1:
        raise ValueError("min_matched_words must be at least 1.")
    if max_mismatches < 0:
        raise ValueError("max_mismatches must be non-negative.")
    
    # Split strings into words (default split on whitespace)
    s1_words: List[str] = s1.split()
    s2_words: List[str] = s2.split()
    n, m = len(s1_words), len(s2_words)

    # Handle empty input cases
    if not s1_words or not s2_words:
        return ""

    # Initialize 3D DP table: dp[mismatches][s1_idx][s2_idx] = (matched_words, s1_segment_length)
    dp: List[List[List[Tuple[int, int]]]] = [
        [[(0, 0) for _ in range(m + 1)] for _ in range(n + 1)] for _ in range(max_mismatches + 1)
    ]

    # Store the best match info: (matched_words, mismatches_used, s1_end_idx, s1_segment_length)
    # Initialized to a tuple worse than any valid match
    best_match: Tuple[int, int, int, int] = (0, max_mismatches + 1, 0, 0)

    # Fill the DP table
    for s1_idx in range(1, n + 1):
        for s2_idx in range(1, m + 1):
            for mismatches_used in range(max_mismatches + 1):
                # List of possible states for the current cell: (matched_words, s1_segment_length)
                options: List[Tuple[int, int]] = [(0, 0)]  # Option to start a new segment here

                # Option 1: If words match, extend the previous match without using a mismatch
                if s1_words[s1_idx - 1] == s2_words[s2_idx - 1]:
                    prev_matched, prev_length = dp[mismatches_used][s1_idx - 1][s2_idx - 1]
                    options.append((prev_matched + 1, prev_length + 1))

                # Option 2: If mismatches_used > 0, consider mismatch operations
                if mismatches_used > 0:
                    # Substitution: Use a mismatch for the current words
                    sub_matched, sub_length = dp[mismatches_used - 1][s1_idx - 1][s2_idx - 1]
                    options.append((sub_matched, sub_length + 1))

                    # Deletion: Skip the current word in s1
                    del_matched, del_length = dp[mismatches_used - 1][s1_idx - 1][s2_idx]
                    options.append((del_matched, del_length + 1))

                    # Insertion: Skip the current word in s2
                    ins_matched, ins_length = dp[mismatches_used - 1][s1_idx][s2_idx - 1]
                    options.append((ins_matched, ins_length))

                # Choose the best option: maximize (matched_words, s1_segment_length)
                dp[mismatches_used][s1_idx][s2_idx] = max(options)

                # Update best match if current state is valid and better
                matched_words, segment_length = dp[mismatches_used][s1_idx][s2_idx]
                if matched_words >= min_matched_words and segment_length > 0:
                    current_score = (matched_words, -mismatches_used, -segment_length, s1_idx - 1)
                    best_matched, best_mismatches, best_end_idx, best_length = best_match
                    best_score = (best_matched, -best_mismatches, -best_length, best_end_idx)

                    if current_score > best_score:
                        best_match = (matched_words, mismatches_used, s1_idx - 1, segment_length)

    # Extract the best match details
    final_matched_words, final_mismatches, final_end_idx, final_segment_length = best_match

    # Reconstruct and return the matching segment from s1
    if final_matched_words >= min_matched_words and final_segment_length > 0:
        start_idx = final_end_idx - final_segment_length + 1
        return " ".join(s1_words[start_idx : final_end_idx + 1])
    return ""

# # Example usage
# if __name__ == "__main__":
#     s1 = "trước đây và bạn cũng đã thấy trong phần trước khi chúng ta kết nối với các máy chủ MCP từ xa. Nó về cơ bản là (vu)"
#     s2 = "các máy chủ MCP từ xa. Nó về cơ bản là (vu) chính xác cùng một thứ ngoại trừ bây giờ chúng ta chỉ thay đổi lệnh và đối số mà chúng ta đang cố gắng chạy để khởi động máy chủ."
#     result = find_longest_approx_common_string_k_mismatches_reduced(s1, s2, min_matched_words=3, max_mismatches=3)
#     print(f"String 1: {s1}")
#     print(f"String 2: {s2}")
#     print(f"Best match: '{result}'")
