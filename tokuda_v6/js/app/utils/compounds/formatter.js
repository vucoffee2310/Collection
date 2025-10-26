/**
 * Compound Formatter - Format and extract compounds for display
 */

import { getCompoundMarkers } from './data-loader.js';

const compoundExtractionCache = new Map();

/**
 * Extract compound words with their positions
 */
export const extractCompounds = (text) => {
  if (!text) return [];
  
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