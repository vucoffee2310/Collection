import re
import json
import numpy as np
import copy # Used for deep copying list state for reversion logic
from typing import List, Dict, Optional, Any, Tuple, Callable
import random  # <--- Needed again
import string  # <--- Needed again

# --- Constants & Configuration ---
P90_THRESHOLD: float = 10.0
MAX_Q1Q3_ITERATIONS: int = 50 # Max iterations for the Q1/Q3 *loop*
DEFAULT_PRELIM_THRESHOLD: float = 10.0
MAX_ALLOWED_PRELIM_THRESHOLD: float = 20.0

# --- Helper Function: Compile Regex Patterns ---
# Pre-compile regex for efficiency
_LATIN_LIKE_PATTERN_STR: str = r"^[A-Za-z0-9\u00C0-\u00FF\u0100-\u017F\u0180-\u024F.:\-`]+$"
_INDIVIDUAL_JOINABLE_PATTERN: re.Pattern = re.compile(_LATIN_LIKE_PATTERN_STR)
# Pattern reused for classifying after removing internal spaces
_ONLY_ALLOWED_CHARS_PATTERN: re.Pattern = _INDIVIDUAL_JOINABLE_PATTERN

# --- Logging/Printing Helper ---
def print_separator(char: str = '-', length: int = 30) -> None:
    """Prints a separator line."""
    print(char * length)

def print_stage_header(title: str) -> None:
    """Prints a formatted stage header."""
    print_separator()
    print(f"\n--- {title} ---")

def print_stats_summary(stats_dict: Optional[Dict[str, Any]], title: str = "Statistics") -> None:
    """Prints a summary of the statistics dictionary."""
    if stats_dict:
        print(f"\n--- {title} (Summary) ---")
        # Use ensure_ascii=False if dealing with non-ASCII keys/values, indent for readability
        print(json.dumps(stats_dict, indent=2, ensure_ascii=False))
    else:
        print(f"\n--- {title}: Could not calculate statistics. ---")

# --- Initial Processing Steps ---
def _is_joinable(element: str) -> bool:
    """Checks if a single element matches the joinable pattern."""
    return bool(_INDIVIDUAL_JOINABLE_PATTERN.fullmatch(element))

