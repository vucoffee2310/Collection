import re

def extract_key_value_pairs(text_content: str) -> dict[str, str]:
    """
    Extracts key-value pairs from a text string based on (xx) delimiters.
    Keys are (xx) and values are the preceding text.
    """
    text_content = text_content.strip()
    # Regex to find delimiters like (ab), (XY), etc.
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
    # Iterate through found delimiters to extract text between them (or from start to first delimiter)
    for match_data in matches_info:
        key = match_data['key_with_paren']
        key_start_pos = match_data['start_index']
        
        # Text from end of last delimiter (or start of string) to start of current delimiter
        value = text_content[current_value_start_index:key_start_pos].strip()
        extracted_data[key] = value
        
        current_value_start_index = match_data['end_index'] # Move pointer to end of current delimiter
    
    # Capture any text after the last delimiter if the string doesn't end with one (optional based on needs)
    # if current_value_start_index < len(text_content):
    #     # This case is ambiguous: what key would this trailing text have?
    #     # For now, only text preceding a delimiter is captured.
    #     pass
        
    return extracted_data

def map_corresponding_segments(text1_content: str, text2_content: str) -> list[str]:
    """
    Compares two texts, finds common (xx) delimiters, and maps their preceding values.
    Returns a list of strings, each formatted as "text1_value":"text2_value".
    """
    data1 = extract_key_value_pairs(text1_content)
    data2 = extract_key_value_pairs(text2_content)

    common_keys = set(data1.keys()).intersection(set(data2.keys()))
    output_lines = []

    # Iterate through keys of data1 to maintain its order for common keys
    for key in data1: # data1.keys() could also be used if order doesn't strictly matter from data1
        if key in common_keys:
            value1 = data1[key].replace('"', '\\"')
            value2 = data2[key].replace('"', '\\"')
            output_lines.append(f'"{value1}":"{value2}"')
            
    return output_lines

if __name__ == "__main__":
    # Example Usage:
    # Replace these with actual file reading or direct string inputs
    sample_text1 = """
    Segment A1 (aa) Segment B1 (bb) Segment C1 (cc)
    """
    sample_text2 = """
    Translated Segment A2 (aa) Unrelated (dd) Translated Segment B2 (bb)
    """

    # To read from files:
    # try:
    #     with open("file1.txt", "r", encoding="utf-8") as f1:
    #         sample_text1 = f1.read()
    #     with open("file2.txt", "r", encoding="utf-8") as f2:
    #         sample_text2 = f2.read()
    # except IOError as e:
    #     print(f"Error reading files: {e}")
    #     exit(1)

    if not sample_text1.strip() or not sample_text2.strip():
        print("One or both input texts are empty.")
    else:
        mapped_lines = map_corresponding_segments(sample_text1, sample_text2)
        if mapped_lines:
            print("\nCommon segments mapped (text1_value:text2_value):")
            for line in mapped_lines:
                print(line)
        else:
            print("No common segments found or no common delimiters.")
