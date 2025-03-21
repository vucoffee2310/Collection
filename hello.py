import re

# Step 1: Normalize text into clause lengths
def clauses_normalize(text):
    """
    Convert input text into a list of clause lengths.
    - Latin clauses (containing any ASCII <= 255) are counted by words.
    - Non-Latin clauses are counted by characters.
    - Empty clauses (from multiple spaces) are assigned length 0.
    """
    final_clause_lengths = []
    original_clauses = text.split()  # Split based on whitespace

    for original_clause in original_clauses:
        if not original_clause:  # Handle empty clause from multiple spaces
            final_clause_lengths.append(0)
            continue

        latin_mode = False
        for char_original in original_clause:
            if ord(char_original) <= 255:  # Check for Latin characters
                latin_mode = True
                break

        if latin_mode:  # Latin clause: count words
            latin_words = original_clause.split()
            final_clause_lengths.append(len(latin_words))
        else:  # Non-Latin clause: count characters
            final_clause_lengths.append(len(original_clause))

    return final_clause_lengths

# Step 2: Split array based on threshold
def split_array(arr, threshold):
    """
    Split array into subarrays with sums less than threshold.
    Break at points with large differences between consecutive non-1 elements.
    """
    result_subarrays = []
    start = 0
    while start < len(arr):
        sum_current = 0
        end = start
        while end < len(arr) and sum_current + arr[end] < threshold:
            sum_current += arr[end]
            end += 1
        if end == start:  # Single element >= threshold
            result_subarrays.append([arr[start]])
            start += 1
        else:
            max_diff = -1
            break_index = -1
            for i in range(start, end - 1):
                if arr[i] != 1 and arr[i + 1] != 1:
                    diff = abs(arr[i] - arr[i + 1])
                    if diff > max_diff:
                        max_diff = diff
                        break_index = i
            if break_index == -1:
                result_subarrays.append(arr[start:end])
                start = end
            else:
                result_subarrays.append(arr[start:break_index + 1])
                start = break_index + 1
    return result_subarrays

# Step 3: Initial merging with cached sums
def initial_merge(subarrays, threshold):
    """Merge consecutive subarrays if their sum is <= threshold."""
    final_subarrays = []
    sums = [sum(sub) for sub in subarrays]
    i = 0
    while i < len(subarrays):
        current = subarrays[i]
        sum_current = sums[i]
        i += 1
        while i < len(subarrays) and sum_current + sums[i] <= threshold:
            current.extend(subarrays[i])
            sum_current += sums[i]
            i += 1
        final_subarrays.append(current)
    return final_subarrays

# Step 4: Find break points with dynamic factor
def find_break_points(subarray, factor):
    """
    Identify indices where consecutive elements differ significantly based on factor.
    Both elements must be != 1.
    """
    break_points = []
    for i in range(len(subarray) - 1):
        a, b = subarray[i], subarray[i + 1]
        if a != 1 and b != 1 and max(a, b) >= factor * min(a, b):
            break_points.append(i)
    return break_points

# Step 5: Adjust with previous subarray
def adjust_with_previous(subarrays, sums, factor):
    """Move a prefix from current to previous subarray to reduce sum difference."""
    adjusted = False
    i = 1
    while i < len(subarrays):
        curr_sum = sums[i]
        prev_sum = sums[i - 1]
        if curr_sum > prev_sum:
            break_points = find_break_points(subarrays[i], factor)
            if break_points:
                original_diff = abs(curr_sum - prev_sum)
                best_idx = None
                best_new_diff = original_diff
                best_prefix_sum = 0
                for idx in break_points:
                    prefix = subarrays[i][:idx + 1]
                    prefix_sum = sum(prefix)
                    new_prev_sum = prev_sum + prefix_sum
                    new_curr_sum = curr_sum - prefix_sum
                    new_diff = abs(new_prev_sum - new_curr_sum)
                    if new_diff < best_new_diff:
                        best_new_diff = new_diff
                        best_idx = idx
                        best_prefix_sum = prefix_sum
                if best_idx is not None and best_new_diff < original_diff:
                    prefix = subarrays[i][:best_idx + 1]
                    subarrays[i - 1].extend(prefix)
                    subarrays[i] = subarrays[i][best_idx + 1:]
                    sums[i - 1] += best_prefix_sum
                    sums[i] -= best_prefix_sum
                    adjusted = True
        i += 1
    return adjusted

# Step 6: Adjust with next subarray
def adjust_with_next(subarrays, sums, factor):
    """Move a prefix from current to next subarray to reduce sum difference."""
    adjusted = False
    i = 0
    while i < len(subarrays) - 1:
        curr_sum = sums[i]
        next_sum = sums[i + 1]
        if curr_sum > next_sum:
            break_points = find_break_points(subarrays[i], factor)
            if break_points:
                original_diff = abs(curr_sum - next_sum)
                best_j = None
                best_new_diff = original_diff
                best_prefix_sum = 0
                for j in break_points:
                    prefix = subarrays[i][:j + 1]
                    prefix_sum = sum(prefix)
                    new_curr_sum = curr_sum - prefix_sum
                    new_next_sum = next_sum + prefix_sum
                    new_diff = abs(new_curr_sum - new_next_sum)
                    if new_diff < best_new_diff:
                        best_new_diff = new_diff
                        best_j = j
                        best_prefix_sum = prefix_sum
                if best_j is not None and best_new_diff < original_diff:
                    prefix = subarrays[i][:best_j + 1]
                    subarrays[i + 1] = prefix + subarrays[i + 1]
                    subarrays[i] = subarrays[i][best_j + 1:]
                    sums[i] -= best_prefix_sum
                    sums[i + 1] += best_prefix_sum
                    adjusted = True
        i += 1
    return adjusted

