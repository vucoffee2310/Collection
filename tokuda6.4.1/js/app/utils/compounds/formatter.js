/**
 * Compound Formatter - Minimal Version
 */

import { getCompoundMarkers } from './data-loader.js';

export const cleanupNestedBrackets = (text) => {
  if (!text) return text;
  
  const { open: COMPOUND_OPEN, close: COMPOUND_CLOSE } = getCompoundMarkers();
  
  let cleaned = text.replace(new RegExp(`${COMPOUND_OPEN}{2,}`, 'g'), COMPOUND_OPEN);
  cleaned = cleaned.replace(new RegExp(`${COMPOUND_CLOSE}{2,}`, 'g'), COMPOUND_CLOSE);
  
  const openCount = (cleaned.match(new RegExp(COMPOUND_OPEN, 'g')) || []).length;
  const closeCount = (cleaned.match(new RegExp(COMPOUND_CLOSE, 'g')) || []).length;
  
  if (openCount !== closeCount) {
    console.warn(`⚠️ Mismatched brackets: ${openCount} open, ${closeCount} close`);
  }
  
  return cleaned;
};

export const removeCompoundMarkers = (text) => {
  if (!text) return text;
  
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== '«' && char !== '»') {
      result += char;
    }
  }
  return result;
};