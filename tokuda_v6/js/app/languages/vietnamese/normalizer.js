/**
 * Vietnamese Text Normalizer
 * Handles Unicode normalization and text cleaning
 */

/**
 * Normalization cache
 * @type {Map<string, string>}
 */
const normalizationCache = new Map();
const MAX_CACHE_SIZE = 1000;

/**
 * Normalize Vietnamese text for compound matching
 * CRITICAL: Uses Unicode NFC (precomposed form)
 * 
 * @param {string} text - Text to normalize
 * @returns {string} - Normalized text
 * 
 * @example
 * normalizeVietnamese("Hoạt  Động")
 * // => "hoạt động"
 */
export const normalizeVietnamese = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Check cache
  if (normalizationCache.has(text)) {
    return normalizationCache.get(text);
  }
  
  // CRITICAL: Normalize Unicode to NFC (precomposed form)
  // This ensures "ý" as combining diacritics matches "ý" as precomposed character
  const normalized = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  // Cache result with size limit
  if (normalizationCache.size >= MAX_CACHE_SIZE) {
    // Simple eviction: clear entire cache
    normalizationCache.clear();
  }
  
  normalizationCache.set(text, normalized);
  return normalized;
};

/**
 * Normalize array of words
 * @param {Array<string>} words - Words to normalize
 * @returns {Array<string>} - Normalized words
 */
export const normalizeWords = (words) => {
  if (!Array.isArray(words)) {
    return [];
  }
  
  return words.map(word => normalizeVietnamese(word));
};

/**
 * Check if text is pure punctuation
 * @param {string} text - Text to check
 * @returns {boolean} - True if only punctuation
 */
export const isPunctuation = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Use Unicode property escape for non-letter/non-number check
  return /^[^\p{L}\p{N}]+$/u.test(text);
};

/**
 * Remove diacritics from Vietnamese text
 * @param {string} text - Text to process
 * @returns {string} - Text without diacritics
 */
export const removeDiacritics = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const map = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
    'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
    'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
    'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
    'đ': 'd'
  };
  
  return text.split('').map(char => map[char] || char).join('');
};

/**
 * Clear normalization cache
 */
export const clearNormalizationCache = () => {
  normalizationCache.clear();
  console.log('🧹 Cleared Vietnamese normalization cache');
};

/**
 * Get cache stats
 * @returns {Object} - Cache statistics
 */
export const getNormalizationCacheStats = () => {
  return {
    size: normalizationCache.size,
    maxSize: MAX_CACHE_SIZE,
    usage: ((normalizationCache.size / MAX_CACHE_SIZE) * 100).toFixed(1) + '%'
  };
};