def process_text_to_final_json_with_correct_len(text: str) -> List[Dict[str, Any]]:
    """Steps 1-4: Initial split, Join Latin (optimized), Classify/LEN, Mix Alternating."""
    # Step 1: Initial Split
    elements: List[str] = text.split()
    if not elements:
        return []

    # Step 2: Join consecutive LATIN (Optimized Single Pass)
    joined_elements: List[str] = []
    i = 0
    n = len(elements)
    while i < n:
        current_element = elements[i]
        if _is_joinable(current_element):
            j = i + 1
            # Find end of consecutive joinable sequence
            while j < n and _is_joinable(elements[j]):
                j += 1
            # If more than one joinable element found, join them
            if j > i + 1:
                joined_elements.append(" ".join(elements[i:j]))
                i = j # Move index past the joined sequence
            else:
                joined_elements.append(current_element)
                i += 1
        else:
            joined_elements.append(current_element)
            i += 1
    elements = joined_elements # Update elements list

    # Step 3: Classify and Calculate Corrected Initial LEN
    classified_elements: List[Dict[str, Any]] = []
    for element in elements:
        # Check content without spaces for LATIN classification
        content_without_internal_spaces = element.replace(" ", "")
        if content_without_internal_spaces and _ONLY_ALLOWED_CHARS_PATTERN.fullmatch(content_without_internal_spaces):
            element_type = "LATIN"
            # LEN for LATIN is word count (post-joining)
            element_len = len(element.split())
        else:
            element_type = "OTHER"
            # LEN for OTHER is character count
            element_len = len(element)
        classified_elements.append({"word": element, "type": element_type, "LEN": element_len})

    # Step 4: Group Alternating Sequences into MIX
    if not classified_elements:
        return []

    final_objects: List[Dict[str, Any]] = []
    i = 0
    n = len(classified_elements)
    while i < n:
        current_obj = classified_elements[i]
        # Check if a potential MIX sequence starts here (current != next type)
        is_potential_mix_start = False
        if i + 1 < n:
            next_obj = classified_elements[i+1]
            # Ensure both are classified (LATIN/OTHER) and types differ
            if current_obj["type"] != next_obj["type"] and \
               current_obj["type"] in {"LATIN", "OTHER"} and \
               next_obj["type"] in {"LATIN", "OTHER"}:
                 is_potential_mix_start = True

        if is_potential_mix_start:
            # Find the end of the alternating sequence
            sequence_end_index = i + 1
            while sequence_end_index + 1 < n:
                prev_in_sequence = classified_elements[sequence_end_index]
                next_in_sequence = classified_elements[sequence_end_index + 1]
                # Check if alternation continues
                if prev_in_sequence["type"] != next_in_sequence["type"] and \
                   prev_in_sequence["type"] in {"LATIN", "OTHER"} and \
                   next_in_sequence["type"] in {"LATIN", "OTHER"}:
                    sequence_end_index += 1
                else:
                    break # Alternating sequence ends

            # Extract elements, merge word, sum LEN
            elements_in_sequence = classified_elements[i : sequence_end_index + 1]
            merged_word = " ".join(elem["word"] for elem in elements_in_sequence)
            total_len = sum(elem["LEN"] for elem in elements_in_sequence)
            final_objects.append({"word": merged_word, "type": "MIX", "LEN": total_len})
            i = sequence_end_index + 1 # Move index past the processed MIX sequence
        else:
            # Not a start of a MIX sequence, add current object as is
            final_objects.append(current_obj)
            i += 1
    return final_objects

# --- Statistics Calculation ---
def calculate_len_stats(result_list: List[Dict[str, Any]]) -> Tuple[Optional[Dict[str, Any]], Optional[float], Optional[float], Optional[float], Optional[float], Optional[float]]:
    """
    Calculates descriptive statistics based on the 'LEN' attribute.
    Returns: tuple(stats_dict, p10, q1, median, q3, p90) or Nones if calculation fails.
    """
    len_values = [item['LEN'] for item in result_list if 'LEN' in item and item['LEN'] is not None]
    if not len_values:
        return None, None, None, None, None, None

    data = np.array(len_values, dtype=float) # Ensure float dtype for calculations
    if data.size == 0:
        return None, None, None, None, None, None

    try:
        p10, q1, median, q3, p90 = np.percentile(data, [10, 25, 50, 75, 90])
        iqr = q3 - q1
        # Calculate outlier bounds using float values
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        # Find outliers efficiently using boolean indexing
        outliers_arr = data[(data < lower_bound) | (data > upper_bound)]
        # Get unique sorted outliers
        outliers = sorted(list(np.unique(outliers_arr)))

        stats = {
            "Count": int(data.size),
            "Minimum": float(np.min(data)),
            "Maximum": float(np.max(data)),
            "Mean (Average)": float(np.mean(data)),
            "Median (Q2 / 50th Percentile)": float(median),
            "Interquartile Range (IQR = Q3 - Q1)": float(iqr),
            "P10 (10th Percentile)": float(p10),
            "Q1 (25th Percentile)": float(q1),
            "Q3 (75th Percentile)": float(q3),
            "P90 (90th Percentile)": float(p90),
            "Lower Outlier Bound (Q1 - 1.5*IQR)": float(lower_bound),
            "Upper Outlier Bound (Q3 + 1.5*IQR)": float(upper_bound),
            "Outliers": outliers # List of unique float outliers
        }
        return stats, p10, q1, median, q3, p90
    except IndexError: # Handles percentile calculation error on very small arrays
        return None, None, None, None, None, None
    except Exception as e: # Catch other potential numpy errors
        print(f"Warning: Error during statistics calculation: {e}")
        return None, None, None, None, None, None


