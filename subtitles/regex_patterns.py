import re

def prepare_regex_patterns(generated_keys):
    """
    Prepares a list of regex patterns and associated metadata based on the generated_keys.

    Args:
        generated_keys (list): A list of strings (keys) to look for.

    Returns:
        tuple: (patterns_to_check, final_segment_key_str)
               patterns_to_check (list): A list of dictionaries, each containing:
                   "pattern_name": str
                   "keys_involved": tuple
                   "compiled_pattern": re.Pattern
                   "key_group_idx": int (index of the group capturing the primary key for overall start index tracking)
                   "content_group_idx": int (NEW: index of the group containing the main content to be processed by similarity)
                   "is_final_extraction_pattern": bool
                   "comparison_groups": dict (NEW: metadata for similarity processing logic)
               final_segment_key_str (str or None): The last key in generated_keys,
                                                    used for the final full extraction.
    """
    if not generated_keys:
        return [], None

    patterns_to_check = []
    first_key_in_list_str = generated_keys[0]
    final_segment_key_str = generated_keys[-1]

    for i in range(len(generated_keys)):
        current_key_str = generated_keys[i]
        escaped_current_key = re.escape(current_key_str)

        if i < len(generated_keys) - 1:  # It's a key that forms a pair with the next one
            next_key_str = generated_keys[i+1]
            escaped_next_key = re.escape(next_key_str)
            if current_key_str == first_key_in_list_str:
                # Specific pattern for the very first key of the list when it's part of a pair
                # Groups: (1=key1)(2=content_between_keys)(3=key2)(4=150_chars_after_key2)
                regex_pattern_str = f"({escaped_current_key})([\\s\\S]*?)({escaped_next_key})([\\s\\S]{{150}})"
                patterns_to_check.append({
                    "pattern_name": "first_key_pair",
                    "keys_involved": (current_key_str, next_key_str),
                    "compiled_pattern": re.compile(regex_pattern_str, re.DOTALL),
                    "key_group_idx": 1,  # key1 is group 1
                    "content_group_idx": 2, # Content to be processed is group 2
                    "is_final_extraction_pattern": False,
                    "comparison_groups": {
                        "s1_start_len": 150, # 'first 150 characters of group 2' (s1 in similarity)
                        "s2_to_compare": 4   # 'entire group 4' (s2 in similarity)
                    }
                })
            else:
                # General pair pattern (not the first key in the overall list)
                # Groups: (1=150_chars_before_key1)(2=key1)(3=content_between_keys)(4=key2)(5=150_chars_after_key2)
                regex_pattern_str = f"([\\s\\S]{{150}})({escaped_current_key})([\\s\\S]*?)({escaped_next_key})([\\s\\S]{{150}})"
                patterns_to_check.append({
                    "pattern_name": "general_pair",
                    "keys_involved": (current_key_str, next_key_str),
                    "compiled_pattern": re.compile(regex_pattern_str, re.DOTALL),
                    "key_group_idx": 2,  # key1 is group 2
                    "content_group_idx": 3, # Content to be processed is group 3
                    "is_final_extraction_pattern": False,
                    "comparison_groups": {
                        "first_compare": {
                            "s1_group": 1,      # 'entire group 1' (s1 in similarity)
                            "s2_end_len": 150   # 'first 150 characters group 3' (s2 in similarity)
                        },
                        "second_compare": {
                            "s1_group": 5,      # 'group 5' (s1 in similarity)
                            "s2_start_len": -150 # 'last 150 characters of group 3' (s2 in similarity)
                        }
                    }
                })
        elif i == len(generated_keys) - 1:  # It's the absolute last key in the list
            # Groups: (1=150_chars_before_last_key)(2=last_key)(3=content_after_last_key)
            regex_pattern_str = f"([\\s\\S]{{150}})({escaped_current_key})([\\s\\S]*)"
            pattern_name_suffix = "with_prefix"
            if len(generated_keys) == 1:
                 pattern_name = f"single_last_key_segment_{pattern_name_suffix}"
            else:
                 pattern_name = f"last_key_segment_{pattern_name_suffix}"

            patterns_to_check.append({
                "pattern_name": pattern_name,
                "keys_involved": (current_key_str,),
                "compiled_pattern": re.compile(regex_pattern_str, re.DOTALL),
                "key_group_idx": 2,  # last_key is group 2
                "content_group_idx": 3, # Content to be processed is group 3
                "is_final_extraction_pattern": True, # This pattern's key is used for post-stream full extraction
                "comparison_groups": {
                    "s1_group": 1,      # 'group 1' (s1 in similarity)
                    "s2_group": 3       # 'group 3' (s2 in similarity)
                }
            })

    return patterns_to_check, final_segment_key_str
