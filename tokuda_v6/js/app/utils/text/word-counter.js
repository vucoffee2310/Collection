/**
 * Word Counter - Count words in text (handles non-spaced languages)
 */

const segmenterCache = new Map();
const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);

/**
 * Get or create cached segmenter instance
 */
export const getSegmenter = (lang, granularity) => {
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
 * Count words in text
 */
export const countWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return 0;
  
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
 * Count words using consistent logic with word splitting
 */
export const countWordsConsistent = (text, lang = 'en') => {
  // Import locally to avoid circular dependency
  const { splitTextIntoWords } = require('./word-splitter.js');
  return splitTextIntoWords(text, lang).length;
};