# --- Generic Iterative Merging Function ---
# Type hints for the strategy functions
CandidateSelector = Callable[[Dict[str, Any], int, Any], bool]
NeighborSelector = Callable[[Dict[str, Any], int, Any], bool]
TargetChooser = Callable[[int, List[Tuple[int, float]], List[Dict[str, Any]]], Optional[int]]
SortKey = Callable[[Tuple[int, float]], Any]

def _run_iterative_merge_strategy(
    objects_list: List[Dict[str, Any]],
    is_candidate: CandidateSelector,
    is_eligible_neighbor: NeighborSelector,
    choose_target: TargetChooser,
    get_sort_key: SortKey,
    merge_params: Any,
    merge_step_name: str
) -> List[Dict[str, Any]]:
    """Generic function to iteratively merge elements based on provided strategies until stable."""
    if len(objects_list) < 2:
        return objects_list # Cannot merge if fewer than 2 elements

    current_objects = objects_list
    overall_merge_occurred = False # Track if any merge happened across all passes
    initial_object_count = len(objects_list)
    # Use a copy from the start if modification happens, managed internally
    modified_objects = None # Will hold the deep copy if needed

    while True: # Loop for passes until no merges occur in a pass
        made_merge_in_pass = False
        n = len(current_objects)
        if n < 2:
            break # Stop if list becomes too small

        # 1. Find candidates based on the strategy
        # List of (index, length) tuples for candidate elements
        candidates: List[Tuple[int, float]] = [
            (i, obj.get('LEN', 0.0)) for i, obj in enumerate(current_objects)
            if is_candidate(obj, i, merge_params)
        ]

        if not candidates:
            break # No candidates found in this pass, stable state reached

        # 2. Sort candidates (e.g., by length, by index) based on strategy
        candidates.sort(key=get_sort_key)

        # 3. Determine merges for this pass
        # Stores {candidate_idx: target_idx}
        merge_instructions: Dict[int, int] = {}
        # Keep track of indices already involved in a merge in this pass
        merged_indices_in_pass: set[int] = set()

        for i, _ in candidates:
            if i in merged_indices_in_pass:
                continue # Skip if already merged (either as candidate or target)

            # Find eligible neighbors (previous and next)
            eligible_neighbors: List[Tuple[int, float]] = [] # List of (neighbor_idx, neighbor_len)
            prev_idx = i - 1
            next_idx = i + 1

            # Check previous neighbor
            if prev_idx >= 0 and prev_idx not in merged_indices_in_pass:
                prev_neighbor = current_objects[prev_idx]
                if is_eligible_neighbor(prev_neighbor, prev_idx, merge_params):
                    eligible_neighbors.append((prev_idx, prev_neighbor.get('LEN', 0.0)))

            # Check next neighbor
            if next_idx < n and next_idx not in merged_indices_in_pass:
                next_neighbor = current_objects[next_idx]
                if is_eligible_neighbor(next_neighbor, next_idx, merge_params):
                    eligible_neighbors.append((next_idx, next_neighbor.get('LEN', 0.0)))

            # Ask the strategy function to choose the target neighbor
            target_idx = choose_target(i, eligible_neighbors, current_objects)

            # If a valid target is chosen, record the merge instruction
            if target_idx is not None and target_idx not in merged_indices_in_pass:
                merge_instructions[i] = target_idx
                # Mark both candidate and target as involved in this pass
                merged_indices_in_pass.add(i)
                merged_indices_in_pass.add(target_idx)
                made_merge_in_pass = True

        # 4. If no merges decided in this pass, break the outer loop
        if not made_merge_in_pass:
            break

        # 5. Apply merges to create the list for the next pass
        # Make a deep copy only on the very first merge across all passes
        if not overall_merge_occurred:
            modified_objects = copy.deepcopy(objects_list)
            current_objects = modified_objects # Work with the copy from now on
            overall_merge_occurred = True
        # Else: We are already working with the 'modified_objects' from previous pass

        # Group candidates by their target for efficient merging
        target_absorbs: Dict[int, List[int]] = {} # {target_idx: [candidate_idx1, candidate_idx2,...]}
        for candidate_idx, target_idx in merge_instructions.items():
            target_absorbs.setdefault(target_idx, []).append(candidate_idx)

        next_pass_objects: List[Dict[str, Any]] = []
        # Use a set to track indices processed in this *rebuilding step*
        processed_indices_for_next_pass: set[int] = set()

        for i in range(n): # Iterate through original indices of the current list
            if i in processed_indices_for_next_pass:
                continue # Skip if already processed (as part of a merge)

            if i in target_absorbs:
                # This index 'i' is a target, merge it with its candidates
                candidate_indices_to_absorb = target_absorbs[i]
                # Ensure correct merge order by sorting indices
                involved_indices = sorted([i] + candidate_indices_to_absorb)

                ordered_words = [current_objects[idx]['word'] for idx in involved_indices]
                merged_word = " ".join(ordered_words)
                merged_len = sum(current_objects[idx]['LEN'] for idx in involved_indices)

                next_pass_objects.append({"word": merged_word, "type": 'MIX', "LEN": merged_len})
                # Mark all involved indices as processed for this rebuilding step
                processed_indices_for_next_pass.update(involved_indices)

            elif i in merge_instructions:
                 # This index 'i' was a candidate merged into *another* target
                 # It's already handled when its target was processed. Mark it processed.
                 processed_indices_for_next_pass.add(i)
                 # Sanity check: it should also be in merged_indices_in_pass
                 assert i in merged_indices_in_pass

            else:
                # This index 'i' was not involved in any merge in this pass
                next_pass_objects.append(current_objects[i])
                processed_indices_for_next_pass.add(i)

        # Update the list for the next iteration of the outer `while True` loop
        current_objects = next_pass_objects
        # End of single pass

    # After the loop finishes (stable state or list too small)
    if overall_merge_occurred:
        print(f"--- {merge_step_name} Finished ({initial_object_count} -> {len(current_objects)} objects) ---")
        return current_objects # Return the modified list
    else:
        # print(f"--- No merges occurred during {merge_step_name} ---") # Optional: Log no merges
        return objects_list # Return the original list if no merges ever happened


