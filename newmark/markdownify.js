/**
 * markdownify.js
 *
 * A JavaScript port of the Python `markdownify` library. This script is self-contained.
 */

// Heading styles
const ATX = 'atx';
const ATX_CLOSED = 'atx_closed';
const UNDERLINED = 'underlined';
const SETEXT = UNDERLINED;

// Newline style
const SPACES = 'spaces';
const BACKSLASH = 'backslash';

// Strong and emphasis style
const ASTERISK = '*';
const UNDERSCORE = '_';

// Strip styles
const LSTRIP = 'lstrip';
const RSTRIP = 'rstrip';
const STRIP = 'strip';
const STRIP_ONE = 'strip_one';


// General-purpose regex patterns
const re_whitespace = /[\t ]+/g;
const re_all_whitespace = /[\t \r\n]+/g;
const re_newline_whitespace = /[\t \r\n]*[\r\n][\t \r\n]*/g;
const re_html_heading = /^h(\d+)$/i;
const re_pre_lstrip1 = /^ *\n/;
const re_pre_rstrip1 = /\n *$/;
const re_pre_lstrip = /^[ \n]*\n/;
const re_pre_rstrip = /[ \n]*$/;
const re_line_with_content = /^(.*)/gm;

// Extract (leading_nl, content, trailing_nl) from a string
const re_extract_newlines = new RegExp(/^(\n*)((?:.|\n)*[^\n])?(\n*)$/);

