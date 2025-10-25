/**
 * DOM Utilities
 * Helper functions for DOM manipulation and queries
 */

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @returns {Element|null} - Selected element
 */
export const $ = (selector) => document.querySelector(selector);

/**
 * Get current YouTube video ID from URL
 * @returns {string|null} - Video ID or null
 */
export const getVideoId = () => new URL(location.href).searchParams.get('v');

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<void>}
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('✅ Copied to clipboard');
  } catch {
    // Fallback for older browsers
    const textarea = Object.assign(document.createElement('textarea'), { 
      value: text, 
      style: 'position:fixed;opacity:0' 
    });
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

/**
 * Generate combinations of array elements
 * @param {Array} arr - Input array
 * @param {number} size - Combination size
 * @returns {Array<Array>} - Array of combinations
 */
export const combinations = (arr, size) => {
  if (size > arr.length || !arr.length) return [];
  if (size === arr.length) return [arr];
  if (size === 1) return arr.map(x => [x]);
  
  const result = [];
  const bt = (start, combo) => {
    if (combo.length === size) return result.push([...combo]);
    for (let i = start; i <= arr.length - (size - combo.length); i++) {
      bt(i + 1, [...combo, arr[i]]);
    }
  };
  bt(0, []);
  return result;
};

/**
 * Cache for Intl.Segmenter instances (performance optimization)
 */
const segmenterCache = new Map();

/**
 * Get or create cached segmenter instance
 * @param {string} lang - Language code
 * @param {string} granularity - Segmentation granularity
 * @returns {Intl.Segmenter|null} - Segmenter instance or null
 */
const getSegmenter = (lang, granularity) => {
  const key = `${lang}-${granularity}`;
  if (!segmenterCache.has(key)) {
    if (typeof Intl?.Segmenter === 'function') {
      try {
        segmenterCache.set(key, new Intl.Segmenter(lang, { granularity }));
      } catch {
        segmenterCache.set(key, null);
      }
    } else {
      segmenterCache.set(key, null);
    }
  }
  return segmenterCache.get(key);
};

/**
 * Count words in text (handles non-spaced languages)
 * @param {string} text - Input text
 * @param {string} lang - Language code
 * @returns {number} - Word count
 */
export const countWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return 0;
  
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, 'word');
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        return segments.filter(s => s.isWordLike).length;
      } catch {
        return text.replace(/\s+/g, '').length;
      }
    }
    return text.replace(/\s+/g, '').length;
  }
  
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Split text into words (unified function for consistency)
 * @param {string} text - Input text
 * @param {string} lang - Language code
 * @returns {Array<string>} - Array of words
 */
export const splitTextIntoWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return [];
  
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, 'word');
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        return segments.filter(s => s.isWordLike).map(s => s.segment);
      } catch {
        return text.split('');
      }
    }
    return text.split('');
  }
  
  return text.trim().split(/\s+/).filter(w => w.length > 0);
};

/**
 * Split translation by word ratio across utterances
 * @param {string} translationText - Complete translation
 * @param {Array} utterances - Array of utterance objects
 * @param {string} lang - Language code
 * @returns {Array<string>} - Array of translation portions
 */
export const splitTranslationByWordRatio = (translationText, utterances, lang = 'vi') => {
  if (!translationText || !utterances || utterances.length === 0) {
    return utterances.map(() => '');
  }

  const totalWordLength = utterances.reduce((sum, utt) => sum + (utt.wordLength || 0), 0);
  
  if (totalWordLength === 0) {
    return utterances.map(() => '');
  }

  const translationWords = splitTextIntoWords(translationText, lang);
  const totalTranslationWords = translationWords.length;
  
  if (totalTranslationWords === 0) {
    return utterances.map(() => '');
  }

  const elementTranslations = [];
  let currentIndex = 0;

  utterances.forEach((utt, idx) => {
    const ratio = utt.wordLength / totalWordLength;
    let wordsToTake = Math.round(totalTranslationWords * ratio);
    
    // Bounds checking
    if (currentIndex + wordsToTake > translationWords.length) {
      wordsToTake = translationWords.length - currentIndex;
    }
    
    // Last utterance gets all remaining words
    if (idx === utterances.length - 1) {
      wordsToTake = translationWords.length - currentIndex;
    }

    const portion = translationWords.slice(currentIndex, currentIndex + wordsToTake).join(' ');
    elementTranslations.push(portion.trim());
    
    currentIndex += wordsToTake;
  });

  return elementTranslations;
};