import re
import json

# ==============================================================================
# 1. CENTRALIZED CONFIGURATION
# ==============================================================================

class HtmlCleanerConfig:
    """
    A configuration object to hold all settings for the HTML cleaning pipeline.
    This centralizes all patterns and constants for easy modification and reuse.
    """
    def __init__(self):
        # --- General Settings ---
        self.ALLOWED_ATTRS = {'alt', 'placeholder', 'title', 'content'}
        self.VOID_TAGS = {
            'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
            'link', 'meta', 'param', 'source', 'track', 'wbr'
        }

        # --- Reusable Regex Components ---
        _tag_name_pattern = r'[a-zA-Z0-9_:-]+'
        _attr_name_pattern = r'[a-zA-Z0-9_-]+'

        # --- Core Regex Patterns ---
        # Removes entire script, style, svg, pre blocks, comments, and tags with class="source-code"
        _unwanted_by_name = r'<(script|style|svg|pre)[^>]*>.*?</\1>'
        _unwanted_by_class = fr'<({_tag_name_pattern})[^>]*class\s*=\s*"[^"]*source-code[^"]*"[^>]*>.*?</\2>'
        _comments = r'<!--.*?-->'

        # NEW: Threshold for associating text with a parent tag.
        # If a text block is more than this many lines away from an opening tag,
        # it will be treated as an independent block.
        self.MAX_PARENT_DISTANCE = 100

        self.UNWANTED_TAGS_RE = re.compile(
            f"{_unwanted_by_name}|{_unwanted_by_class}|{_comments}",
            flags=re.DOTALL | re.IGNORECASE
        )

        # Unified list of patterns for invalid content in attributes or text nodes.
        _invalid_content_strings = [
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
        self.INVALID_CONTENT_RES = [re.compile(p) for p in _invalid_content_strings]

        # --- General Purpose Patterns ---
        self.TOKEN_RE = re.compile(r'(<[^>]+>)|([^<]+)')
        self.TAG_CONTENT_RE = re.compile(fr'<\s*({_tag_name_pattern})\s*([^>]*?)>')
        self.ATTR_RE = re.compile(fr'({_attr_name_pattern})\s*=\s*"[^"]*"')
        self.OPEN_TAG_RE = re.compile(fr"^\s*<({_tag_name_pattern})[^>]*>\s*$")
        self.CLOSE_TAG_RE = re.compile(fr"^\s*</({_tag_name_pattern})>\s*$")
        self.SINGLE_TAG_RE = re.compile(fr"^\s*<({_tag_name_pattern})([^>]*?)/*>\s*$")
        self.EMPTY_TAG_PAIR_RE = re.compile(fr"^\s*<({_tag_name_pattern})([^>]*)>\s*</\1>\s*$")
        self.SIMPLE_TAG_CONTENT_RE = re.compile(fr"^\s*<({_tag_name_pattern})>(.*?)</\1>\s*$")
        
        # --- Transformation-Specific Patterns ---
        self.BLOCK_WRAPPER_RE = re.compile(r"</?block-[0-9]+>")
        self.CONSECUTIVE_TEXT_BLOCK_RE = re.compile(r"(<\/block-2>)\s*(<block-2>)")

# ==============================================================================
# 2. LOGIC ENCAPSULATED IN CLASSES
# ==============================================================================

class InitialCleaner:
    """Performs the first pass of cleaning on the raw HTML."""
    def __init__(self, config):
        self.config = config

    @staticmethod
    def _encode_entities(s):
        """Encodes '&' and '\"' to their HTML entities."""
        return s.replace('&', '&amp;').replace('"', '&quot;')

    def _is_valid_attribute_value(self, value):
        """Checks if an attribute value is valid based on unified content rules."""
        if not value.strip():
            return False
        return not any(p.fullmatch(value) for p in self.config.INVALID_CONTENT_RES)

    def clean(self, html):
        """
        Removes unwanted tags and cleans attributes from the HTML.
        - Removes script, style, svg, pre tags, and comments.
        - Keeps only allowed attributes with valid content.
        - Normalizes whitespace and structure.
        """
        html = self.config.UNWANTED_TAGS_RE.sub('', html)
        processed_parts = []
        
        for match in self.config.TOKEN_RE.finditer(html):
            tag_part, text_part = match.groups()

            if tag_part:
                if tag_part.startswith('</'):  # Closing tag, keep as is
                    processed_parts.append(tag_part)
                    continue

                tag_match = self.config.TAG_CONTENT_RE.match(tag_part)
                if tag_match:
                    tagname, attrs_str = tag_match.groups()
                    kept_attrs = []
                    for attr_match in re.finditer(r'\s*([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"', attrs_str):
                        attr, value = attr_match.group(1), attr_match.group(2)
                        if attr.lower() in self.config.ALLOWED_ATTRS and self._is_valid_attribute_value(value):
                            kept_attrs.append(f' {attr}="{self._encode_entities(value)}"')
                    
                    processed_parts.append(f'<{tagname}{"".join(kept_attrs)}>')
                else: # Malformed tag, keep as is
                    processed_parts.append(tag_part)
            
            elif text_part:
                processed_parts.append(self._encode_entities(text_part))

        final_parts = [p.strip() for p in processed_parts if p.strip()]
        return '\n'.join(final_parts)


class DuplicateRemover:
    """
    Analyzes the HTML to remove duplicate attributes based on a set of rules.
    - Rule 1: Removes attributes whose value matches visible text content.
    - Rule 2: Removes attributes whose value is a duplicate of another attribute,
              keeping the one that is physically closer to its succeeding text content.
    """
    def __init__(self, config, verbose=False):
        self.config = config
        self.verbose = verbose

    def _parse_for_analysis(self, html_string):
        """Parses the HTML string into a list of tag, attribute, and text items."""
        line_starts = [m.start() for m in re.finditer(r'\n', html_string)]
        line_idx = 0
        parsed_data = []
        
        for match in self.config.TOKEN_RE.finditer(html_string):
            while line_idx < len(line_starts) and match.start() > line_starts[line_idx]:
                line_idx += 1
            current_line_num = line_idx + 1

            tag_part, text_part = match.groups()

            if tag_part:
                tag_content_match = self.config.TAG_CONTENT_RE.search(tag_part)
                if tag_content_match:
                    attr_string = tag_content_match.group(2)
                    attributes_found = list(self.config.ATTR_RE.finditer(attr_string))
                    
                    if attributes_found:
                        attr_obj = {'line_address': current_line_num, 'type': 'attr', 'attributes': []}
                        for attr_match in attributes_found:
                            full_str = attr_match.group(0)
                            value_match = re.search(r'"([^"]*)"', full_str)
                            value = value_match.group(1) if value_match else ""
                            attr_obj['attributes'].append({
                                'full_string': full_str,
                                'value': value.replace('&quot;', '"').replace('&amp;', '&')
                            })
                        parsed_data.append(attr_obj)
            elif text_part and text_part.strip():
                parsed_data.append({
                    'line_address': current_line_num, 'type': 'text', 'content': text_part.strip()
                })
        return parsed_data

    def _apply_removal_rules(self, parsed_data):
        """Applies deduplication rules and returns a plan of attributes to remove."""
        removals = {}
        value_map = {}
        all_text_content = set()

        # --- Pre-process data into fast lookup maps ---
        for i, item in enumerate(parsed_data):
            item['id'] = i
            if item['type'] == 'attr':
                for attr in item['attributes']:
                    norm_value = attr['value'].strip().lower()
                    if not norm_value: continue
                    attr_info = {
                        'parent_item_id': i, 'line_address': item['line_address'],
                        'full_string': attr['full_string'],
                    }
                    value_map.setdefault(norm_value, []).append(attr_info)
            elif item['type'] == 'text':
                all_text_content.add(item['content'].strip().lower())

        # Annotate each item with the line number of its succeeding text content
        last_seen_text_line = -1
        for item in reversed(parsed_data):
            item['succeeding_text_line'] = last_seen_text_line
            if item['type'] == 'text':
                last_seen_text_line = item['line_address']

        # --- Apply Rule 1: Text Content vs. Attribute Content ---
        for text_content in all_text_content:
            if text_content in value_map:
                for attr in value_map[text_content]:
                    removals.setdefault(attr['line_address'], set()).add(attr['full_string'])

        # --- Apply Rule 2: Attribute vs. Attribute ---
        for norm_value, dup_group in value_map.items():
            if len(dup_group) <= 1: continue
            
            # Filter out duplicates that were already marked for removal by Rule 1
            active_dups = [
                attr for attr in dup_group 
                if attr['line_address'] not in removals or attr['full_string'] not in removals[attr['line_address']]
            ]
            if len(active_dups) <= 1: continue

            # Keep the attribute physically closest to its succeeding text
            with_succeeding = [d for d in active_dups if parsed_data[d['parent_item_id']]['succeeding_text_line'] != -1]
            if with_succeeding:
                attr_to_keep = min(with_succeeding, key=lambda d: parsed_data[d['parent_item_id']]['succeeding_text_line'] - d['line_address'])
            else: # If no duplicates have succeeding text, keep the last one found
                attr_to_keep = max(active_dups, key=lambda d: d['line_address'])

            for attr in active_dups:
                if attr is not attr_to_keep:
                    removals.setdefault(attr['line_address'], set()).add(attr['full_string'])
        
        return removals

    @staticmethod
    def _reconstruct_html(html_content, removals):
        """Rebuilds the HTML string by removing the specified attributes."""
        html_lines = html_content.splitlines()
        for line_num, attrs_to_remove in removals.items():
            idx = line_num - 1
            for attr_string in attrs_to_remove:
                pattern = r'\s*' + re.escape(attr_string)
                html_lines[idx] = re.sub(pattern, '', html_lines[idx], count=1)
        return "\n".join(html_lines)

    def remove(self, html_content):
        """Executes the full deduplication process."""
        parsed_data = self._parse_for_analysis(html_content)
        removals = self._apply_removal_rules(parsed_data)

        if self.verbose:
            print(f"\n[DuplicateRemover] Removals Plan: {json.dumps({k: list(v) for k, v in removals.items()}, indent=2)}")

        return self._reconstruct_html(html_content, removals)

class ContentExtractor:
    """Performs a multi-step structural transformation to extract meaningful content blocks."""
    def __init__(self, config):
        self.config = config

    def _prune_useless_tags(self, html):
        """Step 0: Remove empty tag pairs and unadorned void tags iteratively until stable."""
        last_html_state = None
        
        while html != last_html_state:
            last_html_state = html
            lines = html.splitlines()
            processed_lines = []
            
            i = 0
            n = len(lines)
            while i < n:
                curr_stripped = lines[i].strip()
                if not curr_stripped:
                    i += 1
                    continue # Discard whitespace-only lines during this process

                # Rule 1: Check for empty tag pairs, which may be separated by whitespace-only lines
                open_match = self.config.OPEN_TAG_RE.match(curr_stripped)
                if open_match:
                    # Find the next non-empty line
                    next_line_idx = i + 1
                    while next_line_idx < n and not lines[next_line_idx].strip():
                        next_line_idx += 1
                    
                    if next_line_idx < n:
                        next_stripped = lines[next_line_idx].strip()
                        close_match = self.config.CLOSE_TAG_RE.match(next_stripped)
                        if close_match and open_match.group(1) == close_match.group(1):
                            # Pair found. Skip all lines from `i` to `next_line_idx`.
                            i = next_line_idx + 1
                            continue

                # Rule 2: Check for unadorned void tags (e.g., <br>, <hr> with no attributes)
                single_match = self.config.SINGLE_TAG_RE.match(curr_stripped)
                if single_match and single_match.group(1) in self.config.VOID_TAGS and not single_match.group(2).strip():
                    i += 1
                    continue # Skip the single tag

                # If no rule matched, keep the original line
                processed_lines.append(lines[i])
                i += 1
            
            html = "\n".join(processed_lines)
            
        return html

    def _normalize_simple_tags(self, html):
        """Step 1: Wrap single tags with attributes in a block for preservation."""
        processed = []
        for line in html.splitlines():
            stripped = line.strip()
            if not stripped: continue

            match = self.config.EMPTY_TAG_PAIR_RE.match(stripped)
            if match and match.group(2).strip(): # e.g., <div class="c"></div>
                processed.append(f"<block-4><{match.group(1)}{match.group(2)}></{match.group(1)}></block-4>")
                continue

            match = self.config.SINGLE_TAG_RE.match(stripped)
            if match and match.group(1) in self.config.VOID_TAGS and match.group(2).strip(): # e.g., <img src="...">
                processed.append(f"<block-4>{stripped}</block-4>")
            else:
                processed.append(line)
        return "\n".join(processed)

    def _is_text_line(self, stripped_line: str) -> bool:
        """
        Helper function to determine if a pre-stripped line is a text node.
        It assumes the line is not empty.
        """
        # Check for the most likely and cheapest conditions first.
        if stripped_line.startswith('<block-'):
            return False
        
        # Check if it looks like an HTML tag (expensive regex part).
        if self.config.OPEN_TAG_RE.match(stripped_line) or \
        self.config.CLOSE_TAG_RE.match(stripped_line):
            return False
            
        return True

    def _wrap_text_content(self, html: str) -> str:
        """Step 2: Wrap text nodes and simple tag-text-tag structures in blocks."""
        lines = html.splitlines()
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
                if l2_stripped and self._is_text_line(l2_stripped):
                    # Now perform the expensive regex checks.
                    open_match = self.config.OPEN_TAG_RE.match(l1_stripped)
                    
                    # --- OPTIMIZATION 3: Short-circuiting ---
                    # Don't check for a closing tag if an opening one wasn't found.
                    if open_match:
                        close_match = self.config.CLOSE_TAG_RE.match(l3_stripped)
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
            
            if stripped_curr and self._is_text_line(stripped_curr):
                processed.append(f"<block-2>{stripped_curr}</block-2>")
            else:
                # This handles empty lines, tags, and already-wrapped blocks.
                processed.append(curr_line)
            
            i += 1
            
        return "\n".join(processed)

    def _wrap_nested_content(self, html):
        """
        Step 3: Identify and wrap complex nested structures containing text.
        - Wraps orphaned or distant text blocks in <block-5>.
        - Wraps complex nested blocks containing text in <block-3>.
        """
        lines = html.splitlines()
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
                    if distance > self.config.MAX_PARENT_DISTANCE:
                        lines_to_wrap_individually.add(i)
                    else:
                        # Parent is close enough. Mark it as having text content.
                        tag_stack[-1] = (parent_tag, start_idx, True)

            open_match = self.config.OPEN_TAG_RE.match(line)
            if open_match:
                tag_stack.append((open_match.group(1), i, False))
                continue

            close_match = self.config.CLOSE_TAG_RE.match(line)
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

    def _filter_for_wrapped_content(self, html):
        """Step 4: Keep only the lines that are wrapped in our temporary blocks."""
        return "\n".join([line for line in html.splitlines() if line.strip().startswith('<block-')])

    def _add_line_breaks(self, html):
        """Step 5: Insert <br> tags between consecutive text blocks to preserve separation."""
        return self.config.CONSECUTIVE_TEXT_BLOCK_RE.sub(r"\1<br>\2", html)

    def _finalize_html(self, html_content):
        """Step 6: Remove temporary wrappers and perform final structural formatting."""
        # 1. Remove all the temporary block wrappers
        unwrapped = self.config.BLOCK_WRAPPER_RE.sub("", html_content)
        
        # 2. Remove <br> separators that appear directly between two other tags
        unwrapped = unwrapped.replace('><br><', '><')

        # 3. Process <head> content, keeping relevant tags on new lines
        def process_head(match):
            inner_html = match.group(1).strip()
            # Find relevant tags and format them
            processed_tags = re.sub(
                r'<(title|meta|link)([^>]*)>', r'\n<\1\2>', inner_html
            )
            return processed_tags.lstrip('\n')

        formatted = re.sub(
            r'<head[^>]*>(.*?)</head>', process_head, unwrapped, flags=re.DOTALL | re.IGNORECASE
        )
        return formatted

    def _filter_and_deduplicate_lines(self, html):
        """
        Step 7: Filter and deduplicate lines based on a set of content rules.
        - Rule 1: Remove empty lines or exact duplicates of lines already kept.
        - Rule 2: Remove lines with multiple consecutive space entities.
        - Rule 3: Remove lines that are `<code>...</code>` blocks.
        - Rule 4: Remove lines where the inner text content is a duplicate of previously seen content.
        - Rule 5: Remove lines where the inner text content is invalid (e.g., looks like a URL, ID).
        """
        seen_lines, seen_content, kept_lines = set(), set(), []
        
        for line in html.splitlines():
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
            match = self.config.SIMPLE_TAG_CONTENT_RE.match(stripped_line)
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
                    if any(p.fullmatch(content) for p in self.config.INVALID_CONTENT_RES):
                        continue
                    
                    # If the content is valid and unique, record it for future checks.
                    seen_content.add(content)

            # If all checks pass, keep the line and record its full structure.
            kept_lines.append(line)
            seen_lines.add(stripped_line)
            
        return "\n".join(kept_lines)

    def extract(self, html_content):
        """Executes the full content extraction pipeline."""
        # The old `_prune_useless_tags` is replaced with the new single-pass version.
        s0 = self._prune_useless_tags(html_content)
        s1 = self._normalize_simple_tags(s0)
        s2 = self._wrap_text_content(s1)
        s3 = self._wrap_nested_content(s2)
        s4 = self._filter_for_wrapped_content(s3)
        s5 = self._add_line_breaks(s4)
        s6 = self._finalize_html(s5)
        s7 = self._filter_and_deduplicate_lines(s6)
        return s7

# ==============================================================================
# 3. MAIN PIPELINE ORCHESTRATOR
# ==============================================================================

class HtmlProcessingPipeline:
    """Orchestrates the entire HTML cleaning and extraction process."""
    def __init__(self, verbose=False):
        self.config = HtmlCleanerConfig()
        self.initial_cleaner = InitialCleaner(self.config)
        self.duplicate_remover = DuplicateRemover(self.config, verbose=verbose)
        self.content_extractor = ContentExtractor(self.config)

    def process(self, raw_html):
        """
        Runs the full, three-stage pipeline on the input HTML.

        Args:
            raw_html: The raw HTML string to process.
        Returns:
            The final, cleaned and extracted HTML content.
        """
        # Stage 1: Perform initial low-level cleaning.
        cleaned_html = self.initial_cleaner.clean(raw_html)

        # Stage 2: Perform intelligent, rule-based deduplication.
        deduplicated_html = self.duplicate_remover.remove(cleaned_html)

        # Stage 3: Perform structural transformation to extract key content.
        final_output = self.content_extractor.extract(deduplicated_html)

        return final_output


# ==============================================================================
# 4. EXECUTION EXAMPLE
# ==============================================================================

if __name__ == "__main__":
    sample_html = """"""

    pipeline = HtmlProcessingPipeline(verbose=False)
    final_result = pipeline.process(sample_html)

    print("\n--- FINAL PROCESSED OUTPUT ---")
    print(final_result)
    with open("final_outputav.txt", "w", encoding="utf-8") as f:
        f.write(final_result)
