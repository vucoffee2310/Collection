/**
 * Compound Formatter - Format and extract compounds for display
 */

import { getCompoundMarkers } from './data-loader.js';

const compoundExtractionCache = new Map();

/**
 * Clean up multiple nested brackets (safety fix)
 */
export const cleanupNestedBrackets = (text) => {
  if (!text) return text;
  
  const { open: COMPOUND_OPEN, close: COMPOUND_CLOSE } = getCompoundMarkers();
  
  // Replace multiple consecutive open brackets with single one
  let cleaned = text.replace(new RegExp(`${COMPOUND_OPEN}{2,}`, 'g'), COMPOUND_OPEN);
  
  // Replace multiple consecutive close brackets with single one
  cleaned = cleaned.replace(new RegExp(`${COMPOUND_CLOSE}{2,}`, 'g'), COMPOUND_CLOSE);
  
  // Remove mismatched brackets (open without close or vice versa)
  const openCount = (cleaned.match(new RegExp(COMPOUND_OPEN, 'g')) || []).length;
  const closeCount = (cleaned.match(new RegExp(COMPOUND_CLOSE, 'g')) || []).length;
  
  if (openCount !== closeCount) {
    console.warn(`⚠️ Mismatched brackets: ${openCount} open, ${closeCount} close`);
  }
  
  return cleaned;
};

/**
 * Extract compound words with their positions
 */
export const extractCompounds = (text) => {
  if (!text) return [];
  
  // ✅ Clean up nested brackets first
  text = cleanupNestedBrackets(text);
  
  if (compoundExtractionCache.has(text)) {
    return compoundExtractionCache.get(text);
  }
  
  const { pattern: COMPOUND_PATTERN_GLOBAL } = getCompoundMarkers();
  const parts = [];
  let lastIndex = 0;
  
  COMPOUND_PATTERN_GLOBAL.lastIndex = 0;
  
  let match;
  while ((match = COMPOUND_PATTERN_GLOBAL.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText.trim()) {
        parts.push({
          text: beforeText,
          start: lastIndex,
          end: match.index,
          isCompound: false
        });
      }
    }
    
    parts.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
      isCompound: true
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({
        text: remainingText,
        start: lastIndex,
        end: text.length,
        isCompound: false
      });
    }
  }
  
  if (compoundExtractionCache.size > 100) {
    compoundExtractionCache.clear();
  }
  compoundExtractionCache.set(text, parts);
  
  return parts;
};

/**
 * Remove compound markers from text
 */
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

/**
 * Format text for display with compound highlighting
 */
export const formatCompoundsForDisplay = (text) => {
  if (!text) return text;
  
  // ✅ Clean up nested brackets first
  text = cleanupNestedBrackets(text);
  
  const parts = extractCompounds(text);
  const htmlParts = [];
  
  for (const part of parts) {
    if (part.isCompound) {
      htmlParts.push(
        `<span class="compound-word" title="Compound word (merged for accuracy)">`,
        escapeHtml(part.text),
        `</span>`
      );
    } else {
      htmlParts.push(escapeHtml(part.text));
    }
  }
  
  return htmlParts.join('');
};

/**
 * Clear extraction cache
 */
export const clearExtractionCache = () => {
  compoundExtractionCache.clear();
};

// Helper
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};