# --- Merge Strategy Definitions ---
# Strategy functions define HOW merges happen for different stages

# 1. Preliminary Merge Strategy
def is_candidate_prelim(obj: Dict[str, Any], idx: int, threshold: float) -> bool:
    """Preliminary Candidate: index > 0 and LEN <= threshold."""
    # Use float('inf') as default LEN if missing/None to avoid merging
    return idx > 0 and obj.get('LEN', float('inf')) <= threshold

def is_eligible_neighbor_prelim(neighbor_obj: Dict[str, Any], neighbor_idx: int, threshold: float) -> bool:
    """Preliminary Neighbor: Any neighbor is eligible (target logic handles direction)."""
    return True # Eligibility is simple; target choice enforces preceding neighbor

def choose_target_prelim(candidate_idx: int, eligible_neighbors: List[Tuple[int, float]], current_objects: List[Dict[str, Any]]) -> Optional[int]:
    """Preliminary Target: Always choose the preceding neighbor (candidate_idx - 1)."""
    # The generic loop provides eligible neighbors. We just need to find the preceding one.
    preceding_idx = candidate_idx - 1
    for neighbor_idx, _ in eligible_neighbors:
        if neighbor_idx == preceding_idx:
            return preceding_idx
    return None # Should not happen if is_candidate checks idx > 0

def sort_key_prelim(candidate_tuple: Tuple[int, float]) -> Any:
    """Preliminary Sort: Process candidates in original index order."""
    return candidate_tuple[0] # Sort by index

