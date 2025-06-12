import re

# --- Constants ---

# A set of standard HTML void tags (tags that don't need a closing tag).
VOID_TAGS = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
}

# Regex strings for content that should be filtered out in the final step.
INVALID_CONTENT_REGEX_STRINGS = [
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

MAX_PARENT_DISTANCE = 100
# Pre-compiled regex patterns for efficiency and clarity.
EMPTY_TAG_PAIR_PATTERN = re.compile(r"^\s*<([a-zA-Z0-9_:-]+)([^>]*)>\s*</\1>\s*$")
SINGLE_TAG_PATTERN = re.compile(r"^\s*<([a-zA-Z0-9_:-]+)([^>]*?)/*>\s*$")
OPEN_TAG_PATTERN = re.compile(r"^\s*<([a-zA-Z0-9_:-]+)[^>]*>\s*$")
CLOSE_TAG_PATTERN = re.compile(r"^\s*<\/([a-zA-Z0-9_:-]+)>\s*$")
CONSECUTIVE_TEXT_BLOCK_PATTERN = re.compile(r"(<\/block-2>)\s*(<block-2>)")
BLOCK_WRAPPER_PATTERN = re.compile(r"</?block-[0-9]+>")
SIMPLE_TAG_CONTENT_PATTERN = re.compile(r"^\s*<([a-zA-Z0-9_:-]+)>(.*?)</\1>\s*$")
# Compile the invalid patterns for efficient reuse
INVALID_CONTENT_PATTERNS = [re.compile(p) for p in INVALID_CONTENT_REGEX_STRINGS]

# --- Processing Functions ---

# --- Step 0 ---
def prune_useless_tags(html_content: str) -> str:
    """
    Step 0: Remove empty tag pairs and unadorned void tags in a single pass.
    This uses a stack-based approach to achieve O(n) complexity, avoiding the
    inefficient iterative method.
    """
    lines = html_content.splitlines()
    if not lines:
        return ""

    tag_stack = []  # Stack stores tuples: (tag_name, line_index, has_content)
    lines_to_prune = set()

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue  # We will preserve empty lines for now and filter later.

        # Rule 1: Prune unadorned void tags immediately.
        single_match = SINGLE_TAG_PATTERN.match(stripped)
        if single_match and single_match.group(1) in VOID_TAGS and not single_match.group(2).strip():
            lines_to_prune.add(i)
            continue

        # Rule 2: Handle opening tags.
        open_match = OPEN_TAG_PATTERN.match(stripped)
        if open_match:
            # Push tag, its line index, and initial content status (False) to the stack.
            tag_stack.append((open_match.group(1), i, False))
            continue

        # Rule 3: Handle closing tags.
        close_match = CLOSE_TAG_PATTERN.match(stripped)
        if close_match and tag_stack and tag_stack[-1][0] == close_match.group(1):
            # A matching closing tag is found. Pop its data from the stack.
            _, start_index, has_content = tag_stack.pop()

            if not has_content:
                # If the block had no content, mark both open and close tags for pruning.
                lines_to_prune.add(start_index)
                lines_to_prune.add(i)
            elif tag_stack:
                # If the block *did* have content, it makes its parent non-empty.
                # Propagate the `has_content = True` status to the new parent on the stack.
                parent_tag, parent_index, _ = tag_stack[-1]
                tag_stack[-1] = (parent_tag, parent_index, True)
            continue

        # Rule 4: Any other line is considered "real" content.
        # This includes text nodes, tags with attributes, or non-matching/malformed tags.
        if tag_stack:
            # Mark the current parent tag on the stack as having content.
            parent_tag, parent_index, _ = tag_stack[-1]
            tag_stack[-1] = (parent_tag, parent_index, True)

    # Reconstruct the HTML by keeping only the lines that were not marked for pruning.
    final_lines = [line for i, line in enumerate(lines) if i not in lines_to_prune]
    return "\n".join(final_lines)

# --- Step 1 ---
def normalize_simple_tags(html_content: str) -> str:
    """
    Processes tags that are self-contained on a single line.
    - Removes empty tag pairs without attributes (e.g., <p></p>).
    - Wraps empty tag pairs with attributes (e.g., <div class="foo"></div>).
    - Wraps void tags with attributes (e.g., <hr class="line">).
    """
    processed_lines = []
    for line in html_content.splitlines():
        stripped_line = line.strip()
        if not stripped_line:
            continue  # Skip empty or whitespace-only lines

        # Check for empty tag pairs like <p></p> or <div class="foo"></div>
        match = EMPTY_TAG_PAIR_PATTERN.match(stripped_line)
        if match:
            tag_name, attributes = match.group(1), match.group(2).strip()
            if attributes:
                # Keep and wrap if attributes are present
                processed_lines.append(f"<block-4><{tag_name}{attributes}></{tag_name}></block-4>")
            # Otherwise, remove the line by not appending it
            continue

        # Check for single void/self-closing tags like <hr>
        match = SINGLE_TAG_PATTERN.match(stripped_line)
        if match:
            tag_name, attributes = match.group(1), match.group(2).strip()
            # Wrap void tags that have attributes
            if tag_name in VOID_TAGS and attributes:
                processed_lines.append(f"<block-4>{stripped_line}</block-4>")
            else:
                processed_lines.append(line)  # Keep other tags (e.g., opening/closing)
        else:
            processed_lines.append(line)  # Keep non-tag lines (text content)

    return "\n".join(processed_lines)


# --- Helper for Step 2 ---
def is_text_line(stripped_line: str) -> bool:
    """
    Helper function to determine if a pre-stripped line is a text node.
    It assumes the line is not empty.
    """
    # Check for the most likely and cheapest conditions first.
    if stripped_line.startswith('<block-'):
        return False
    
    # Check if it looks like an HTML tag (expensive regex part).
    if OPEN_TAG_PATTERN.match(stripped_line) or \
       CLOSE_TAG_PATTERN.match(stripped_line):
        return False
        
    return True

# --- Step 2 ---
def wrap_text_content(html_content: str) -> str:
    """
    Wraps two types of text patterns using temporary block tags.
    - <block-1>: An opening tag, a line of text, and a matching closing tag.
    - <block-2>: A standalone line of text.
    This version is optimized for performance by checking for the most likely
    patterns first and using cheaper string checks to avoid expensive regex.
    """
    lines = html_content.splitlines()
    processed = []
    i = 0
    n = len(lines)

    while i < n:
        # --- OPTIMIZATION 1: Try the 3-line pattern first ---
        # Look for <tag>text</tag> pattern. We check i+2 < n once.
        if i + 2 < n:
            # Strip all three lines once to avoid redundant calls.
            l1_stripped = lines[i].strip()
            l2_stripped = lines[i+1].strip()
            l3_stripped = lines[i+2].strip()

            # --- OPTIMIZATION 2: Early exit with cheap checks ---
            # If l2 is not a text node, we can't have a match.
            # This check is much faster than running two regexes.
            if l2_stripped and is_text_line(l2_stripped):
                # Now perform the expensive regex checks.
                open_match = OPEN_TAG_PATTERN.match(l1_stripped)
                
                # --- OPTIMIZATION 3: Short-circuiting ---
                # Don't check for a closing tag if an opening one wasn't found.
                if open_match:
                    close_match = CLOSE_TAG_PATTERN.match(l3_stripped)
                    # Check for tag name equality.
                    if close_match and open_match.group(1) == close_match.group(1):
                        # Pattern successfully matched.
                        processed.append(f"<block-1>{l1_stripped}{l2_stripped}{l3_stripped}</block-1>")
                        i += 3
                        continue  # Skip to the next iteration

        # --- Fallback: Process the current line individually ---
        # This block is reached if the 3-line pattern did not match or we are near the end.
        curr_line = lines[i]
        stripped_curr = curr_line.strip()
        
        if stripped_curr and is_text_line(stripped_curr):
            processed.append(f"<block-2>{stripped_curr}</block-2>")
        else:
            # This handles empty lines, tags, and already-wrapped blocks.
            processed.append(curr_line)
        
        i += 1
        
    return "\n".join(processed)


# --- Step 3 ---
def wrap_nested_content(html_content: str) -> str:
    """
    Step 3: Identify and wrap complex nested structures containing text.
    - Wraps orphaned or distant text blocks in <block-5>.
    - Wraps complex nested blocks containing text in <block-3>.
    """
    lines = html_content.splitlines()
    if not lines: return ""
    
    tag_stack, blocks = [], {}
    # NEW: Set to track indices of lines that should be wrapped individually.
    lines_to_wrap_individually = set()

    # --- Pass 1: Analyze the structure ---
    for i, line in enumerate(lines):
        if "<block-2>" in line:
            # This line contains a simple text block. Decide how to handle it.
            if not tag_stack:
                # Condition: No parent wrapper. Mark for individual wrapping.
                lines_to_wrap_individually.add(i)
            else:
                parent_tag, start_idx, _ = tag_stack[-1]
                distance = i - start_idx
                
                # Condition: Parent is too far away. Mark for individual wrapping.
                if distance > MAX_PARENT_DISTANCE:
                    lines_to_wrap_individually.add(i)
                else:
                    # Parent is close enough. Mark it as having text content.
                    tag_stack[-1] = (parent_tag, start_idx, True)

        open_match = OPEN_TAG_PATTERN.match(line)
        if open_match:
            tag_stack.append((open_match.group(1), i, False))
            continue

        close_match = CLOSE_TAG_PATTERN.match(line)
        if close_match and tag_stack and tag_stack[-1][0] == close_match.group(1):
            _, start_idx, has_text = tag_stack.pop()
            if has_text:
                # This block has valid, nearby text content. Prepare it for <block-3> wrapping.
                block_content_lines = lines[start_idx : i + 1]
                
                kept_lines = []
                if len(block_content_lines) > 2:
                    kept_lines.append(block_content_lines[0].strip())
                    for inner_line in block_content_lines[1:-1]:
                        stripped_inner = inner_line.strip()
                        # Keep inner content blocks, but also keep individually-wrapped blocks
                        # if they happen to be inside this larger structure.
                        if stripped_inner.startswith(('<block-1>', '<block-2>')):
                            line_index = start_idx + block_content_lines[1:-1].index(inner_line) + 1
                            if line_index in lines_to_wrap_individually:
                                # This line was marked as distant, so wrap it in block-5
                                kept_lines.append(f"<p>{stripped_inner}</p>")
                            else:
                                kept_lines.append(stripped_inner)
                    kept_lines.append(block_content_lines[-1].strip())
                else:
                    kept_lines = [l.strip() for l in block_content_lines]

                content = "".join(kept_lines)
                blocks[start_idx] = (f"<block-3>{content}</block-3>", i)

    # --- Pass 2: Reconstruct the HTML with the new wrappers ---
    final_lines, i = [], 0
    while i < len(lines):
        if i in blocks:
            # Case 1: This is the start of a complex nested block (<block-3>).
            new_block, end_idx = blocks[i]
            final_lines.append(new_block)
            i = end_idx + 1
        elif i in lines_to_wrap_individually:
            # Case 2: This is an orphaned/distant text block (<block-5>).
            # We must ensure it's not already part of a complex block we just added.
            is_processed = any(start <= i <= end for start, (_, end) in blocks.items())
            if not is_processed:
                final_lines.append(f"<p>{lines[i].strip()}</p>")
            i += 1
        else:
            # Case 3: Any other line. Keep it only if it's not inside a complex block.
            is_processed = any(start <= i <= end for start, (_, end) in blocks.items())
            if not is_processed:
                final_lines.append(lines[i])
            i += 1
            
    return "\n".join(final_lines)

# --- Step 4 ---
def filter_for_wrapped_content(html_content: str) -> str:
    """Removes any lines that are not wrapped in a <block-*> tag."""
    return "\n".join([
        line for line in html_content.splitlines()
        if line.strip().startswith('<block-')
    ])


# --- Step 5 ---
def add_line_breaks(html_content: str) -> str:
    """Inserts a <br> tag between consecutive <block-2> elements."""
    return CONSECUTIVE_TEXT_BLOCK_PATTERN.sub(r"\1<br>\2", html_content)


# --- Step 6 ---
def finalize_html(html_content: str) -> str:
    """
    Removes temporary wrappers and performs final structural formatting.
    1. Removes all temporary `<block-*>` wrapper tags.
    2. Removes `<br>` separators when they appear directly between two other tags.
    3. Removes `<head>` and format the content on new lines.
    """
    # 1. Remove all the temporary block wrappers
    unwrapped_html = BLOCK_WRAPPER_PATTERN.sub("", html_content)
    
    # 2. Remove <br> separators between adjacent tags
    unwrapped_html = unwrapped_html.replace('><br><', '><')

    # 3. Find the <head> block, process its content with a nested regex,
    #    and replace the whole block with only the processed content.
    formatted_html = re.sub(
        r'<head[^>]*>(.*?)</head>',
        lambda m: re.sub(
            r'<(title|meta|link)([^>]*)>',
            r'\n<\1\2>',
            m.group(1).strip()  # Process only the inner content
        ).lstrip('\n'),
        unwrapped_html,
        flags=re.DOTALL | re.IGNORECASE
    )
    return formatted_html

# --- Step 7 ---
def filter_and_deduplicate_lines(html_content: str) -> str:
    """
    Step 7: Filter and deduplicate lines based on a set of content rules.
    - Rule 1: Remove empty lines or exact duplicates of lines already kept.
    - Rule 2: Remove lines with multiple consecutive space entities.
    - Rule 3: Remove lines that are `<code>...</code>` blocks.
    - Rule 4: Remove lines where the inner text content is a duplicate of previously seen content.
    - Rule 5: Remove lines where the inner text content is invalid (e.g., looks like a URL, ID).
    """
    seen_lines, seen_content, kept_lines = set(), set(), []
    
    for line in html_content.splitlines():
        stripped_line = line.strip()
        
        # Rule 1: Discard empty lines or exact duplicates of lines already kept.
        if not stripped_line or stripped_line in seen_lines:
            continue
        
        # Rule 2: Discard lines with multiple non-breaking space entities.
        if (
            "&nbsp;&nbsp;" in stripped_line
            or stripped_line.count("&amp;nbsp;") > 1
            or stripped_line.count("nbsp;&amp;") > 1
        ):
            continue
        
        # Rules 3, 4, & 5 apply to lines with simple tag-content-tag structure.
        match = SIMPLE_TAG_CONTENT_PATTERN.match(stripped_line)
        if match:
            tag_name = match.group(1)
            content = match.group(2).strip()
            
            # NEW Rule 3: Discard if the tag is `code`.
            # We use .lower() for case-insensitivity (e.g., <CODE>).
            if tag_name.lower() == 'code':
                continue

            # If the line has no actual text content, let it pass for now.
            # It might be an empty tag with attributes, which is valid.
            if not content:
                pass
            else:
                # Rule 4: Discard if the inner text is a duplicate of content
                # we have already kept from a previous line.
                if content in seen_content:
                    continue
                
                # Rule 5: Discard if the inner text content is invalid.
                if any(p.fullmatch(content) for p in INVALID_CONTENT_PATTERNS):
                    continue
                
                # If the content is valid and unique, record it for future checks.
                seen_content.add(content)

        # If all checks pass, keep the line and record its full structure.
        kept_lines.append(line)
        seen_lines.add(stripped_line)
        
    return "\n".join(kept_lines)

# --- Full Pipeline Execution ---

def run_html_pipeline(raw_html: str) -> str:
    """
    Executes the full HTML processing pipeline step-by-step.
    """
    # Step 0: Remove empty tag pairs and bare void tags
    step0 = prune_useless_tags(raw_html)
    # Step 1: Handle empty/void tags on a single line
    step1 = normalize_simple_tags(step0)
    # Step 2: Wrap simple text and tag-text-tag patterns
    step2 = wrap_text_content(step1)
    # Step 3: Wrap complex nested structures containing text
    step3 = wrap_nested_content(step2)
    # Step 4: Discard anything that wasn't explicitly captured in a block
    step4 = filter_for_wrapped_content(step3)
    # Step 5: Add spacing where needed
    step5 = add_line_breaks(step4)
    # Step 6: Clean up by removing the temporary wrapper tags
    step6 = finalize_html(step5)
    # Step 7: Filter invalid content and remove duplicates
    final_html = filter_and_deduplicate_lines(step6)
    
    return final_html


# --- Example Usage ---
print("\n--- FULL PIPELINE DEMONSTRATION ---")

full_pipeline_input = """"""

# print("\n1. Raw Input:")
# print(full_pipeline_input)

final_output = run_html_pipeline(full_pipeline_input)
print("\n2. Final Output (After all 8 steps):")
print(final_output)
with open("final_output2.txt", "w", encoding="utf-8") as f:
        f.write(final_output)
