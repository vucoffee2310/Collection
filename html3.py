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
            r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:[0-5]\d)?([+-]\d{2}:\d{2}|Z)?', # ISO 8601 Timestamp
            r'\d{1,2}:\d{2}\s+\d{2}/\d{2}/\d{4}',    # US-style timestamp
            r'\d{1,2}:\d{2}',                        # Simple time (e.g., "14:30")
            r'\S{16,}'                               # Long, likely random string/ID
        ]

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
    Performs an initial cleanup pass to remove superfluous tags:
    1. Removes pairs of lines that form an empty tag (e.g., `<div>\n</div>`).
    2. Removes single lines containing a void tag that has no attributes (e.g., `<hr>`).
    """
    lines = html_content.splitlines()
    processed_lines = []
    line_index = 0
    num_lines = len(lines)

    while line_index < num_lines:
        current_line_stripped = lines[line_index].strip()

        # Condition 1: Check for a multi-line empty tag pair
        if line_index + 1 < num_lines:
            next_line_stripped = lines[line_index + 1].strip()
            open_match = OPEN_TAG_PATTERN.match(current_line_stripped)
            close_match = CLOSE_TAG_PATTERN.match(next_line_stripped)

            if (open_match and close_match and
                open_match.group(1) == close_match.group(1)):
                line_index += 2  # Skip both lines
                continue

        # Condition 2: Check for a single-line void tag with no attributes
        single_tag_match = SINGLE_TAG_PATTERN.match(current_line_stripped)
        if single_tag_match:
            tag_name, attributes = single_tag_match.group(1), single_tag_match.group(2).strip()
            if tag_name in VOID_TAGS and not attributes:
                line_index += 1  # Skip this line
                continue

        # If neither condition is met, keep the line
        processed_lines.append(lines[line_index])
        line_index += 1

    return "\n".join(processed_lines)


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

# --- Step 2 (NEW INTEGRATED VERSION) ---
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
    Finds nested HTML structures that contain text (already marked as <block-2>)
    and wraps the entire structure in a <block-3> tag.
    """
    lines = html_content.splitlines()
    if not lines:
        return ""

    tag_stack = []
    # Maps the starting line index of a block to its content and end index
    nested_block_locations = {}

    # First pass: Identify all nested blocks containing text
    for index, line in enumerate(lines):
        if "<block-2>" in line and tag_stack:
            tag, start_index, _ = tag_stack[-1]
            tag_stack[-1] = (tag, start_index, True)  # Mark parent as containing text

        open_match = OPEN_TAG_PATTERN.match(line)
        if open_match:
            tag_stack.append((open_match.group(1), index, False))  # (tag, start_idx, contains_text)
            continue

        close_match = CLOSE_TAG_PATTERN.match(line)
        if close_match and tag_stack and tag_stack[-1][0] == close_match.group(1):
            _, start_index, contains_text = tag_stack.pop()
            if contains_text:
                content = "".join([l.strip() for l in lines[start_index: index + 1]])
                nested_block_locations[start_index] = (f"<block-3>{content}</block-3>", index)

    # Second pass: Reconstruct the HTML using the identified blocks
    processed_line_indices = set()
    for start, (_, end) in nested_block_locations.items():
        processed_line_indices.update(range(start, end + 1))

    final_lines = []
    index = 0
    while index < len(lines):
        if index in nested_block_locations:
            new_block, end_index = nested_block_locations[index]
            final_lines.append(new_block)
            index = end_index + 1
        elif index not in processed_line_indices:
            final_lines.append(lines[index])
            index += 1
        else:
            index += 1  # Skip lines consumed by a block

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
    Cleans the final output by:
    1. Filtering out lines where the content matches a set of invalid patterns.
    2. Removing entire duplicate lines, keeping only the first occurrence.
    """
    seen_lines = set()  # Changed from seen_content to track entire lines
    kept_lines = []

    for line in html_content.splitlines():
        # 1. Deduplicate entire lines first. If we've seen it, skip it.
        if line in seen_lines:
            continue

        # 2. Filter against invalid patterns for tagged lines
        stripped_line = line.strip()
        match = SIMPLE_TAG_CONTENT_PATTERN.match(stripped_line)

        if match:
            content = match.group(2).strip()
            is_invalid = False
            for pattern in INVALID_CONTENT_PATTERNS:
                if pattern.fullmatch(content):
                    is_invalid = True
                    break
            
            if is_invalid:
                continue # Discard line with invalid content

        # If the line is not a duplicate and not invalid, keep it.
        kept_lines.append(line)
        seen_lines.add(line) # Add the entire line to the set of seen lines

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

full_pipeline_input = """<html>
<head>
<meta content="text/html; charset=utf-8">
<title>
HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
</title>
<meta>
<meta>
<meta content="HLV Kim Sang-sik, tuyển Việt Nam">
<meta>
<meta>
<meta content="article">
<meta>
<meta>
<meta content="image/jpg">
<meta>
<meta>
<meta>
<meta>
<link>
<link>
<link>
<meta>
<meta>
<meta>
<meta>
<meta content="Hải Đăng">
<meta content="width=device-width, initial-scale=1, maximum-scale=5, minimal-ui">
<meta>
<meta content="vi">
<meta content="Global">
<meta>
<meta content="Document">
<meta content="1 days">
<meta>
<meta content="GENERAL">
<link>
<meta>
<meta content="VCCorp.vn">
<meta>
<meta content="Copyright (c) by Công ty cổ phần Vccorp">
<meta content="on">
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
<link>
</head>
<body>
<div>
</div>
<div>
<div>
</div>
<div>
<div>
<div>
<ul>
<li>
<a title="Magazine">
eMagazine
</a>
</li>
<li>
<a>
Genz Area
</a>
</li>
<li>
<a>
XANH chưa - check!!!
</a>
</li>
<li>
<a title="Kenh14 showlive">
ShowLive
</a>
</li>
</ul>
<div>
<p>
</p>
<a title="tìm kiếm">
<span>
</span>
</a>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<a title="Tin tức, giải trí, xã hội">
</a>
</div>
<div>
<ul>
<div>
<li>
<a>
G-Dragon biểu diễn tại SVĐ Mỹ Đình
</a>
</li>
<li>
<a>
Diễn viên Ngân Hòa bị suy thận giai đoạn cuối
</a>
</li>
</div>
</ul>
</div>
<div>
<a>
<span>
<span>
</span>
</span>
<span>
<span>
<span>
</span>
<span>
</span>
<span>
</span>
</span>
<span>
<b>
</b>
</span>
</span>
</a>
</div>
<div>
<ul>
<li>
<a>
<span>
GÓP Ý GIAO DIỆN MỚI
</span>
</a>
</li>
</ul>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<ul>
<li>
<a>
TRANG CHỦ
</a>
</li>
<li>
<a>
Star
</a>
</li>
<li>
<a>
Ciné
</a>
</li>
<li>
<a>
Musik
</a>
</li>
<li>
<a title="Beauty &amp;amp; Fashion">
Beauty &amp;amp; Fashion
</a>
</li>
<li>
<a>
Đời sống
</a>
</li>
<li>
<a>
Money-Z
</a>
</li>
<li>
<a>
Ăn - Quẩy - Đi
</a>
</li>
<li>
<a>
Xã hội
</a>
</li>
<li>
<a>
Sức khỏe
</a>
</li>
<li>
<a>
Tek-life
</a>
</li>
<li>
<a>
Học đường
</a>
</li>
<li>
<a>
Xem Mua Luôn
</a>
</li>
<li>
<a>
Video
</a>
</li>
<li>
<a title="mở rộng">
<span>
</span>
<span>
</span>
<span>
</span>
</a>
<div>
<div>
<ul>
<li>
<h4>
<a>
Đời sống
</a>
</h4>
<ul>
<li>
<a>
Nhân vật
</a>
</li>
<li>
<a>
Xem-Ăn-Chơi
</a>
</li>
<li>
<a>
House n Home
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Xem mua luôn
</a>
</h4>
<ul>
<li>
<a>
Thời trang
</a>
</li>
<li>
<a>
Đẹp
</a>
</li>
<li>
<a>
Mommy mua di
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Sport
</a>
</h4>
<ul>
<li>
<a>
Bóng đá
</a>
</li>
<li>
<a>
Hậu trường
</a>
</li>
<li>
<a>
Esports
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Musik
</a>
</h4>
<ul>
<li>
<a>
Âu-Mỹ
</a>
</li>
<li>
<a>
Châu Á
</a>
</li>
<li>
<a>
Việt Nam
</a>
</li>
<li>
<a>
Hip-hop neva die
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Ciné
</a>
</h4>
<ul>
<li>
<a>
Phim chiếu rạp
</a>
</li>
<li>
<a>
Phim Việt Nam
</a>
</li>
<li>
<a>
Series truyền hình
</a>
</li>
<li>
<a>
Hoa ngữ - Hàn Quốc
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Tek-Life
</a>
</h4>
<ul>
<li>
<a>
Metaverse
</a>
</li>
<li>
<a>
How-To
</a>
</li>
<li>
<a>
Wow
</a>
</li>
<li>
<a>
2-Mall
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Star
</a>
</h4>
<ul>
<li>
<a>
Sao Việt
</a>
</li>
<li>
<a>
Hội bạn thân showbiz
</a>
</li>
<li>
<a>
TV Show
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Xã hội
</a>
</h4>
<ul>
<li>
<a>
Pháp luật
</a>
</li>
<li>
<a>
Nóng trên mạng
</a>
</li>
<li>
<a>
Sống xanh
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Học đường
</a>
</h4>
<ul>
<li>
<a>
Nhân vật
</a>
</li>
<li>
<a>
Du học
</a>
</li>
<li>
<a>
Bản tin 46'
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Thế giới đó đây
</a>
</h4>
<ul>
<li>
<a>
Chùm ảnh
</a>
</li>
<li>
<a>
Khám phá
</a>
</li>
<li>
<a>
Dị
</a>
</li>
</ul>
</li>
<li>
<h4>
<a>
Sức khỏe
</a>
</h4>
<ul>
<li>
<a>
Tin tức
</a>
</li>
<li>
<a>
Dinh dưỡng
</a>
</li>
<li>
<a>
Khỏe đẹp
</a>
</li>
<li>
<a>
Giới tính
</a>
</li>
<li>
<a>
Các bệnh
</a>
</li>
</ul>
</li>
</ul>
<div>
<div>
Nhóm chủ đề
</div>
<ul>
</ul>
</div>
<div>
<div>
<h4>
Tải app
</h4>
<ul>
<li>
<a title="Tải về từ App Store">
iOS
</a>
</li>
<li>
<a title="Tải về từ Google Play">
Android
</a>
</li>
</ul>
</div>
<div>
<h4>
<a>
Fanpage
</a>
</h4>
</div>
<div>
<h4>
<a>
Liên hệ
</a>
</h4>
<ul>
<li>
<a>
Quảng cáo
</a>
</li>
</ul>
</div>
</div>
</div>
</div>
</li>
</ul>
<div>
<a>
<span>
</span>
<span>
live
</span>
<span>
</span>
</a>
</div>
</div>
</div>
</div>
</div>
<div>
<div>
<div>
</div>
</div>
</div>
</div>
<div>
<input>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
<div>
<div>
<div>
<ul>
<li>
<a>
Sport
</a>
</li>
<li>
<a>
Bóng đá
</a>
</li>
<li>
<a>
Hậu Trường
</a>
</li>
<li>
<a>
eSports
</a>
</li>
<li>
<a>
Khám phá
</a>
</li>
<li>
<a>
Dị
</a>
</li>
</ul>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
</div>
<div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
</div>
<div>
<div>
<div>
</div>
</div>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
<div>
</div>
<h1>
HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
</h1>
<div>
<span>
Hải Đăng,
</span>
<span>
Theo Thanh Niên Việt
</span>
<span>
09:36 11/06/2025
</span>
<div>
</div>
</div>
</div>
<div>
<div>
</div>
<a>
Chia sẻ
<span>
</span>
</a>
<div>
</div>
<div>
<a title="Gửi email">
<div>
</div>
</a>
</div>
<div>
<div>
</div>
</div>
<div>
<a title="Theo dõi Kenh14.vn trên googlenews">
<span>
Theo dõi Kenh14.vn trên
</span>
<img alt="logo">
</a>
</div>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
<a>
</a>
</div>
<div>
<a>
</a>
</div>
</div>
</div>
</div>
<h2>
<span>
</span>
Sau thất bại nặng nề 0-4 trước Malaysia tại lượt trận thứ hai bảng F – vòng loại cuối cùng Asian Cup 2027, HLV trưởng đội tuyển Việt Nam Kim Sang-sik đã chính thức lên tiếng xin lỗi
</h2>
<div>
</div>
<div>
<ul>
<li>
<a>
Thua Malaysia đậm nhất lịch sử, tuyển Việt Nam gần cạn hy vọng dự Asian Cup
<i>
</i>
</a>
</li>
</ul>
</div>
<div>
</div>
<div>
</div>
<div>
<div>
</div>
<p>
Tối 10/6, tại sân vận động Bukit Jalil (Kuala Lumpur), đội tuyển Việt Nam đã trải qua một trong những trận thua nặng nề nhất trong những năm gần đây khi để chủ nhà Malaysia ghi tới bốn bàn thắng chỉ trong hiệp hai. Dù nhập cuộc thận trọng và tổ chức phòng ngự tương đối tốt trong hiệp đầu, các học trò của HLV Kim Sang-sik đã hoàn toàn vỡ trận sau giờ nghỉ.
</p>
<p>
Phát biểu trong buổi họp báo sau trận, HLV người Hàn Quốc bày tỏ:
</p>
<p>
“Trước tiên, tôi muốn gửi lời xin lỗi chân thành đến tất cả người hâm mộ Việt Nam – những người đã đến sân cổ vũ, cũng như theo dõi qua màn ảnh nhỏ. Các cầu thủ đã cố gắng, nhưng kết quả này là hoàn toàn không thể chấp nhận, và tôi xin nhận trách nhiệm”.
</p>
<figure>
<div>
<a>
<img alt="HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia- Ảnh 1.">
</a>
</div>
<figcaption>
<p>
<i>
Đội tuyển Việt Nam để thua choáng váng 0-4 trước đội tuyển Malaysia, sau 10 năm đội tuyển Việt Nam mới lại thua đậm trước một đội bóng Đông Nam Á như vậy
</i>
</p>
</figcaption>
</figure>
<p>
Theo HLV Kim, Việt Nam đã có hiệp một thi đấu đúng với kế hoạch đề ra, giữ cự ly đội hình tốt và hạn chế được các tình huống nguy hiểm. Tuy nhiên, bước ngoặt xảy ra khi hai trung vệ chủ chốt là Nguyễn Thành Chung và Bùi Tiến Dũng lần lượt rời sân vì chấn thương. Việc mất hai chốt chặn quan trọng khiến hàng thủ rơi vào rối loạn, tạo điều kiện để Malaysia liên tiếp ghi bàn ở các phút 49, 59, 67 và 88.
</p>
<p>
“Ở nửa đầu trận đấu, chúng tôi vẫn có thể triển khai đội hình như kế hoạch, nhưng ở nửa sau trận đấu, với chấn thương của 2 cầu thủ phòng ngự, chúng tôi đã gặp khó khăn trong việc triển khai đội hình và có lẽ đó cũng là một trong những lý do khiến chúng tôi thất bại”, HLV Kim Sang Sik nói.
</p>
<p>
Nhà cầm quân người Hàn Quốc thừa nhận ĐT Việt Nam gặp khó trước 5 cầu thủ nhập tịch mới toanh của đối thủ. “Mặc dù chúng tôi đã cố gắng phân tích nhiều nhất có thể, nhưng cả 5 cầu thủ nhập tịch của đối thủ hôm nay thể hiện tốt hơn chúng tôi dự đoán. Và đúng là chúng tôi đã vất vả khi phải đối đầu với Malaysia. Nhưng chúng tôi sẽ vận dụng những kinh nghiệm của trận đấu ngày hôm nay để chuẩn bị thật tốt cho lần sau”, HLV Kim chia sẻ.
</p>
<p>
Thất bại này khiến đội tuyển Việt Nam rơi xuống vị trí thứ hai bảng F với 3 điểm sau 2 trận, trong khi Malaysia vươn lên dẫn đầu với 6 điểm tuyệt đối. Dù cánh cửa vào VCK Asian Cup 2027 vẫn còn, nhưng đội tuyển sẽ phải đối mặt với áp lực lớn trong các trận lượt về, đặc biệt là khi tiếp chính Malaysia tại Mỹ Đình vào tháng 3/2026.
</p>
<p>
Dù vậy, HLV Kim Sang-sik khẳng định ông và các học trò sẽ không bỏ cuộc. “Về cách chuẩn bị cho trận lượt về ở Hà Nội, đầu tiên tôi nghĩ chúng tôi cần chấp nhận sự thật rằng đội tuyển Malaysia đã mạnh lên nhờ vào những cầu thủ nhập tịch mới. Nhưng bóng đá thì vẫn luôn có chỗ cho những kỳ tích xảy ra. Nếu chúng tôi chuẩn bị tốt cho trận lượt về, tôi nghĩ chúng tôi vẫn có cơ hội để bù đắp được 4 bàn thua hôm nay”, HLV Kim khẳng định.
</p>
<p>
Sau trận đấu này, đội tuyển Việt Nam sẽ về nước, các cầu thủ trở lại CLB để tiếp tục thi đấu các trận còn lại của V.League 2024/25. Tuyển Việt Nam sẽ hội quân trở lại vào dịp FIFA Days tháng 9.
</p>
<div>
</div>
</div>
<zone>
</zone>
<zone>
</zone>
<div>
<div>
</div>
</div>
<div>
<div>
<a title="Theo  Thanh Niên Việt">
Theo
<span>
Thanh Niên Việt
</span>
<span>
<i>
Copy link
</i>
</span>
</a>
<div>
<div>
<span>
Link bài gốc
</span>
<span>
<i>
Lấy link
</i>
</span>
</div>
<a>
https://thanhnienviet.vn/hlv-kim-sang-sik-xin-loi-sau-tran-dt-viet-nam-thua-soc-malaysia-209250611080238159.htm
</a>
<div>
</div>
</div>
</div>
</div>
<div>
</div>
<div>
<a>
Hlv Kim Sang-sik dùng bài lạ, tuyển Việt Nam sụp đổ đầy thất vọng, nguy cơ lớn lỡ vé Asian Cup
</a>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
<div>
<span>
</span>
<div>
</div>
</div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
<div>
<ul>
<li>
<a>
HLV Kim Sang-sik
</a>
</li>
<li>
<a>
tuyển Việt Nam
</a>
</li>
</ul>
</div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
</div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
<div>
</div>
<div>
<div>
<div>
<div>
<div>
<div>
<span>
TIN CÙNG CHUYÊN MỤC
</span>
<div>
<span>
Xem theo ngày
</span>
<ul>
<li>
<div>
<div>
11
</div>
<ul>
<li>
Ngày
</li>
<li>
1
</li>
<li>
2
</li>
<li>
3
</li>
<li>
4
</li>
<li>
5
</li>
<li>
6
</li>
<li>
7
</li>
<li>
8
</li>
<li>
9
</li>
<li>
10
</li>
<li>
11
</li>
<li>
12
</li>
<li>
13
</li>
<li>
14
</li>
<li>
15
</li>
<li>
16
</li>
<li>
17
</li>
<li>
18
</li>
<li>
19
</li>
<li>
20
</li>
<li>
21
</li>
<li>
22
</li>
<li>
23
</li>
<li>
24
</li>
<li>
25
</li>
<li>
26
</li>
<li>
27
</li>
<li>
28
</li>
<li>
29
</li>
<li>
30
</li>
<li>
31
</li>
</ul>
</div>
<select>
<option>
Ngày
</option>
<option>
1
</option>
<option>
2
</option>
<option>
3
</option>
<option>
4
</option>
<option>
5
</option>
<option>
6
</option>
<option>
7
</option>
<option>
8
</option>
<option>
9
</option>
<option>
10
</option>
<option>
11
</option>
<option>
12
</option>
<option>
13
</option>
<option>
14
</option>
<option>
15
</option>
<option>
16
</option>
<option>
17
</option>
<option>
18
</option>
<option>
19
</option>
<option>
20
</option>
<option>
21
</option>
<option>
22
</option>
<option>
23
</option>
<option>
24
</option>
<option>
25
</option>
<option>
26
</option>
<option>
27
</option>
<option>
28
</option>
<option>
29
</option>
<option>
30
</option>
<option>
31
</option>
</select>
</li>
<li>
<div>
<div>
Tháng 6
</div>
<ul>
<li>
Tháng
</li>
<li>
Tháng 1
</li>
<li>
Tháng 2
</li>
<li>
Tháng 3
</li>
<li>
Tháng 4
</li>
<li>
Tháng 5
</li>
<li>
Tháng 6
</li>
<li>
Tháng 7
</li>
<li>
Tháng 8
</li>
<li>
Tháng 9
</li>
<li>
Tháng 10
</li>
<li>
Tháng 11
</li>
<li>
Tháng 12
</li>
</ul>
</div>
<select>
<option>
Tháng
</option>
<option>
Tháng 1
</option>
<option>
Tháng 2
</option>
<option>
Tháng 3
</option>
<option>
Tháng 4
</option>
<option>
Tháng 5
</option>
<option>
Tháng 6
</option>
<option>
Tháng 7
</option>
<option>
Tháng 8
</option>
<option>
Tháng 9
</option>
<option>
Tháng 10
</option>
<option>
Tháng 11
</option>
<option>
Tháng 12
</option>
</select>
</li>
<li>
<div>
<div>
2025
</div>
<ul>
<li>
2020
</li>
<li>
2021
</li>
<li>
2022
</li>
<li>
2023
</li>
<li>
2024
</li>
<li>
2025
</li>
</ul>
</div>
<select>
<option>
2020
</option>
<option>
2021
</option>
<option>
2022
</option>
<option>
2023
</option>
<option>
2024
</option>
<option>
2025
</option>
</select>
</li>
<li>
<button>
Xem
</button>
</li>
</ul>
</div>
</div>
</div>
<div>
<div>
<div>
</div>
</div>
</div>
</div>
</div>
<div>
</div>
<div>
<div>
<div>
<div>
<span>
TIN CÙNG CHUYÊN MỤC
</span>
<div>
<span>
Xem theo ngày
</span>
<ul>
<li>
<select>
<option>
Ngày
</option>
<option>
1
</option>
<option>
2
</option>
<option>
3
</option>
<option>
4
</option>
<option>
5
</option>
<option>
6
</option>
<option>
7
</option>
<option>
8
</option>
<option>
9
</option>
<option>
10
</option>
<option>
11
</option>
<option>
12
</option>
<option>
13
</option>
<option>
14
</option>
<option>
15
</option>
<option>
16
</option>
<option>
17
</option>
<option>
18
</option>
<option>
19
</option>
<option>
20
</option>
<option>
21
</option>
<option>
22
</option>
<option>
23
</option>
<option>
24
</option>
<option>
25
</option>
<option>
26
</option>
<option>
27
</option>
<option>
28
</option>
<option>
29
</option>
<option>
30
</option>
<option>
31
</option>
</select>
</li>
<li>
<select>
<option>
Tháng
</option>
<option>
Tháng 1
</option>
<option>
Tháng 2
</option>
<option>
Tháng 3
</option>
<option>
Tháng 4
</option>
<option>
Tháng 5
</option>
<option>
Tháng 6
</option>
<option>
Tháng 7
</option>
<option>
Tháng 8
</option>
<option>
Tháng 9
</option>
<option>
Tháng 10
</option>
<option>
Tháng 11
</option>
<option>
Tháng 12
</option>
</select>
</li>
<li>
<select>
<option>
2020
</option>
<option>
2021
</option>
<option>
2022
</option>
<option>
2023
</option>
<option>
2024
</option>
<option>
2025
</option>
</select>
</li>
<li>
<button>
Xem
</button>
</li>
</ul>
</div>
</div>
<div>
<div>
<div>
<div>
<div>
<div>
<a>
<video>
</video>
</a>
<div>
<h4>
<a>
Ngọc Trinh chơi pickleball &quot;cợt nhả vô cùng&quot;, thứ cuốn nhất là vòng eo siêu thực
</a>
<span>
Nổi bật
</span>
</h4>
</div>
</div>
<div>
<a>
<img>
</a>
<div>
<h4>
<a>
Căng rồi: Thua thảm 0-4 Malaysia, đội tuyển Việt Nam tụt dốc không phanh trên bảng xếp hạng FIFA
</a>
<span>
Nổi bật
</span>
</h4>
</div>
</div>
<div>
<a>
<img>
</a>
<div>
<h4>
<a>
HLV Kim Sang-sik xin lỗi sau trận ĐT Việt Nam thua sốc Malaysia
</a>
<span>
-
</span>
<span>
5 giờ trước
</span>
</h4>
</div>
</div>
</div>
<div>
<div>
<a>
<img>
</a>
<div>
<h4>
<a>
Nhìn lại trận thua của đội tuyển Việt Nam trước Malaysia: Ông Kim Sang-sik không thể tạo nên phép màu
</a>
<span>
-
</span>
<span>
5 giờ trước
</span>
</h4>
</div>
</div>
<div>
<a>
<video>
</video>
</a>
<div>
<h4>
<a>
Nàng WAG nổi tiếng phấn khích khi đón các thành viên BTS xuất ngũ, cảm thán: Đợi anh về em lấy chồng luôn rồi!
</a>
<span>
-
</span>
<span>
6 giờ trước
</span>
</h4>
</div>
</div>
<div>
<a>
<img>
</a>
<div>
<h4>
<a>
Lộ khoảnh khắc Chu Thanh Huyền về quê Quang Hải ăn cỗ nhưng lấy phần đem về, dân tình liền có phản ứng này
</a>
<span>
-
</span>
<span>
6 giờ trước
</span>
</h4>
</div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
</div>
<div>
</div>
</div>
</div>
</div>
<div>
</div>
<input>
<div>
<div>
</div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
<input>
<input>
<input>
<div>
<div>
<div>
</div>
</div>
<div>
<div>
<div>
<button>
</button>
<div>
<div>
<span>
</span>
<span>
</span>
<span>
</span>
</div>
<span>
Đóng
</span>
<div>
<span>
</span>
<span>
</span>
</div>
</div>
</div>
</div>
</div>
<div>
<div>
<div>
</div>
<div>
</div>
</div>
</div>
</div>
</div>
</div>
<div>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
<input>
</div>
</div>
<div>
</div>
<div>
</div>
<div>
<div>
<div>
<ul>
<li>
<a>
Star
</a>
</li>
<li>
<a>
Ciné
</a>
</li>
<li>
<a>
Musik
</a>
</li>
<li>
<a>
Beauty &amp;amp; Fashion
</a>
</li>
<li>
<a>
Sport
</a>
</li>
<li>
<a>
Đời sống
</a>
</li>
<li>
<a>
Xã hội
</a>
</li>
<li>
<a>
Ăn - Quẩy - Đi
</a>
</li>
<li>
<a>
Xem Mua Luôn
</a>
</li>
<li>
<a>
Thế giới đó đây
</a>
</li>
<li>
<a>
Sức khỏe
</a>
</li>
<li>
<a>
Tek-Life
</a>
</li>
<li>
<a>
Học đường
</a>
</li>
<li>
<a>
Money-Z
</a>
</li>
<li>
<a>
Video
</a>
</li>
</ul>
</div>
</div>
<div>
<footer>
<div>
<div>
<a title="Kênh 14">
</a>
<div>
<span>
ĐÓNG GÓP NỘI DUNG
</span>
<div>
<a>
câu hỏi thường gặp
</a>
<a>
bandoc@kenh14.vn
</a>
</div>
<p>
Kenh14.vn rất hoan nghênh độc giả gửi thông tin và góp ý cho chúng tôi.
</p>
</div>
</div>
<div>
<div>
<blockquote>
<a title="facebook">
</a>
</blockquote>
</div>
</div>
</div>
<div>
<div>
<div>
<p>
trụ sở hà nội
</p>
<p>
Tầng 21, Tòa nhà Center Building, Hapulico Complex, số 1 Nguyễn Huy Tưởng, phường Thanh Xuân Trung, quận Thanh Xuân, Hà Nội.
<br>
Điện thoại: 024 7309 5555, máy lẻ 62.370
</p>
<a>
xem bản đồ
</a>
</div>
<div>
<p>
trụ sở tp.hồ chí minh
</p>
<p>
Tầng 4, Tòa nhà 123, số 127 Võ Văn Tần, phường 6, quận 3, TP. Hồ Chí Minh.
<br>
Điện thoại: 028 7307 7979
</p>
<a>
xem bản đồ
</a>
</div>
</div>
<div>
<div>
<p>
chịu trách nhiệm quản lý nội dung
</p>
<p>
Bà Nguyễn Bích Minh
</p>
</div>
<div>
<p>
hợp tác truyền thông
</p>
<p>
024.73095555  (máy lẻ 62.370)
</p>
<a>
marketing@kenh14.vn
</a>
</div>
<div>
<p>
liên hệ quảng cáo
</p>
<p>
02473007108
</p>
<a>
giaitrixahoi@admicro.vn
</a>
<div>
<a>
<span>
</span>
Chat với tư vấn viên
</a>
<a>
xem chi tiết
</a>
</div>
</div>
<div>
<p>
<a>
Chính sách bảo mật
</a>
</p>
</div>
</div>
<div>
<a>
<img alt="Vccorp">
</a>
<p>
<span>
© Copyright 2007 - 2025 –
</span>
Công ty Cổ phần VCCorp
</p>
<p>
Tầng 17, 19, 20, 21 Tòa nhà Center Building - Hapulico Complex, Số 1 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội.
</p>
<p>
Giấy phép thiết lập trang thông tin điện tử tổng hợp trên mạng số 2215/GP-TTĐT do Sở Thông tin và Truyền thông Hà Nội cấp ngày 10 tháng 4 năm 2019
</p>
</div>
</div>
</footer>
</div>
</div>
<div>
</div>
<div>
<input>
</div>
</body>
</html>"""

# print("\n1. Raw Input:")
# print(full_pipeline_input)

final_output = run_html_pipeline(full_pipeline_input)
print("\n2. Final Output (After all 8 steps):")
print(final_output)
with open("final_output2.txt", "w", encoding="utf-8") as f:
        f.write(final_output)