# 2. Threshold-Based Merge Strategy (Q1/Q3, Median)
def is_candidate_threshold(obj: Dict[str, Any], idx: int, thresholds: Tuple[float, float]) -> bool:
    """Threshold Candidate: LEN <= lower threshold (Q1 or Median)."""
    candidate_threshold = thresholds[0]
    return obj.get('LEN', float('inf')) <= candidate_threshold

def is_eligible_neighbor_threshold(neighbor_obj: Dict[str, Any], neighbor_idx: int, thresholds: Tuple[float, float]) -> bool:
    """Threshold Neighbor: LEN <= upper threshold (Q3 or Median)."""
    neighbor_threshold = thresholds[1]
    return neighbor_obj.get('LEN', float('inf')) <= neighbor_threshold

def choose_target_shortest_eligible(candidate_idx: int, eligible_neighbors: List[Tuple[int, float]], current_objects: List[Dict[str, Any]]) -> Optional[int]:
    """Threshold Target: Choose the neighbor with the *smallest* LEN."""
    if not eligible_neighbors:
        return None
    # Sort neighbors by LEN (second element of tuple), then by index (first element) as tie-breaker
    eligible_neighbors.sort(key=lambda x: (x[1], x[0]))
    return eligible_neighbors[0][0] # Return index of the shortest neighbor

def sort_key_len_then_index(candidate_tuple: Tuple[int, float]) -> Any:
    """Threshold Sort: Process candidates with smaller LEN first, use index as tie-breaker."""
    return (candidate_tuple[1], candidate_tuple[0]) # Sort by LEN, then index


# --- Stage Execution Functions ---

def run_preliminary_merge(objects: List[Dict[str, Any]], p10: Optional[float], q1: Optional[float]) -> List[Dict[str, Any]]:
    """
    Runs the preliminary merge stage using a dynamically calculated threshold.
    Threshold Logic:
    - Select P10 or Q1, whichever is closer to 10.
    - The selected value must be <= MAX_ALLOWED_PRELIM_THRESHOLD (20).
    - If selection fails or value > 20, use DEFAULT_PRELIM_THRESHOLD (10).
    Merges elements (LEN <= threshold) into their preceding element.
    """
    print_stage_header("Preliminary Merge Stage")

    merge_threshold: float = DEFAULT_PRELIM_THRESHOLD
    reason: str = f"Default value ({DEFAULT_PRELIM_THRESHOLD})"
    potential_threshold: Optional[float] = None
    selected_stat_name: str = "N/A"
    reason_detail: str = "Initial default"

    # Determine potential threshold based on P10/Q1 proximity to 10
    if p10 is not None and q1 is not None:
        diff_p10 = abs(p10 - 10)
        diff_q1 = abs(q1 - 10)
        if diff_p10 <= diff_q1:
            potential_threshold = p10
            selected_stat_name = "P10"
            reason_detail = f"{selected_stat_name} ({potential_threshold:.2f}) is closest to 10"
        else:
            potential_threshold = q1
            selected_stat_name = "Q1"
            reason_detail = f"{selected_stat_name} ({potential_threshold:.2f}) is closest to 10"
    elif p10 is not None:
        potential_threshold = p10
        selected_stat_name = "P10"
        reason_detail = f"Only P10 ({potential_threshold:.2f}) is available"
    elif q1 is not None:
        potential_threshold = q1
        selected_stat_name = "Q1"
        reason_detail = f"Only Q1 ({potential_threshold:.2f}) is available"
    else:
        reason_detail = "Neither P10 nor Q1 available"

    # Apply MAX_ALLOWED constraint and set final threshold
    if potential_threshold is not None:
        if potential_threshold <= MAX_ALLOWED_PRELIM_THRESHOLD:
            merge_threshold = potential_threshold
            reason = f"Using {selected_stat_name} ({merge_threshold:.2f}): {reason_detail} and <= {MAX_ALLOWED_PRELIM_THRESHOLD}."
        else:
            merge_threshold = DEFAULT_PRELIM_THRESHOLD
            reason = f"Using Default ({DEFAULT_PRELIM_THRESHOLD}): {reason_detail}, but value ({potential_threshold:.2f}) > {MAX_ALLOWED_PRELIM_THRESHOLD}."
    else:
         merge_threshold = DEFAULT_PRELIM_THRESHOLD
         reason = f"Using Default ({DEFAULT_PRELIM_THRESHOLD}): {reason_detail}."

    # Execute the merge strategy
    if len(objects) >= 2:
        print(f"Determined Preliminary Merge threshold = {merge_threshold:.2f}.")
        print(f"Reason: {reason}")
        return _run_iterative_merge_strategy(
            objects_list=objects,
            is_candidate=is_candidate_prelim,
            is_eligible_neighbor=is_eligible_neighbor_prelim,
            choose_target=choose_target_prelim,
            get_sort_key=sort_key_prelim,
            merge_params=merge_threshold, # Pass the calculated threshold
            merge_step_name="Preliminary Merge"
        )
    else:
         print("Skipping Preliminary Merge: Less than 2 elements.")
         return objects

