/**
 * Compound Splitter - Split text treating compounds as single units
 */

import { extractCompounds } from './formatter.js';
import { isPunctuation } from './detector.js';
import { getCompoundMarkers } from './data-loader.js';

/**
 * Count words treating compounds as single units
 * @param {string} text - Vietnamese text with «compound» markers
 * @returns {number} Word count
 */
export const countWordsWithCompounds = (text) => {
  if (!text || !text.trim()) return 0;
  
  const parts = extractCompounds(text);
  let count = 0;
  
  for (const part of parts) {
    if (part.isCompound) {
      count += 1;
    } else {
      const tokens = part.text.trim().split(/\s+/);
      for (const token of tokens) {
        if (token.length > 0 && !isPunctuation(token)) {
          count++;
        }
      }
    }
  }
  
  return count;
};

/**
 * Split text into words treating compounds as single units
 * @param {string} text - Vietnamese text with «compound» markers
 * @returns {string[]} Array of words (compounds kept with markers)
 */
export const splitIntoWordsWithCompounds = (text) => {
  if (!text || !text.trim()) return [];
  
  const { open: COMPOUND_OPEN, close: COMPOUND_CLOSE } = getCompoundMarkers();
  const parts = extractCompounds(text);
  const words = [];
  
  for (const part of parts) {
    if (part.isCompound) {
      words.push(`${COMPOUND_OPEN}${part.text}${COMPOUND_CLOSE}`);
    } else {
      const tokens = part.text.trim().split(/\s+/);
      for (const token of tokens) {
        if (token.length > 0 && !isPunctuation(token)) {
          words.push(token);
        }
      }
    }
  }
  
  return words;
};

/**
 * Validate consistency between count and split
 * @param {string} text - Text to validate
 * @returns {boolean} True if consistent
 */
export const validateWordCountConsistency = (text) => {
  if (!text || !text.trim()) return true;
  
  const count = countWordsWithCompounds(text);
  const split = splitIntoWordsWithCompounds(text);
  const splitCount = split.length;
  
  if (count !== splitCount) {
    console.error(`❌ Word count inconsistency:`, {
      text: text.substring(0, 100),
      countWordsWithCompounds: count,
      splitIntoWordsWithCompounds: splitCount,
      difference: Math.abs(count - splitCount)
    });
    return false;
  }
  
  return true;
};