import re
import json

def parse_html_for_cleaning(html_string):
    """
    Parses HTML to identify tag content and attributes with their full string
    representation for precise removal. (Optimized Version)
    """
    # Regex patterns remain the same
    token_regex = r'(<[^>]+>)|([^<]+)'
    tag_content_regex = r'<\s*([a-zA-Z0-9]+)\s*([^>]*?)>'
    attr_regex = r'([a-zA-Z0-9_-]+)\s*=\s*"[^"]*"'

    # --- OPTIMIZATION 1: Efficient Line Number Calculation ---
    # Pre-calculate all newline positions
    line_starts = [m.start() for m in re.finditer(r'\n', html_string)]
    line_idx = 0
    
    parsed_data = []
    
    for match in re.finditer(token_regex, html_string):
        # Efficiently update the current line number as we parse sequentially
        while line_idx < len(line_starts) and match.start() > line_starts[line_idx]:
            line_idx += 1
        current_line_num = line_idx + 1

        tag_part, text_part = match.groups()

        if tag_part:
            tag_content_match = re.search(tag_content_regex, tag_part)
            if tag_content_match:
                attribute_string_area = tag_content_match.group(2)
                attributes_found = list(re.finditer(attr_regex, attribute_string_area))
                
                if attributes_found:
                    attr_obj = {'line_address': current_line_num, 'type': 'attr', 'attributes': []}
                    for attr_match in attributes_found:
                        full_attr_string = attr_match.group(0)
                        value_match = re.search(r'"([^"]*)"', full_attr_string)
                        value = value_match.group(1) if value_match else ""
                        clean_value = value.replace('&quot;', '"').replace('&amp;', '&')
                        attr_obj['attributes'].append({
                            'full_string': full_attr_string,
                            'value': clean_value
                        })
                    parsed_data.append(attr_obj)
        
        elif text_part:
            content = text_part.strip()
            if content:
                parsed_data.append({
                    'line_address': current_line_num,
                    'type': 'tag',
                    'content': content
                })

    return parsed_data

def clean_html_duplicates(html_content):
    """
    Cleans an HTML string by removing only the duplicate attributes from tags,
    not the entire tag line. Comparisons are case-insensitive. (Optimized Version)
    """
    parsed_data = parse_html_for_cleaning(html_content)
    removals = {} # {line_number: set(full_attribute_strings_to_remove)}

    def add_removal(line_num, attr_full_string):
        removals.setdefault(line_num, set()).add(attr_full_string)

    # --- OPTIMIZATION 2: Pre-process data into lookup maps ---
    # This avoids all major nested-loop comparisons.
    
    # 1. Create a map of all attribute values for fast lookups.
    # value_map: {'normalized_value': [list of attributes with that value]}
    value_map = {}
    # 2. Create a flat list of all text content for Rule 1.
    all_text_content = set()

    for i, item in enumerate(parsed_data):
        item['id'] = i # Assign a unique ID for easy reference
        if item['type'] == 'attr':
            for attr in item['attributes']:
                norm_value = attr['value'].strip().lower()
                if not norm_value: continue
                
                attr_info = {
                    'parent_item_id': i,
                    'line_address': item['line_address'],
                    'full_string': attr['full_string'],
                }
                value_map.setdefault(norm_value, []).append(attr_info)
        elif item['type'] == 'tag':
            all_text_content.add(item['content'].strip().lower())

    # 3. Pre-calculate the "succeeding tag" line for every item in one pass.
    last_seen_tag_line = -1
    for item in reversed(parsed_data):
        item['succeeding_tag_line'] = last_seen_tag_line
        if item['type'] == 'tag':
            last_seen_tag_line = item['line_address']

    # --- Rule 1: Compare Tag Content to Attribute Content (Optimized) ---
    print("--- Applying Rule 1: Tag vs. Attribute (case-insensitive) ---")
    for text_content in all_text_content:
        if text_content in value_map:
            # Instant lookup, no nested loop needed
            for attr_to_remove in value_map[text_content]:
                print(f"Match (Tag vs Attr): Text content '{text_content}' duplicates Attribute on line {attr_to_remove['line_address']}. Marking '{attr_to_remove['full_string']}' for removal.")
                add_removal(attr_to_remove['line_address'], attr_to_remove['full_string'])

    # --- Rule 2: Compare Attribute Content to other Attribute Content (Optimized) ---
    print("\n--- Applying Rule 2: Attribute vs. Attribute (case-insensitive) ---")
    for norm_value, duplicate_group in value_map.items():
        if len(duplicate_group) <= 1:
            continue

        # Filter out attributes already marked for removal by Rule 1
        active_duplicates = [
            attr for attr in duplicate_group 
            if attr['line_address'] not in removals or attr['full_string'] not in removals[attr['line_address']]
        ]
        
        if len(active_duplicates) <= 1:
            continue
        
        # Find the attribute to KEEP based on the distance logic
        attr_to_keep = None
        # First, check for items with a succeeding tag
        with_succeeding_tag = [d for d in active_duplicates if parsed_data[d['parent_item_id']]['succeeding_tag_line'] != -1]
        
        if with_succeeding_tag:
            # Keep the one with the minimum distance to its succeeding tag
            attr_to_keep = min(with_succeeding_tag, key=lambda d: parsed_data[d['parent_item_id']]['succeeding_tag_line'] - d['line_address'])
        else:
            # If no items have a succeeding tag, keep the one that appears latest in the file
            attr_to_keep = max(active_duplicates, key=lambda d: d['line_address'])

        # Mark all others in the group for removal
        for attr_to_remove in active_duplicates:
            if attr_to_remove is not attr_to_keep:
                print(f"Match (Attr vs Attr): Duplicate value '{norm_value}'. Removing '{attr_to_remove['full_string']}' from line {attr_to_remove['line_address']} to keep closer one.")
                add_removal(attr_to_remove['line_address'], attr_to_remove['full_string'])

    # --- Reconstruct the HTML (no changes needed here) ---
    print(f"\nFinal Removals Plan: {json.dumps({k: list(v) for k, v in removals.items()}, indent=2)}")
    
    html_lines = html_content.splitlines()
    final_lines = []
    for i, line in enumerate(html_lines):
        current_line_num = i + 1
        modified_line = line
        if current_line_num in removals:
            print(f"Modifying line {current_line_num}: {line.strip()}")
            for attr_string_to_remove in removals[current_line_num]:
                pattern = r'\s*' + re.escape(attr_string_to_remove)
                modified_line = re.sub(pattern, '', modified_line, count=1)
            print(f"  -> Result: {modified_line.strip()}")
        final_lines.append(modified_line)

    return "\n".join(final_lines)

# --- Example Usage ---
if __name__ == "__main__":
    html_snippet = """""" # Paste your HTML here
    
    cleaned_html = clean_html_duplicates(html_snippet)
    print("\n" + "="*50 + "\n")
    print("--- Final Cleaned HTML ---")
    print(cleaned_html)
    with open("final_output.txt", "w", encoding="utf-8") as f:
        f.write(cleaned_html)
