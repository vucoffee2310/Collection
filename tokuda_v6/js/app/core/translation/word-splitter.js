/**
 * Word Splitter
 * Language-aware word splitting with compound support
 */

import { 
  splitIntoWordsWithCompounds 
} from '../../languages/vietnamese/compound-formatter.js';
import { extractWords } from '../../languages/core/segmenter-factory.js';
import { NON_SPACED_LANGS } from '../../utils/config/language-config.js';

/**
 * Split text into words (language-aware)
 * THE CANONICAL word splitting function
 * 
 * @param {string} text - Text to split
 * @param {string} lang - Language code
 * @returns {Array<string>} - Array of words
 */
export const splitTextIntoWords = (text, lang = 'en') => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return [];
  }
  
  // Vietnamese with compounds (check for guillemets)
  if (lang === 'vi' && (text.includes('«') || text.includes('»'))) {
    return splitIntoWordsWithCompounds(text);
  }
  
  // Non-spaced languages (CJK, Thai, etc.)
  if (NON_SPACED_LANGS.has(lang)) {
    const words = extractWords(text, lang);
    if (words.length > 0) {
      return words;
    }
    // Fallback: character split
    return text.split('');
  }
  
  // Spaced languages
  return text.trim()
    .split(/\s+/)
    .filter(w => w.length > 0);
};

/**
 * Count words using consistent splitting logic
 * CRITICAL: Ensures consistency between splitting and counting
 * 
 * @param {string} text - Text to count
 * @param {string} lang - Language code
 * @returns {number} - Word count
 */
export const countWordsConsistent = (text, lang = 'en') => {
  return splitTextIntoWords(text, lang).length;
};

/**
 * Split text into sentences (language-aware)
 * @param {string} text - Text to split
 * @param {string} lang - Language code
 * @returns {Array<string>} - Array of sentences
 */
export const splitIntoSentences = (text, lang = 'en') => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return [];
  }
  
  // Simple sentence splitting (can be enhanced with Intl.Segmenter)
  const sentencePattern = /[.!?]+\s+/g;
  const sentences = text.split(sentencePattern)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
};

/**
 * Get word at index
 * @param {string} text - Text
 * @param {number} index - Word index
 * @param {string} lang - Language code
 * @returns {string|null} - Word or null
 */
export const getWordAt = (text, index, lang = 'en') => {
  const words = splitTextIntoWords(text, lang);
  return words[index] || null;
};

/**
 * Get word range
 * @param {string} text - Text
 * @param {number} start - Start index
 * @param {number} end - End index (exclusive)
 * @param {string} lang - Language code
 * @returns {string} - Joined words
 */
export const getWordRange = (text, start, end, lang = 'en') => {
  const words = splitTextIntoWords(text, lang);
  return words.slice(start, end).join(' ');
};