def run_q1q3_loop(objects: List[Dict[str, Any]], max_iterations: int) -> List[Dict[str, Any]]:
    """Runs the iterative Q1/Q3 merge loop with P90 threshold check."""
    print_stage_header("Q1/Q3 Merge Loop Stage")
    if len(objects) < 2:
        print("Skipping Q1/Q3 loop: Less than 2 elements.")
        return objects

    current_objects = objects
    # Keep a copy of the state *before* the merge attempt in each iteration for potential reversion
    last_valid_objects = copy.deepcopy(current_objects)
    final_reason = "Max iterations reached or initial state"

    for iteration in range(1, max_iterations + 1):
        print(f"\n=== Q1/Q3 Control Iteration {iteration} ===")
        stats, _, q1, _, q3, p90 = calculate_len_stats(current_objects)

        # Check if stats calculation failed
        if stats is None or q1 is None or q3 is None or p90 is None:
            print("Stopping Q1/Q3 loop: Cannot calculate statistics.")
            final_reason = f"Stats calculation failed during Iteration {iteration}"
            current_objects = last_valid_objects # Revert to last known good state
            break

        stats_log = f"Stats before merge attempt (Iter {iteration}): Count={stats['Count']}, P90={p90:.2f}, Q1={q1:.2f}, Q3={q3:.2f}"
        print(stats_log)

        # Check P90 threshold condition
        if p90 > P90_THRESHOLD:
            print(f"Stopping Q1/Q3 loop (Iter {iteration}): P90 ({p90:.2f}) > {P90_THRESHOLD}. Reverting.")
            final_reason = f"P90 > {P90_THRESHOLD} during Iteration {iteration}"
            current_objects = last_valid_objects # Revert merge attempt
            break

        # Check if list became too small (should be caught earlier, but safety check)
        if len(current_objects) < 2:
             print(f"Stopping Q1/Q3 loop (Iter {iteration}): Less than 2 elements remaining.")
             final_reason = "Less than 2 elements remaining"
             # No need to revert, current state is the final state before stopping
             break

        # Store state before attempting merge in this iteration
        last_valid_objects = copy.deepcopy(current_objects)
        prev_count = len(current_objects)
        q1q3_params = (q1, q3) # Parameters for the threshold strategy

        # Attempt merge using Q1/Q3 strategy
        merged_objects = _run_iterative_merge_strategy(
            objects_list=current_objects, # Pass current state
            is_candidate=is_candidate_threshold,
            is_eligible_neighbor=is_eligible_neighbor_threshold,
            choose_target=choose_target_shortest_eligible,
            get_sort_key=sort_key_len_then_index,
            merge_params=q1q3_params, # Pass (Q1, Q3)
            merge_step_name=f"Q1/Q3 Merge (Iter {iteration})"
        )

        # Check if the merge resulted in any change
        if len(merged_objects) == prev_count:
            print(f"Stopping Q1/Q3 loop (Iter {iteration}): No change in object count. Stable state reached.")
            final_reason = f"Stable state reached during Iteration {iteration}"
            current_objects = merged_objects # Keep the stable state
            break
        else:
            # Merges occurred, update state for the next iteration
            current_objects = merged_objects

    print(f"\n=== Q1/Q3 Merging Loop Complete ({final_reason}) ===")
    return current_objects

