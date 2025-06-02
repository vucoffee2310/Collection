import re
import logging

logger = logging.getLogger(__name__)

def prepare_regex_patterns(generated_keys: list[str], context_chars: int = 150):
    """
    Prepares a list of regex patterns and associated metadata.

    Args:
        generated_keys (list): A list of strings (keys) to look for.
        context_chars (int): Number of characters for context sniffing around keys.

    Returns:
        tuple: (patterns_to_check, final_segment_key_str)
               patterns_to_check (list): List of pattern dicts.
               final_segment_key_str (str or None): The last key.
    """
    if not generated_keys:
        logger.warning("No generated keys provided for regex pattern preparation.")
        return [], None

    patterns_to_check = []
    first_key_in_list_str = generated_keys[0]
    final_segment_key_str = generated_keys[-1]
    logger.debug(f"Preparing regex patterns for {len(generated_keys)} keys. Context chars: {context_chars}")

    for i, current_key_str in enumerate(generated_keys):
        escaped_current_key = re.escape(current_key_str)

        if i < len(generated_keys) - 1:  # Key forms a pair with the next one
            next_key_str = generated_keys[i+1]
            escaped_next_key = re.escape(next_key_str)
            if current_key_str == first_key_in_list_str:
                regex_pattern_str = f"({escaped_current_key})([\\s\\S]*?)({escaped_next_key})([\\s\\S]{{{context_chars}}})"
                patterns_to_check.append({
                    "pattern_name": "first_key_pair",
                    "keys_involved": (current_key_str, next_key_str),
                    "compiled_pattern": re.compile(regex_pattern_str, re.DOTALL),
                    "key_group_idx": 1,
                    "content_group_idx": 2,
                    "is_final_extraction_pattern": False,
                    "comparison_groups": {
                        "s1_start_len": context_chars,
                        "s2_to_compare": 4
                    }
                })
            else:
                regex_pattern_str = f"([\\s\\S]{{{context_chars}}})({escaped_current_key})([\\s\\S]*?)({escaped_next_key})([\\s\\S]{{{context_chars}}})"
                patterns_to_check.append({
                    "pattern_name": "general_pair",
                    "keys_involved": (current_key_str, next_key_str),
                    "compiled_pattern": re.compile(regex_pattern_str, re.DOTALL),
                    "key_group_idx": 2,
                    "content_group_idx": 3,
                    "is_final_extraction_pattern": False,
                    "comparison_groups": {
                        "first_compare": {
                            "s1_group": 1,
                            "s2_end_len": context_chars
                        },
                        "second_compare": {
                            "s1_group": 5,
                            "s2_start_len": -context_chars
                        }
                    }
                })
        elif i == len(generated_keys) - 1:  # Absolute last key
            regex_pattern_str = f"([\\s\\S]{{{context_chars}}})({escaped_current_key})([\\s\\S]*)"
            pattern_name_suffix = "with_prefix"
            pattern_name = f"{'single_last' if len(generated_keys) == 1 else 'last'}_key_segment_{pattern_name_suffix}"
            patterns_to_check.append({
                "pattern_name": pattern_name,
                "keys_involved": (current_key_str,),
                "compiled_pattern": re.compile(regex_pattern_str, re.DOTALL),
                "key_group_idx": 2,
                "content_group_idx": 3,
                "is_final_extraction_pattern": True,
                "comparison_groups": {
                    "s1_group": 1,
                    "s2_group": 3
                }
            })
    logger.info(f"Prepared {len(patterns_to_check)} regex patterns.")
    return patterns_to_check, final_segment_key_str