// Escape miscellaneous special Markdown characters
const re_escape_misc_chars = /([\\&<`[>~=+|])/g;
const re_escape_misc_dash_sequences = /(\s|^)(-+(?:\s|$))/g;
const re_escape_misc_hashes = /(\s|^)(#{1,6}(?:\s|$))/g;
const re_escape_misc_list_items = /((?:\s|^)[0-9]{1,9})([.)](?:\s|$))/g;

// Find consecutive backtick sequences in a string
const re_backtick_runs = /`+/g;

function strip1_pre(text) {
    text = text.replace(re_pre_lstrip1, '');
    return text.replace(re_pre_rstrip1, '');
}

function strip_pre(text) {
    text = text.replace(re_pre_lstrip, '');
    return text.replace(re_pre_rstrip, '');
}

function chomp(text) {
    const prefix = (text && text.startsWith(' ')) ? ' ' : '';
    const suffix = (text && text.endsWith(' ')) ? ' ' : '';
    text = text.trim();
    return { prefix, suffix, text };
}

function should_remove_whitespace_inside(el) {
    if (!el || !el.tagName) return false;
    const tagName = el.tagName.toLowerCase();
    if (re_html_heading.test(tagName)) return true;
    return ['p', 'blockquote', 'article', 'div', 'section', 'ol', 'ul', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'].includes(tagName);
}

function should_remove_whitespace_outside(el) {
    return should_remove_whitespace_inside(el) || (el && el.tagName && el.tagName.toLowerCase() === 'pre');
}

function _is_block_content_element(el) {
    if (el.nodeType === Node.ELEMENT_NODE) { // ELEMENT_NODE
        return true;
    }
    if (el.nodeType === Node.COMMENT_NODE) { // COMMENT_NODE
        return false;
    }
    if (el.nodeType === Node.TEXT_NODE) { // TEXT_NODE
        return el.textContent.trim() !== '';
    }
    return false;
}

function _prev_block_content_sibling(el) {
    while (el) {
        el = el.previousSibling;
        if (el && _is_block_content_element(el)) {
            return el;
        }
    }
    return null;
}

function _next_block_content_sibling(el) {
    while (el) {
        el = el.nextSibling;
        if (el && _is_block_content_element(el)) {
            return el;
        }
    }
    return null;
}

class MarkdownConverter {
    constructor(options = {}) {
        const DefaultOptions = {
            autolinks: true,
            bullets: '*+-',
            code_language: '',
            code_language_callback: null,
            convert: null,
            default_title: false,
            escape_asterisks: true,
            escape_underscores: true,
            escape_misc: false,
            heading_style: UNDERLINED,
            keep_inline_images_in: [],
            newline_style: SPACES,
            strip: null,
            strip_document: STRIP,
            strip_pre: STRIP,
            strong_em_symbol: ASTERISK,
            sub_symbol: '',
            sup_symbol: '',
            table_infer_header: false,
            wrap: false,
            wrap_width: 80,
        };

        this.options = { ...DefaultOptions, ...options };

        if (this.options.strip && this.options.convert) {
            throw new Error('You may specify either tags to strip or tags to convert, but not both.');
        }

        // Cache for conversion methods
        this.convert_fn_cache = {};
    }

    convert(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return this.process_node(doc.body, new Set());
    }

    process_node(node, parent_tags) {
        if (node.nodeType === Node.TEXT_NODE) {
            return this.process_text(node, parent_tags);
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            return this.process_tag(node, parent_tags);
        }
        return ''; // Ignore comments, etc.
    }

    process_tag(node, parent_tags) {
        const tagName = node.tagName.toLowerCase();
        
        const should_remove_inside = should_remove_whitespace_inside(node);

        const _can_ignore = (el) => {
            if (el.nodeType === Node.ELEMENT_NODE) return false;
            if (el.nodeType === Node.COMMENT_NODE) return true;
            if (el.nodeType === Node.TEXT_NODE) {
                if (el.textContent.trim() !== '') return false;
                if (should_remove_inside && (!el.previousSibling || !el.nextSibling)) return true;
                if (should_remove_whitespace_outside(el.previousSibling) || should_remove_whitespace_outside(el.nextSibling)) return true;
                return false;
            }
            return true;
        };

        const children_to_convert = Array.from(node.childNodes).filter(el => !_can_ignore(el));

        const parent_tags_for_children = new Set(parent_tags);
        parent_tags_for_children.add(tagName);

        if (re_html_heading.test(tagName) || ['td', 'th'].includes(tagName)) {
            parent_tags_for_children.add('_inline');
        }

        if (['pre', 'code', 'kbd', 'samp'].includes(tagName)) {
            parent_tags_for_children.add('_noformat');
        }
        
        const child_strings = children_to_convert.map(el => this.process_node(el, parent_tags_for_children));
        const filtered_child_strings = child_strings.filter(s => s);

        let processed_child_strings = [];
        if (tagName === 'pre' || node.closest('pre')) {
            processed_child_strings = filtered_child_strings;
        } else {
            // Collapse newlines
            let updated_child_strings = [''];
            for (const child_string of filtered_child_strings) {
                const match = re_extract_newlines.exec(child_string);
                const [, leading_nl, content, trailing_nl] = match || ['', '', child_string, ''];

                if (updated_child_strings[updated_child_strings.length - 1] && leading_nl) {
                    const prev_trailing_nl = updated_child_strings.pop();
                    const num_newlines = Math.min(2, Math.max(prev_trailing_nl.length, leading_nl.length));
                    updated_child_strings.push('\n'.repeat(num_newlines));
                }
                
                if (leading_nl && !content && !trailing_nl) {
                     // only add if not already ending in NL
                    if (!updated_child_strings[updated_child_strings.length - 1].endsWith('\n')) {
                        updated_child_strings.push(leading_nl);
                    }
                } else {
                    updated_child_strings.push(leading_nl, content, trailing_nl);
                }
            }
            processed_child_strings = updated_child_strings;
        }

        let text = processed_child_strings.join('');

        const convert_fn = this.get_conv_fn(tagName);
        if (convert_fn) {
            text = convert_fn.call(this, node, text, parent_tags);
        }
        
        // Final document-level formatting
        if (tagName === 'body') {
            text = this.convert__document_(node, text, parent_tags);
        }

        return text;
    }
    
    convert__document_(el, text, parent_tags) {
        switch(this.options.strip_document) {
            case LSTRIP: return text.replace(/^\n+/, '');
            case RSTRIP: return text.replace(/\n+$/, '');
            case STRIP: return text.trim();
            default: return text;
        }
    }

    process_text(node, parent_tags) {
        let text = node.textContent || '';
        
        if (!parent_tags.has('pre')) {
            if (this.options.wrap) {
                text = text.replace(re_all_whitespace, ' ');
            } else {
                text = text.replace(re_newline_whitespace, '\n');
                text = text.replace(re_whitespace, ' ');
            }
        }
        
        if (!parent_tags.has('_noformat')) {
            text = this.escape(text, parent_tags);
        }
        
        if (should_remove_whitespace_outside(node.previousSibling) ||
            (should_remove_whitespace_inside(node.parentNode) && !node.previousSibling)) {
            text = text.replace(/^[\t \r\n]+/, '');
        }
        if (should_remove_whitespace_outside(node.nextSibling) ||
            (should_remove_whitespace_inside(node.parentNode) && !node.nextSibling)) {
            text = text.replace(/[\t \r\n]+$/, '');
        }

        return text;
    }

    get_conv_fn(tag_name) {
        if (this.convert_fn_cache[tag_name]) {
            return this.convert_fn_cache[tag_name];
        }

        if (!this.should_convert_tag(tag_name)) {
            this.convert_fn_cache[tag_name] = (el, text) => text;
            return this.convert_fn_cache[tag_name];
        }

        const convert_fn_name = `convert_${tag_name.replace(/[:-\[\]]/g, "_")}`;
        let convert_fn = this[convert_fn_name];

        if (convert_fn) {
            this.convert_fn_cache[tag_name] = convert_fn;
            return convert_fn;
        }

        const heading_match = tag_name.match(re_html_heading);
        if (heading_match) {
            const n = parseInt(heading_match[1], 10);
            convert_fn = (el, text, parent_tags) => this.convert_hN(n, el, text, parent_tags);
            this.convert_fn_cache[tag_name] = convert_fn;
            return convert_fn;
        }
        
        // Fallback for unknown tags is to just return the text
        this.convert_fn_cache[tag_name] = (el, text) => text;
        return this.convert_fn_cache[tag_name];
    }
    
    should_convert_tag(tag) {
        const { strip, convert } = this.options;
        if (strip) {
            return !strip.includes(tag);
        } else if (convert) {
            return convert.includes(tag);
        }
        return true;
    }

    escape(text, parent_tags) {
        if (!text) return '';
        if (this.options.escape_misc) {
            text = text.replace(re_escape_misc_chars, '\\$1');
            text = text.replace(re_escape_misc_dash_sequences, '$1\\$2');
            text = text.replace(re_escape_misc_hashes, '$1\\$2');
            text = text.replace(re_escape_misc_list_items, '$1\\$2');
        }
        if (this.options.escape_asterisks) {
            text = text.replace(/\*/g, '\\*');
        }
        if (this.options.escape_underscores) {
            text = text.replace(/_/g, '\\_');
        }
        return text;
    }

    underline(text, pad_char) {
        text = (text || '').trimEnd();
        return text ? `\n\n${text}\n${pad_char.repeat(text.length)}\n\n` : '';
    }
    
    // UTILITY for abstract_inline_conversion
    _abstract_inline_conversion(markup_fn) {
        return (el, text, parent_tags) => {
            const markup = markup_fn(this);
            if (parent_tags.has('_noformat')) return text;
            const { prefix, suffix, text: chomped_text } = chomp(text);
            if (!chomped_text) return '';
            return `${prefix}${markup}${chomped_text}${markup}${suffix}`;
        }
    }
    
    convert_a(el, text, parent_tags) {
        if (parent_tags.has('_noformat')) return text;
        const { prefix, suffix, text: chomped_text } = chomp(text);
        if (!chomped_text) return '';

        const href = el.getAttribute('href');
        const title = el.getAttribute('title');

        if (this.options.autolinks && text.replace(/\\_/g, '_') === href && !title && !this.options.default_title) {
            return `<${href}>`;
        }

        const title_part = title ? ` "${title.replace(/"/g, '\\"')}"` : (this.options.default_title && !title ? ` "${href}"` : '');
        return href ? `${prefix}[${chomped_text}](${href}${title_part})${suffix}` : chomped_text;
    }
    
    convert_b(el, text, parent_tags) {
        const symbol = this.options.strong_em_symbol.repeat(2);
        if (parent_tags.has('_noformat')) return text;
        const { prefix, suffix, text: chomped_text } = chomp(text);
        if (!chomped_text) return '';
        return `${prefix}${symbol}${chomped_text}${symbol}${suffix}`;
    }

    convert_blockquote(el, text, parent_tags) {
        text = (text || '').trim();
        if (parent_tags.has('_inline')) return ` ${text} `;
        if (!text) return "\n";
        
        const indented_text = text.replace(re_line_with_content, (match) => {
            return '> ' + (match || '');
        });

        return '\n' + indented_text + '\n\n';
    }

    convert_br(el, text, parent_tags) {
        if (parent_tags.has('_inline')) return ' ';
        return this.options.newline_style.toLowerCase() === BACKSLASH ? '\\\n' : '  \n';
    }

    convert_code(el, text, parent_tags) {
        if (parent_tags.has('_noformat')) return text;
        const { prefix, suffix, text: chomped_text } = chomp(text);
        if (!chomped_text) return '';
        
        const matches = chomped_text.match(re_backtick_runs) || [];
        const max_backticks = Math.max(0, ...matches.map(match => match.length));
        const delimiter = '`'.repeat(max_backticks + 1);
        const spaced_text = max_backticks > 0 ? ` ${chomped_text} ` : chomped_text;

        return `${prefix}${delimiter}${spaced_text}${delimiter}${suffix}`;
    }

    convert_del(el, text, parent_tags) {
        if (parent_tags.has('_noformat')) return text;
        const { prefix, suffix, text: chomped_text } = chomp(text);
        if (!chomped_text) return '';
        return `${prefix}~~${chomped_text}~~${suffix}`;
    }
    
    convert_div(el, text, parent_tags) {
        if (parent_tags.has('_inline')) return ` ${text.trim()} `;
        text = text.trim();
        return text ? `\n\n${text}\n\n` : '';
    }

    convert_em(el, text, parent_tags) {
        const symbol = this.options.strong_em_symbol;
        if (parent_tags.has('_noformat')) return text;
        const { prefix, suffix, text: chomped_text } = chomp(text);
        if (!chomped_text) return '';
        return `${prefix}${symbol}${chomped_text}${symbol}${suffix}`;
    }
    
    convert_hN(n, el, text, parent_tags) {
        if (parent_tags.has('_inline')) return text;
        n = Math.max(1, Math.min(6, n));
        
        const style = this.options.heading_style.toLowerCase();
        text = text.trim();

        if (style === UNDERLINED && n <= 2) {
            const line = (n === 1) ? '=' : '-';
            return this.underline(text, line);
        }
        
        text = text.replace(re_all_whitespace, ' ');
        const hashes = '#'.repeat(n);
        if (style === ATX_CLOSED) {
            return `\n\n${hashes} ${text} ${hashes}\n\n`;
        }
        return `\n\n${hashes} ${text}\n\n`;
    }
    
    convert_hr(el, text, parent_tags) { return '\n\n---\n\n'; }

    convert_img(el, text, parent_tags) {
        const alt = el.getAttribute('alt') || '';
        const src = el.getAttribute('src') || '';
        const title = el.getAttribute('title') || '';
        const title_part = title ? ` "${title.replace(/"/g, '\\"')}"` : '';

        if (parent_tags.has('_inline') && !this.options.keep_inline_images_in.includes(el.parentNode.tagName.toLowerCase())) {
            return alt;
        }
        return `![${alt}](${src}${title_part})`;
    }
    
    convert_video(el, text, parent_tags) {
        if (parent_tags.has('_inline') && !this.options.keep_inline_images_in.includes(el.parentNode.tagName.toLowerCase())) {
            return text;
        }
        let src = el.getAttribute('src') || '';
        if (!src) {
            const source_el = el.querySelector('source[src]');
            if (source_el) {
                src = source_el.getAttribute('src') || '';
            }
        }
        const poster = el.getAttribute('poster') || '';
        if (src && poster) {
            return `[![${text}](${poster})](${src})`;
        }
        if (src) {
            return `[${text}](${src})`;
        }
        if (poster) {
            return `![${text}](${poster})`;
        }
        return text;
    }

    convert_list(el, text, parent_tags) {
        const next_sibling = _next_block_content_sibling(el);
        const before_paragraph = next_sibling && !['ul', 'ol'].includes(next_sibling.tagName.toLowerCase());

        if (parent_tags.has('li')) {
            return '\n' + text.trimEnd();
        }
        return '\n\n' + text + (before_paragraph ? '\n' : '');
    }

    convert_li(el, text, parent_tags) {
        text = (text || '').trim();
        if (!text) return "\n";

        const parent = el.parentNode;
        let bullet = '';
        if (parent && parent.tagName.toLowerCase() === 'ol') {
            const start = parent.hasAttribute('start') ? parseInt(parent.getAttribute('start'), 10) : 1;
            const index = Array.from(parent.children).filter(child => child.tagName.toLowerCase() === 'li').indexOf(el);
            bullet = `${start + index}.`;
        } else {
            let depth = -1;
            let current = el;
            while(current) {
                if (current.tagName && current.tagName.toLowerCase() === 'ul') {
                    depth++;
                }
                current = current.parentNode;
            }
            const bullets = this.options.bullets;
            bullet = bullets[depth % bullets.length];
        }

        bullet += ' ';
        const bullet_indent = ' '.repeat(bullet.length);
        
        const indented_text = text.replace(re_line_with_content, (line) => {
            return line ? bullet_indent + line : '';
        });

        const final_text = bullet + indented_text.substring(bullet.length);
        return `${final_text}\n`;
    }

    convert_p(el, text, parent_tags) {
        if (parent_tags.has('_inline')) {
            return ` ${text.trim()} `;
        }
        text = text.trim();
        if (this.options.wrap) {
            const wrap_width = this.options.wrap_width;
            const lines = text.split('\n');
            const new_lines = lines.map(line => {
                line = line.trimStart();
                const trailing_space = line.match(/\s*$/)[0];
                const line_no_trailing = line.trimEnd();

                if (wrap_width) {
                    // Simple word wrap
                    const words = line_no_trailing.split(' ');
                    let wrapped_line = '';
                    let current_line = '';
                    words.forEach(word => {
                        if (current_line.length + word.length + 1 > wrap_width) {
                            wrapped_line += current_line.trimEnd() + '\n';
                            current_line = '';
                        }
                        current_line += word + ' ';
                    });
                    wrapped_line += current_line.trimEnd();
                    return wrapped_line + trailing_space;
                }
                return line;
            });
            text = new_lines.join('\n');
        }
        return text ? `\n\n${text}\n\n` : '';
    }

    convert_pre(el, text, parent_tags) {
        if (!text) return '';
        let code_language = this.options.code_language;
        if (this.options.code_language_callback) {
            code_language = this.options.code_language_callback(el) || code_language;
        }

        if (this.options.strip_pre === STRIP) {
            text = strip_pre(text);
        } else if (this.options.strip_pre === STRIP_ONE) {
            text = strip1_pre(text);
        }

        return `\n\n\`\`\`${code_language}\n${text}\n\`\`\`\n\n`;
    }
    
    convert_q(el, text, parent_tags) { return `"${text}"`; }
    convert_script(el, text, parent_tags) { return ''; }
    convert_style(el, text, parent_tags) { return ''; }

    convert_sub(el, text, parent_tags) {
        const symbol = this.options.sub_symbol;
        if (!symbol) return text;
        if (parent_tags.has('_noformat')) return text;
        const { prefix, suffix, text: chomped_text } = chomp(text);
        if (!chomped_text) return '';
        return `${prefix}${symbol}${chomped_text}${symbol}${suffix}`;
    }

    convert_sup(el, text, parent_tags) {
        const symbol = this.options.sup_symbol;
        if (!symbol) return text;
        if (parent_tags.has('_noformat')) return text;
        const { prefix, suffix, text: chomped_text } = chomp(text);
        if (!chomped_text) return '';
        return `${prefix}${symbol}${chomped_text}${symbol}${suffix}`;
    }

    convert_table(el, text, parent_tags) { return '\n\n' + text.trim() + '\n\n'; }
    convert_caption(el, text, parent_tags) { return text.trim() + '\n\n'; }
    convert_figcaption(el, text, parent_tags) { return '\n\n' + text.trim() + '\n\n'; }

    convert_td(el, text, parent_tags) {
        const colspan = el.hasAttribute('colspan') ? parseInt(el.getAttribute('colspan'), 10) : 1;
        return ' ' + text.trim().replace(/\n/g, ' ') + ' |'.repeat(colspan);
    }
    
    convert_tr(el, text, parent_tags) {
        const cells = Array.from(el.children);
        const is_first_row = !el.previousElementSibling;

        // Check if the row is a header row (in a <thead> or contains <th>)
        const is_headrow = cells.every(cell => cell.tagName.toLowerCase() === 'th') ||
                        (el.parentNode.tagName.toLowerCase() === 'thead' && el.parentNode.querySelectorAll('tr').length === 1);

        // Check if the table is missing an explicit header
        const parentTable = el.closest('table');
        const hasThead = parentTable && parentTable.querySelector('thead');
        const is_head_row_missing = (is_first_row && el.parentNode.tagName.toLowerCase() !== 'tbody') ||
                                    (is_first_row && el.parentNode.tagName.toLowerCase() === 'tbody' && !hasThead);
        
        // Determine if this row should be TREATED as the header
        const treat_as_header = is_headrow || (is_head_row_missing && this.options.table_infer_header);
        
        let underline = '';
        if (treat_as_header) {
            // If this is the header, create the separator line to go underneath it.
            const full_colspan = cells.reduce((acc, cell) => {
                return acc + (cell.hasAttribute('colspan') ? parseInt(cell.getAttribute('colspan'), 10) : 1);
            }, 0);
            underline = '| ' + Array(full_colspan).fill('---').join(' | ') + ' |\n';
        }

        // We no longer generate an 'overline'. The row is either content, or it's a header with an underline.
        return '|' + text + '\n' + underline;
    }
}

// Add aliases
MarkdownConverter.prototype.convert_strong = MarkdownConverter.prototype.convert_b;
MarkdownConverter.prototype.convert_i = MarkdownConverter.prototype.convert_em;
MarkdownConverter.prototype.convert_s = MarkdownConverter.prototype.convert_del;
MarkdownConverter.prototype.convert_kbd = MarkdownConverter.prototype.convert_code;
MarkdownConverter.prototype.convert_samp = MarkdownConverter.prototype.convert_code;
MarkdownConverter.prototype.convert_article = MarkdownConverter.prototype.convert_div;
MarkdownConverter.prototype.convert_section = MarkdownConverter.prototype.convert_div;
MarkdownConverter.prototype.convert_dl = MarkdownConverter.prototype.convert_div;
MarkdownConverter.prototype.convert_ol = MarkdownConverter.prototype.convert_list;
MarkdownConverter.prototype.convert_ul = MarkdownConverter.prototype.convert_list;
MarkdownConverter.prototype.convert_th = MarkdownConverter.prototype.convert_td;


// The main function
function markdownify(html, options = {}) {
    return new MarkdownConverter(options).convert(html);
}