/**
 * Compound Splitter - Split text treating compounds as single units
 */

import { extractCompounds } from './formatter.js';
import { isPunctuation } from './detector.js';
import { getCompoundMarkers } from './data-loader.js';

/**
 * Count words treating compounds as single units
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