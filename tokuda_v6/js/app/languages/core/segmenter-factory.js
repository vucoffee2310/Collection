/**
 * Segmenter Factory
 * Cached Intl.Segmenter instances for text segmentation
 */

/**
 * Cache for segmenter instances
 * Key format: "lang-granularity"
 * @type {Map<string, Intl.Segmenter|null>}
 */
const segmenterCache = new Map();

/**
 * Check if Intl.Segmenter is supported
 * @returns {boolean} - True if supported
 */
export const isSegmenterSupported = () => {
  return typeof Intl?.Segmenter === 'function';
};

/**
 * Get or create cached segmenter instance
 * @param {string} lang - Language code (e.g., 'ja', 'th', 'en')
 * @param {string} granularity - Segmentation granularity ('grapheme', 'word', 'sentence')
 * @returns {Intl.Segmenter|null} - Segmenter instance or null if not supported
 * 
 * @example
 * const segmenter = getSegmenter('ja', 'word');
 * const segments = Array.from(segmenter.segment('こんにちは世界'));
 */
export const getSegmenter = (lang, granularity = 'word') => {
  const key = `${lang}-${granularity}`;
  
  // Return cached instance
  if (segmenterCache.has(key)) {
    return segmenterCache.get(key);
  }
  
  // Check if supported
  if (!isSegmenterSupported()) {
    console.warn('Intl.Segmenter not supported in this browser');
    segmenterCache.set(key, null);
    return null;
  }
  
  // Create new instance
  try {
    const segmenter = new Intl.Segmenter(lang, { granularity });
    segmenterCache.set(key, segmenter);
    return segmenter;
  } catch (err) {
    console.warn(`Failed to create segmenter for ${lang}-${granularity}:`, err);
    segmenterCache.set(key, null);
    return null;
  }
};

/**
 * Segment text using cached segmenter
 * @param {string} text - Text to segment
 * @param {string} lang - Language code
 * @param {string} granularity - Segmentation granularity
 * @returns {Array<Object>} - Array of segments
 */
export const segmentText = (text, lang, granularity = 'word') => {
  const segmenter = getSegmenter(lang, granularity);
  
  if (!segmenter) {
    return [];
  }
  
  try {
    return Array.from(segmenter.segment(text));
  } catch (err) {
    console.warn('Segmentation failed:', err);
    return [];
  }
};

/**
 * Extract segment strings only
 * @param {string} text - Text to segment
 * @param {string} lang - Language code
 * @param {string} granularity - Segmentation granularity
 * @returns {Array<string>} - Array of segment strings
 */
export const segmentTextToStrings = (text, lang, granularity = 'word') => {
  const segments = segmentText(text, lang, granularity);
  return segments.map(s => s.segment);
};

/**
 * Extract word segments only (filters non-words)
 * @param {string} text - Text to segment
 * @param {string} lang - Language code
 * @returns {Array<string>} - Array of word strings
 */
export const extractWords = (text, lang) => {
  const segments = segmentText(text, lang, 'word');
  return segments
    .filter(s => s.isWordLike)
    .map(s => s.segment);
};

/**
 * Clear segmenter cache
 */
export const clearSegmenterCache = () => {
  segmenterCache.clear();
  console.log('🧹 Cleared segmenter cache');
};

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export const getSegmenterCacheStats = () => {
  return {
    size: segmenterCache.size,
    keys: Array.from(segmenterCache.keys()),
    supported: isSegmenterSupported()
  };
};