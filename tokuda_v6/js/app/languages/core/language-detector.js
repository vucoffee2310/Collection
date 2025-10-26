/**
 * Language Detector
 * Auto-detect language from text content
 */

import { LANGUAGE_PATTERNS, DEFAULT_LANG } from '../../utils/config/language-config.js';

/**
 * Detect language from text
 * @param {string} text - Text to analyze
 * @returns {string} - Detected language code
 * 
 * @example
 * detectLanguage("Xin chào") // => "vi"
 * detectLanguage("こんにちは") // => "ja"
 * detectLanguage("Hello") // => "en"
 */
export const detectLanguage = (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return DEFAULT_LANG;
  }
  
  // Check patterns in priority order
  
  // Thai (highest priority for SEA languages)
  if (LANGUAGE_PATTERNS.thai.test(text)) {
    return 'th';
  }
  
  // Lao
  if (LANGUAGE_PATTERNS.lao.test(text)) {
    return 'lo';
  }
  
  // Khmer
  if (LANGUAGE_PATTERNS.khmer.test(text)) {
    return 'km';
  }
  
  // Vietnamese (check before CJK to avoid false positives)
  if (LANGUAGE_PATTERNS.vietnamese.test(text)) {
    return 'vi';
  }
  
  // CJK languages
  if (LANGUAGE_PATTERNS.cjk.test(text)) {
    // Distinguish Japanese from Chinese
    if (LANGUAGE_PATTERNS.hiragana.test(text) || LANGUAGE_PATTERNS.katakana.test(text)) {
      return 'ja';
    }
    // Default to Chinese
    return 'zh';
  }
  
  // Arabic
  if (LANGUAGE_PATTERNS.arabic.test(text)) {
    return 'ar';
  }
  
  // Cyrillic (Russian, etc.)
  if (LANGUAGE_PATTERNS.cyrillic.test(text)) {
    return 'ru';
  }
  
  // Default to English
  return DEFAULT_LANG;
};

/**
 * Detect dominant language from text (statistical approach)
 * @param {string} text - Text to analyze
 * @returns {Object} - Language stats
 * 
 * @example
 * detectLanguageStats("Hello xin chào world")
 * // => { dominant: "en", stats: { en: 66%, vi: 33% } }
 */
export const detectLanguageStats = (text) => {
  if (!text || typeof text !== 'string') {
    return { dominant: DEFAULT_LANG, stats: {} };
  }
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const stats = {};
  
  words.forEach(word => {
    const lang = detectLanguage(word);
    stats[lang] = (stats[lang] || 0) + 1;
  });
  
  // Convert to percentages
  const total = words.length;
  const percentages = {};
  
  Object.entries(stats).forEach(([lang, count]) => {
    percentages[lang] = ((count / total) * 100).toFixed(1) + '%';
  });
  
  // Find dominant language
  const dominant = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || DEFAULT_LANG;
  
  return {
    dominant,
    stats: percentages,
    wordCount: total
  };
};

/**
 * Check if text contains specific language
 * @param {string} text - Text to check
 * @param {string} lang - Language code to check for
 * @returns {boolean} - True if language detected
 */
export const containsLanguage = (text, lang) => {
  if (!text || !lang) return false;
  
  const pattern = LANGUAGE_PATTERNS[lang];
  if (!pattern) return false;
  
  return pattern.test(text);
};