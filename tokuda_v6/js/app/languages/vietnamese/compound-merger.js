/**
 * Vietnamese Compound Merger
 * Merges compound words in text with markers «»
 */

import { isCompound, getCompoundRegex } from './compound-matcher.js';

/**
 * Compound markers (guillemets)
 */
export const COMPOUND_OPEN = '«';
export const COMPOUND_CLOSE = '»';

/**
 * Word extraction pattern (Unicode-aware)
 */
const WORD_PATTERN = /[\p{L}]+/gu;

/**
 * Merge compound words in Vietnamese text
 * @param {string} text - Text to process
 * @returns {string} - Text with compounds marked
 * 
 * @example
 * mergeVietnameseCompounds("Tôi hoạt động mỗi ngày")
 * // => "Tôi «hoạt động» mỗi ngày"
 */
export const mergeVietnameseCompounds = (text) => {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  // Extract all words in single pass
  WORD_PATTERN.lastIndex = 0;
  const words = [];
  let match;
  
  while ((match = WORD_PATTERN.exec(text)) !== null) {
    words.push(match[0]);
  }
  
  if (words.length < 2) {
    return text; // Early exit
  }
  
  // Find compounds
  const compounds = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    if (isCompound(words[i], words[i + 1])) {
      compounds.push({
        word1: words[i],
        word2: words[i + 1],
        text: `${words[i]} ${words[i + 1]}`
      });
      i++; // Skip next word (already part of compound)
    }
  }
  
  if (compounds.length === 0) {
    return text; // Early exit
  }
  
  // Sort by length (longest first) to avoid partial replacements
  compounds.sort((a, b) => b.text.length - a.text.length);
  
  // Replace compounds using cached regex patterns
  let result = text;
  
  for (const compound of compounds) {
    const pattern = getCompoundRegex(compound.word1, compound.word2);
    pattern.lastIndex = 0; // Reset regex state
    
    result = result.replace(pattern, (match) => {
      return `${COMPOUND_OPEN}${match}${COMPOUND_CLOSE}`;
    });
  }
  
  return result;
};

/**
 * Merge compounds in array of text segments
 * @param {Array<string>} segments - Array of text segments
 * @returns {Array<string>} - Segments with compounds merged
 */
export const mergeCompoundsInSegments = (segments) => {
  if (!Array.isArray(segments)) {
    return [];
  }
  
  return segments.map(segment => mergeVietnameseCompounds(segment));
};

/**
 * Remove compound markers from text
 * @param {string} text - Text with markers
 * @returns {string} - Text without markers
 * 
 * @example
 * removeCompoundMarkers("Tôi «hoạt động»")
 * // => "Tôi hoạt động"
 */
export const removeCompoundMarkers = (text) => {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  // Character-by-character filtering (faster than regex for this)
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== COMPOUND_OPEN && char !== COMPOUND_CLOSE) {
      result += char;
    }
  }
  
  return result;
};

/**
 * Check if text contains compound markers
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains markers
 */
export const hasCompoundMarkers = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  return text.includes(COMPOUND_OPEN) || text.includes(COMPOUND_CLOSE);
};

/**
 * Get compound marker characters
 * @returns {Object} - Marker characters
 */
export const getCompoundMarkers = () => ({
  open: COMPOUND_OPEN,
  close: COMPOUND_CLOSE
});