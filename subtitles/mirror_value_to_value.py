import re
import logging

logger = logging.getLogger(__name__)

def extract_key_value_pairs(text_content: str) -> dict[str, str]:
    text_content = text_content.strip()
    delimiter_pattern = r'(\([a-zA-Z]{2}\))'
    matches_info = []
    for match in re.finditer(delimiter_pattern, text_content):
        matches_info.append({
            'key_with_paren': match.group(0),
            'start_index': match.start(),
            'end_index': match.end()
        })

    extracted_data = {}
    current_value_start_index = 0
    for match_data in matches_info:
        key = match_data['key_with_paren']
        key_start_pos = match_data['start_index']
        value = text_content[current_value_start_index:key_start_pos].strip()
        extracted_data[key] = value
        current_value_start_index = match_data['end_index']
    
    logger.debug(f"Extracted {len(extracted_data)} key-value pairs.")
    return extracted_data

def map_corresponding_segments(text1_content: str, text2_content: str) -> list[str]:
    data1 = extract_key_value_pairs(text1_content)
    data2 = extract_key_value_pairs(text2_content)

    common_keys = set(data1.keys()).intersection(set(data2.keys()))
    output_lines = []

    logger.info(f"Found {len(common_keys)} common keys for mapping segments.")
    for key in data1: 
        if key in common_keys:
            value1 = data1[key].replace('"', '\\"')
            value2 = data2[key].replace('"', '\\"')
            output_lines.append(f'"{value1}":"{value2}"')
            logger.debug(f"Mapped segment for key {key}")
            
    return output_lines
