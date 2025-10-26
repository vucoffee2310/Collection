/**
 * Text Splitter Utility
 * Splits text at middle point (handles non-spaced languages)
 */

import { getSegmenter } from '../language-config.js';

/**
 * Split text at approximate middle
 * Handles non-spaced languages using Intl.Segmenter
 * 
 * @param {string} text - Text to split
 * @param {string} lang - Language code (e.g., 'ja', 'th', 'en')
 * @returns {{before: string, after: string}} - Split result
 * 
 * @example
 * splitTextAtMiddle("Hello world", "en")
 * // => { before: "Hello", after: "world" }
 */
export const splitTextAtMiddle = (text, lang = 'en') => {
  if (!text || typeof text !== 'string') {
    return { before: '', after: '' };
  }
  
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  // Use grapheme splitting for non-spaced languages
  if (NON_SPACED_LANGS.has(lang)) {
    return splitByGraphemes(text, lang);
  }
  
  // Use word splitting for spaced languages
  return splitByWords(text);
};

/**
 * Split text by grapheme clusters (for CJK, Thai, etc.)
 * @private
 */
const splitByGraphemes = (text, lang) => {
  const segmenter = getSegmenter(lang, 'grapheme');
  
  if (!segmenter) {
    // Fallback: simple character split
    const mid = Math.floor(text.length / 2);
    return {
      before: text.slice(0, mid).trim(),
      after: text.slice(mid).trim()
    };
  }
  
  try {
    const segments = Array.from(segmenter.segment(text));
    const graphemes = segments.map(s => s.segment);
    
    if (graphemes.length <= 1) {
      return { before: text, after: '' };
    }
    
    const mid = Math.floor(graphemes.length / 2);
    
    return {
      before: graphemes.slice(0, mid).join('').trim(),
      after: graphemes.slice(mid).join('').trim()
    };
  } catch (err) {
    console.warn('Grapheme splitting failed:', err);
    const mid = Math.floor(text.length / 2);
    return {
      before: text.slice(0, mid).trim(),
      after: text.slice(mid).trim()
    };
  }
};

/**
 * Split text by words (for English, Vietnamese, etc.)
 * @private
 */
const splitByWords = (text) => {
  const mid = Math.floor(text.length / 2);
  
  // Find nearest space after mid
  const afterSpace = text.indexOf(' ', mid);
  
  // Find nearest space before mid
  const beforeSpace = text.lastIndexOf(' ', mid);
  
  // Choose closest space
  let splitIndex;
  
  if (afterSpace === -1 && beforeSpace === -1) {
    // No spaces, split at mid
    splitIndex = mid;
  } else if (afterSpace === -1) {
    // Only space before
    splitIndex = beforeSpace + 1;
  } else if (beforeSpace === -1) {
    // Only space after
    splitIndex = afterSpace + 1;
  } else {
    // Choose closer space
    const distBefore = mid - beforeSpace;
    const distAfter = afterSpace - mid;
    splitIndex = (distBefore <= distAfter ? beforeSpace : afterSpace) + 1;
  }
  
  return {
    before: text.slice(0, splitIndex).trim(),
    after: text.slice(splitIndex).trim()
  };
};

/**
 * Split text into N roughly equal parts
 * @param {string} text - Text to split
 * @param {number} parts - Number of parts
 * @param {string} lang - Language code
 * @returns {Array<string>} - Array of text parts
 */
export const splitTextIntoParts = (text, parts, lang = 'en') => {
  if (parts <= 1) return [text];
  
  const result = [];
  let remaining = text;
  
  for (let i = 0; i < parts - 1; i++) {
    const { before, after } = splitTextAtMiddle(remaining, lang);
    result.push(before);
    remaining = after;
  }
  
  result.push(remaining);
  return result.filter(p => p.length > 0);
};