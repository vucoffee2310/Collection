import re

# --- Optimizations ---
# 1. Pre-compile regex patterns ONCE outside the function.
# This avoids expensive recompilation in the loop.
_UNWANTED_TAGS_RE = re.compile(r'<(script|style|svg|pre)[^>]*>.*?</\1>|<!--.*?-->', flags=re.DOTALL | re.IGNORECASE)

# 2. Use a set for O(1) average time lookups.
_ALLOWED_ATTRS = {'alt', 'placeholder', 'title', 'content'}

# 3. Pre-compile patterns for attribute value validation.
#    First, define the patterns as a list of raw strings.
_ATTR_VALUE_PATTERNS_STRINGS = [
            r'[^a-zA-Z]*',                           # Contains no alphabetic characters
            r'\d+(\.\d+)?[a-zA-Z]',                  # Looks like a measurement (e.g., "12px")
            r'(\s*(&?(nbsp;|amp;))\s*){2,}',         # Multiple consecutive space entities
            r'(@[\w.-]+|[\w\.-]+@[\w\.-]+\.\w+)',    # Social handle or Email address
            r'(https?://|/)\S+',                     # Absolute or relative URL
            r'^\w[\w-]*=[\w.-]+(,\s*\w[\w-]*=[\w.-]+)*$', # key=value pairs (e.g., "width=device-width, initial-scale=1")
            r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:[0-5]\d)?([+-]\d{2}:\d{2}|Z)?', # ISO 8601 Timestamp
            r'\d{1,2}:\d{2}\s+\d{2}/\d{2}/\d{4}',    # US-style timestamp
            r'\d{1,2}:\d{2}',                        # Simple time (e.g., "14:30")
            r'\S{16,}'                               # Long, likely random string/ID
        ]
#    FIX: Now, compile each string pattern into a regex object.
_ATTR_VALUE_PATTERNS_RE = [re.compile(p) for p in _ATTR_VALUE_PATTERNS_STRINGS]


# 4. Pre-compile patterns for parsing tags and attributes efficiently.
_TAG_PARSER_RE = re.compile(r'<(\w+)([^>]*)>')
_ATTR_PARSER_RE = re.compile(r'\s+([a-zA-Z]+)="([^"]*)"')

# Use a single pattern with capture groups to find either a tag (group 1) or text (group 2)
# This allows using a memory-efficient iterator (re.finditer).
_HTML_TOKENIZER_RE = re.compile(r'(<[^>]+>)|([^<]+)')

def _encode_entities(s):
    """Helper to encode '&' and '\"'."""
    return s.replace('&', '&amp;').replace('"', '&quot;')

def clean_html_optimized(html):
    """
    Cleans HTML with optimized performance by pre-compiling regex, using sets,
    and using iterators to reduce memory overhead.
    """
    # Step 1: Remove unwanted tags and comments in one pass
    html = _UNWANTED_TAGS_RE.sub('', html)

    processed_parts = []
    
    # Step 2: Use a memory-efficient iterator instead of re.findall()
    for match in _HTML_TOKENIZER_RE.finditer(html):
        # The pattern has two capture groups. One will be a tag, the other will be None.
        tag_part = match.group(1)
        text_part = match.group(2)

        if tag_part: # It's a tag
            if tag_part.startswith('</'):
                # Closing tag, keep unchanged
                processed_parts.append(tag_part)
                continue

            # It's an opening tag, process its attributes
            tag_match = _TAG_PARSER_RE.match(tag_part)
            if tag_match:
                tagname = tag_match.group(1)
                attrs_str = tag_match.group(2)
                
                kept_attrs = []
                # Iterate through attributes found by the pre-compiled parser
                for attr, value in _ATTR_PARSER_RE.findall(attrs_str):
                    # Use fast set lookup and pre-compiled regex patterns
                    if attr.lower() in _ALLOWED_ATTRS and value.strip():
                        # This loop now works correctly as `p` is a compiled regex object
                        is_unwanted = any(p.fullmatch(value) for p in _ATTR_VALUE_PATTERNS_RE)
                        if not is_unwanted:
                            encoded_value = _encode_entities(value)
                            kept_attrs.append(f' {attr}="{encoded_value}"')
                
                # Reconstruct tag
                new_tag = f'<{tagname}{"".join(kept_attrs)}>'
                processed_parts.append(new_tag)
            else:
                # Malformed tag or non-standard tag (e.g., <!DOCTYPE>), keep as is
                processed_parts.append(tag_part)
        
        elif text_part: # It's text content
            processed_parts.append(_encode_entities(text_part))

    # Step 3: Filter out empty/whitespace parts and join
    final_parts = [p.strip() for p in processed_parts if p.strip()]
    return '\n'.join(final_parts)

# Example usage (renamed the function for comparison):
if __name__ == "__main__":
    sample_html = ''''''

    print("\n--- Optimized Function Output ---")
    cleaned_optimized = clean_html_optimized(sample_html)
    print(cleaned_optimized)
    
    # Writing the output to a file for verification
    try:
        with open("final_output1.txt", "w", encoding="utf-8") as f:
            f.write(cleaned_optimized)
        print("\nSuccessfully wrote output to final_output1.txt")
    except IOError as e:
        print(f"\nError writing to file: {e}")
