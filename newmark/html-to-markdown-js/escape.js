// html-to-markdown-js/escape.js
import { ESCAPE_MARKER } from './constants.js';

// Characters that have special meaning in Markdown
const MARKDOWN_CHARS = /[\\`*_{}[\]()#+\-.!|~]/g;

/**
 * First pass: Mark all potential markdown characters with a placeholder.
 * @param {string} text
 * @returns {string}
 */
export function escapeText(text) {
  return text.replace(MARKDOWN_CHARS, (char) => ESCAPE_MARKER + char);
}

const UNESCAPE_RULES = [
    // Headings
    { regex: /^(#{1,6} )/gm, replacement: (match) => match.replace(/\\#/g, '#') },
    // Unordered lists
    { regex: /^([-+*] )/gm, replacement: (match) => match.replace(/\\([-+*])/g, '$1') },
    // Ordered lists
    { regex: /^(\d+\. )/gm, replacement: (match) => match.replace(/\\\./g, '.') },
    // Blockquotes
    { regex: /^(> )/gm, replacement: (match) => match.replace(/\\>/g, '>') },
    // Fenced code blocks
    { regex: /^(```|~~~)/gm, replacement: (match) => match.replace(/\\([`~])/g, '$1') },
    // Images
    { regex: /!\[(.*?)\]\((.*?)\)/g, replacement: (match, p1, p2) => `![${p1.replace(/\\([\][])/g, '$1')}](${p2})`},
    // Links
    { regex: /\[(.*?)\]\((.*?)\)/g, replacement: (match, p1, p2) => `[${p1.replace(/\\([\][])/g, '$1')}](${p2})`},
];


/**
 * Second pass: Remove placeholders where escaping is needed, and add a backslash.
 * Un-escape characters that are part of valid Markdown syntax.
 * @param {string} markdown
 * @returns {string}
 */
export function unescapeMarkdown(markdown) {
  // First, apply rules to un-escape valid markdown syntax
  for (const rule of UNESCAPE_RULES) {
    markdown = markdown.replace(rule.regex, rule.replacement);
  }

  // Then, escape everything else that's still marked
  return markdown.replace(new RegExp(ESCAPE_MARKER + '(\S)', 'g'), '\\$1');
}

/**
 * Final cleanup: remove any leftover markers.
 * @param {string} markdown
 * @returns {string}
 */
export function cleanupEscapeMarkers(markdown) {
    return markdown.replace(new RegExp(ESCAPE_MARKER, 'g'), '');
}

/**
 * Escapes characters in a link URL.
 * @param {string} url
 * @returns {string}
 */
export function escapeUrl(url) {
    return url.replace(/([()])/g, '\\$1');
}