/**
 * HTML Encoder Utility
 * Encode/decode HTML entities safely
 */

/**
 * Encode HTML special characters
 * @param {string} text - Text to encode
 * @returns {string} - HTML-safe text
 */
export const encodeHTML = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Decode HTML entities
 * @param {string} html - HTML string
 * @returns {string} - Decoded text
 */
export const decodeHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

/**
 * Strip HTML tags
 * @param {string} html - HTML string
 * @returns {string} - Plain text
 */
export const stripHTML = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

/**
 * Escape HTML for safe insertion
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export const escapeHTML = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, char => map[char]);
};