# Step 7: Reduce subarrays by merging consecutive pairs
def reduce_subarrays(subarrays, sums, merge_threshold):
    """Merge consecutive subarrays if their sum is <= merge_threshold."""
    reduced = False
    i = 0
    while i < len(subarrays) - 1:
        if sums[i] + sums[i + 1] <= merge_threshold:
            subarrays[i].extend(subarrays[i + 1])
            sums[i] += sums[i + 1]
            del subarrays[i + 1]
            del sums[i + 1]
            reduced = True
        else:
            i += 1
    return subarrays, sums, reduced

# Step 8: Adjust small first elements
def adjust_small_first_elements(subarrays, sums):
    """Move small first elements to previous subarray to balance sums."""
    adjusted = False
    i = 1
    while i < len(subarrays):
        while len(subarrays[i]) >= 2:
            a = subarrays[i][0]
            b = subarrays[i][1]
            if a >= b:
                break
            if a <= b / 2 and 1 <= a <= 9:
                subarrays[i-1].append(a)
                subarrays[i].pop(0)
                sums[i-1] += a
                sums[i] -= a
                adjusted = True
            else:
                break
        i += 1
    return subarrays, sums, adjusted

# Step 9: Adjust by prepending elements from previous subarrays
def adjust_by_prepending(subarrays, sums, factor):
    """Move elements from previous subarray to current to reduce sum difference."""
    indexed_sums = sorted(enumerate(sums), key=lambda x: x[1])
    
    for current_idx, _ in indexed_sums:
        if current_idx == 0:
            continue
        
        prev_idx = current_idx - 1
        current_sum = sums[current_idx]
        prev_sum = sums[prev_idx]
        
        if prev_sum <= current_sum:
            continue
        
        original_diff = abs(prev_sum - current_sum)
        prev_subarray_reversed = subarrays[prev_idx][::-1]
        break_points = find_break_points(prev_subarray_reversed, factor)
        break_points = [len(subarrays[prev_idx]) - 1 - bp for bp in break_points]
        
        best_diff = original_diff
        best_break_point = None
        best_elements_to_move = []
        
        for bp in break_points:
            if bp + 1 < len(subarrays[prev_idx]):
                elements_to_move = subarrays[prev_idx][bp + 1:]
                new_prev_subarray = subarrays[prev_idx][:bp + 1]
                new_current_subarray = elements_to_move + subarrays[current_idx]
                new_prev_sum = sum(new_prev_subarray)
                new_current_sum = sum(new_current_subarray)
                new_diff = abs(new_prev_sum - new_current_sum)
                
                if new_diff < best_diff:
                    best_diff = new_diff
                    best_break_point = bp
                    best_elements_to_move = elements_to_move
        
        if best_break_point is not None and best_diff < original_diff:
            subarrays[prev_idx] = subarrays[prev_idx][:best_break_point + 1]
            subarrays[current_idx] = best_elements_to_move + subarrays[current_idx]
            sums[prev_idx] = sum(subarrays[prev_idx])
            sums[current_idx] = sum(subarrays[current_idx])
    
    return subarrays, sums

# Step 10: Postprocess - repeatedly adjust and reduce until stable
def postprocess(subarrays, sums, merge_threshold):
    """Repeatedly adjust small elements and merge subarrays until stable."""
    while True:
        subarrays, sums, adjusted = adjust_small_first_elements(subarrays, sums)
        subarrays, sums, reduced = reduce_subarrays(subarrays, sums, merge_threshold)
        if not adjusted and not reduced:
            break
    return subarrays, sums

# Helper function to process array (Steps 2-10)
def process_array(arr, threshold, factor, merge_threshold):
    """Process array through steps 2-10 to create balanced subarrays."""
    subarrays = split_array(arr, threshold)
    subarrays = initial_merge(subarrays, threshold)
    sums = [sum(sub) for sub in subarrays]
    
    while True:
        adjusted_prev = adjust_with_previous(subarrays, sums, factor)
        adjusted_next = adjust_with_next(subarrays, sums, factor)
        if not adjusted_prev and not adjusted_next:
            break
    
    subarrays, sums = adjust_by_prepending(subarrays, sums, factor)
    subarrays, sums = postprocess(subarrays, sums, merge_threshold)
    
    return subarrays, sums

# Find optimal threshold and factor
def find_best_threshold_and_factor(arr):
    """Test thresholds and factors to minimize variance in subarray sums."""
    best_threshold = None
    best_factor = None
    best_variance = float('inf')
    best_subarrays = None
    thresholds = range(100, 111)  # 100 to 110
    factors = [1.5, 1.6, 1.7]
    merge_threshold = (min(thresholds) + max(thresholds)) / 2  # 105
    for threshold in thresholds:
        for factor in factors:
            subarrays, sums = process_array(arr, threshold, factor, merge_threshold)
            mean_sum = sum(sums) / len(sums)
            variance = sum((s - mean_sum) ** 2 for s in sums) / len(sums)
            if variance < best_variance:
                best_variance = variance
                best_threshold = threshold
                best_factor = factor
                best_subarrays = subarrays[:]
    return best_threshold, best_factor, best_subarrays, best_variance

# Example usage
if __name__ == "__main__":
    text = '"hello world 測試 123"'
    arr = clauses_normalize(text)  # Step 1
    best_threshold, best_factor, best_subarrays, best_variance = find_best_threshold_and_factor(arr)
    print(f"\nBest threshold: {best_threshold}, Best factor: {best_factor:.1f}, Variance: {best_variance:.2f}")
    print("Final subarrays:")
    for i, sub in enumerate(best_subarrays):
        print(f"Subarray {i}: {sub} | Sum: {sum(sub)}")