def run_median_merge(objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Runs the final merge stage using the Median as the threshold."""
    print_stage_header("Final Median Merge Stage")
    if len(objects) < 2:
        print("Skipping Final Median Merge: Less than 2 elements.")
        return objects

    stats, _, _, median, _, _ = calculate_len_stats(objects)

    if stats and median is not None:
        print(f"State before Median merge: Count={stats['Count']}, Median={median:.2f}")
        print(f"Running Final Median Merge with threshold = Median = {median:.2f}")
        median_params = (median, median) # Use median for both candidate and neighbor thresholds
        return _run_iterative_merge_strategy(
            objects_list=objects,
            is_candidate=is_candidate_threshold,
            is_eligible_neighbor=is_eligible_neighbor_threshold,
            choose_target=choose_target_shortest_eligible,
            get_sort_key=sort_key_len_then_index,
            merge_params=median_params, # Pass (Median, Median)
            merge_step_name="Final Median Merge"
        )
    else:
        print("Skipping Final Median Merge: Insufficient data, stats, or elements.")
        return objects

def run_outlier_postprocessing(objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Post-processing stage to merge outliers (LEN < P10) into their preceding element.
    Uses backward iteration for efficient in-place modification.
    """
    print_stage_header("Outlier Post-Processing Stage (Outliers < P10)")
    n = len(objects)
    if n < 2:
        print("Skipping post-processing merge: Less than 2 elements.")
        return objects

    stats, p10, _, _, _, _ = calculate_len_stats(objects)

    if not stats or p10 is None:
        print("Skipping post-processing merge: Insufficient stats (P10 needed).")
        return objects

    outliers = stats.get("Outliers", [])
    # Create a set for efficient lookup of outlier LEN values below P10
    outliers_below_p10_set = {o for o in outliers if o < p10}

    if not outliers_below_p10_set:
        print(f"No outliers found with LEN < P10 ({p10:.2f}). Skipping post-processing merge.")
        return objects

    print(f"Found {len(outliers_below_p10_set)} unique outlier LEN values < P10 ({p10:.2f}): {sorted(list(outliers_below_p10_set))}")
    print("Attempting to merge corresponding objects into their preceding element...")

    # Use a copy only if modifications are actually made
    modified_objects: Optional[List[Dict[str, Any]]] = None
    current_objects_ref = objects # Reference the original list initially
    num_outlier_merges = 0

    # Iterate BACKWARD through the list to allow safe in-place merging/deletion
    # We check element 'i' and potentially merge it into 'i-1'
    for i in range(n - 1, 0, -1): # Start from n-1 down to 1 (element 0 cannot be merged backward)
        current_obj = current_objects_ref[i]
        current_len = current_obj.get('LEN')

        # Check if current object is an outlier candidate to be merged backward
        if current_len is not None and current_len in outliers_below_p10_set:
            # First time merging? Create the deep copy to modify
            if modified_objects is None:
                modified_objects = copy.deepcopy(objects)
                current_objects_ref = modified_objects # Switch reference to the copy

            # Preceding element exists (since i > 0)
            prev_obj = current_objects_ref[i-1]

            # Perform the merge directly in the copied list
            merged_word = f"{prev_obj['word']} {current_obj['word']}"
            merged_len = prev_obj.get('LEN', 0) + current_obj.get('LEN', 0) # Safely handle potential missing LEN

            # Update the preceding element
            current_objects_ref[i-1]['word'] = merged_word
            current_objects_ref[i-1]['LEN'] = merged_len
            current_objects_ref[i-1]['type'] = 'MIX' # Merged result is always MIX

            # Delete the current element (which was merged into previous)
            del current_objects_ref[i]

            num_outlier_merges += 1
            # No need to adjust 'i' because we are iterating backward and deleted the current index

    if num_outlier_merges > 0 and modified_objects is not None:
        print(f"--- Post-Processing Merge Finished: Performed {num_outlier_merges} outlier merges ---")
        return modified_objects # Return the modified list
    else:
        print("No outlier merges were actually performed (e.g., conditions not met).")
        return objects # Return the original list if no merges happened


# --- Main Execution ---
if __name__ == "__main__":
    # Example with potential outliers and more than 26 segments needed
    input_string = """
    (Thai here)
"""

    # 1. Initial Processing
    print_stage_header("Initial Processing")
    initial_objects = process_text_to_final_json_with_correct_len(input_string)
    print(f"Initial object count: {len(initial_objects)}")
    # print("Initial objects:", json.dumps(initial_objects, indent=2, ensure_ascii=False)) # Optional debug

    # 2. Initial Statistics
    initial_stats, initial_p10, initial_q1, _, _, _ = calculate_len_stats(initial_objects)
    print_stats_summary(initial_stats, "Initial Statistics")
    if not initial_stats:
        print("Error: Could not calculate initial statistics. Exiting.")
        final_objects = [] # Set to empty list to prevent errors later
    else:
        # Proceed only if initial stats are valid
        # 3. Preliminary Merge
        objects_after_prelim = run_preliminary_merge(initial_objects, initial_p10, initial_q1)
        # 4. Q1/Q3 Loop
        objects_after_q1q3 = run_q1q3_loop(objects_after_prelim, MAX_Q1Q3_ITERATIONS)
        # 5. Median Merge
        objects_after_median = run_median_merge(objects_after_q1q3)
        # 6. Outlier Post-processing
        final_objects = run_outlier_postprocessing(objects_after_median)

    # --- Final Output ---
    print_stage_header("Final Result")

    # Final Stats Calculation
    final_stats, _, _, _, _, _ = calculate_len_stats(final_objects)
    print_stats_summary(final_stats, "Final Statistics")

    # --- Generate Random Letter Prefixes (A-J, No Adjacent Repeats) --- <--- MODIFIED SECTION
    num_segments = len(final_objects)
    segment_prefixes = []
    character_pool = string.ascii_uppercase[:10] # 'ABCDEFGHIJ'

    if num_segments > 0:
        # Assign the first prefix randomly
        last_prefix = random.choice(character_pool)
        segment_prefixes.append(last_prefix)

        # Assign subsequent prefixes, avoiding the last assigned one
        for _ in range(1, num_segments):
            # Create a pool of choices excluding the last prefix
            available_choices = [c for c in character_pool if c != last_prefix]
            # If the pool somehow became empty (shouldn't happen with pool size > 1)
            # fall back to the full pool - this is a safety measure.
            if not available_choices:
                print(f"Warning: No available choices left for prefix, reusing from full pool.") # Should not happen
                available_choices = character_pool

            # Choose the next prefix randomly from the available options
            current_prefix = random.choice(available_choices)
            segment_prefixes.append(current_prefix)
            # Update the last prefix for the next iteration
            last_prefix = current_prefix

    # --- Final Words Output ---
    print("\n--- Final Processed Sentences/Segments ---")
    print("{")
    if final_objects:
        # Iterate using the generated prefixes
        for i, obj in enumerate(final_objects):
            # Get the pre-generated prefix for this index
            prefix_char = segment_prefixes[i] if i < len(segment_prefixes) else '?' # Safety check
            word_str = str(obj.get('word', 'N/A'))
            # Print using the random A-J letter
            print(f"({prefix_char}) {word_str}")
    else:
        print("No final objects to display.")
    print("}")

    print_separator()