/**
 * Language Configuration
 * Central configuration for language-specific behaviors
 */

/**
 * Languages that don't use spaces between words
 * @type {Set<string>}
 */
export const NON_SPACED_LANGS = new Set([
  'ja',  // Japanese
  'th',  // Thai
  'zh',  // Chinese
  'lo',  // Lao
  'km'   // Khmer
]);

/**
 * Language patterns for detection
 */
export const LANGUAGE_PATTERNS = {
  // CJK (Chinese, Japanese, Korean)
  cjk: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/,
  
  // Japanese specific
  hiragana: /[\u3040-\u309F]/,
  katakana: /[\u30A0-\u30FF]/,
  
  // Southeast Asian
  thai: /[\u0E00-\u0E7F]/,
  lao: /[\u0E80-\u0EFF]/,
  khmer: /[\u1780-\u17FF]/,
  
  // Vietnamese
  vietnamese: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i,
  
  // Arabic
  arabic: /[\u0600-\u06FF]/,
  
  // Cyrillic
  cyrillic: /[\u0400-\u04FF]/
};

/**
 * Default language settings
 */
export const DEFAULT_LANG = 'en';

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = [
  'en', 'vi', 'ja', 'zh', 'th', 'lo', 'km', 'ko', 'ar', 'ru'
];

/**
 * Language metadata
 */
export const LANGUAGE_META = {
  en: { name: 'English', direction: 'ltr', hasSpaces: true },
  vi: { name: 'Vietnamese', direction: 'ltr', hasSpaces: true },
  ja: { name: 'Japanese', direction: 'ltr', hasSpaces: false },
  zh: { name: 'Chinese', direction: 'ltr', hasSpaces: false },
  th: { name: 'Thai', direction: 'ltr', hasSpaces: false },
  lo: { name: 'Lao', direction: 'ltr', hasSpaces: false },
  km: { name: 'Khmer', direction: 'ltr', hasSpaces: false },
  ko: { name: 'Korean', direction: 'ltr', hasSpaces: true },
  ar: { name: 'Arabic', direction: 'rtl', hasSpaces: true },
  ru: { name: 'Russian', direction: 'ltr', hasSpaces: true }
};

/**
 * Check if language uses spaces
 * @param {string} lang - Language code
 * @returns {boolean} - True if language uses spaces
 */
export const hasSpaces = (lang) => {
  return !NON_SPACED_LANGS.has(lang);
};

/**
 * Get language metadata
 * @param {string} lang - Language code
 * @returns {Object} - Language metadata
 */
export const getLanguageMeta = (lang) => {
  return LANGUAGE_META[lang] || LANGUAGE_META[DEFAULT_LANG];
};