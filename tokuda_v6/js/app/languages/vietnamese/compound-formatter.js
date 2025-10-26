/**
 * Vietnamese Compound Formatter
 * Formats compounds for display and analysis
 */

import { COMPOUND_OPEN, COMPOUND_CLOSE } from './compound-merger.js';
import { isPunctuation } from './normalizer.js';

/**
 * Compound pattern (global)
 */
const COMPOUND_PATTERN_GLOBAL = /«([^»]+)»/g;

/**
 * Extraction cache
 * @type {Map<string, Array>}
 */
const extractionCache = new Map();
const MAX_EXTRACTION_CACHE_SIZE = 100;

/**
 * Extract compound words with their positions
 * @param {string} text - Text to analyze
 * @returns {Array<Object>} - Array of parts
 * 
 * @example
 * extractCompounds("Tôi «hoạt động» hàng ngày")
 * // => [
 * //   { text: "Tôi ", isCompound: false, start: 0, end: 4 },
 * //   { text: "hoạt động", isCompound: true, start: 4, end: 18 },
 * //   { text: " hàng ngày", isCompound: false, start: 18, end: 29 }
 * // ]
 */
export const extractCompounds = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Check cache
  if (extractionCache.has(text)) {
    return extractionCache.get(text);
  }
  
  const parts = [];
  let lastIndex = 0;
  
  // Reset global regex
  COMPOUND_PATTERN_GLOBAL.lastIndex = 0;
  
  let match;
  while ((match = COMPOUND_PATTERN_GLOBAL.exec(text)) !== null) {
    // Add text before compound
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
    
    // Add compound
    parts.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
      isCompound: true
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
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
  
  // Cache result with size limit
  if (extractionCache.size >= MAX_EXTRACTION_CACHE_SIZE) {
    extractionCache.clear();
  }
  
  extractionCache.set(text, parts);
  return parts;
};

/**
 * Count words treating compounds as single units
 * @param {string} text - Text to count
 * @returns {number} - Word count
 * 
 * @example
 * countWordsWithCompounds("Tôi «hoạt động»")
 * // => 2 (not 3)
 */
export const countWordsWithCompounds = (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return 0;
  }
  
  const parts = extractCompounds(text);
  let count = 0;
  
  for (const part of parts) {
    if (part.isCompound) {
      count += 1; // Compound = 1 word
    } else {
      // Count words in non-compound text
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
 * @param {string} text - Text to split
 * @returns {Array<string>} - Array of words
 * 
 * @example
 * splitIntoWordsWithCompounds("Tôi «hoạt động»")
 * // => ["Tôi", "«hoạt động»"]
 */
export const splitIntoWordsWithCompounds = (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return [];
  }
  
  const parts = extractCompounds(text);
  const words = [];
  
  for (const part of parts) {
    if (part.isCompound) {
      // Keep markers for compound
      words.push(`${COMPOUND_OPEN}${part.text}${COMPOUND_CLOSE}`);
    } else {
      // Split non-compound text
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
 * Format text for HTML display with compound highlighting
 * @param {string} text - Text to format
 * @returns {string} - HTML string
 * 
 * @example
 * formatCompoundsForDisplay("Tôi «hoạt động»")
 * // => 'Tôi <span class="compound-word">hoạt động</span>'
 */
export const formatCompoundsForDisplay = (text) => {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
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
 * Get compound statistics from text
 * @param {string} text - Text to analyze
 * @returns {Object} - Statistics
 */
export const getCompoundStats = (text) => {
  const parts = extractCompounds(text);
  const compounds = parts.filter(p => p.isCompound);
  
  return {
    totalWords: countWordsWithCompounds(text),
    totalCompounds: compounds.length,
    compounds: compounds.map(c => c.text),
    compoundPercentage: parts.length > 0 
      ? ((compounds.length / parts.length) * 100).toFixed(1) + '%'
      : '0%'
  };
};

/**
 * Clear extraction cache
 */
export const clearExtractionCache = () => {
  extractionCache.clear();
  console.log('🧹 Cleared compound extraction cache');
};

/**
 * Escape HTML
 * @private
 */
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};