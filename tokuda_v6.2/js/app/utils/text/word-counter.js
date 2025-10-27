/**
 * Word Counter - MASTER word counting function
 */

import { countWordsWithCompounds } from '../compounds/splitter.js';
import { NON_SPACED_LANGS } from '../config.js';

const segmenterCache = new Map();

export const getSegmenter = (lang, granularity) => {
  const key = `${lang}-${granularity}`;
  if (!segmenterCache.has(key)) {
    if (typeof Intl?.Segmenter === 'function') {
      try {
        segmenterCache.set(key, new Intl.Segmenter(lang, { granularity }));
      } catch (err) {
        console.warn(`Failed to create Segmenter for ${lang}:`, err);
        segmenterCache.set(key, null);
      }
    } else {
      segmenterCache.set(key, null);
    }
  }
  return segmenterCache.get(key);
};

export const countWords = (text, lang = 'en', respectCompounds = true) => {
  if (!text || !text.trim()) return 0;
  
  if (lang === 'vi' && respectCompounds) {
    const hasMarkers = text.includes('«') || text.includes('»');
    if (hasMarkers) {
      return countWordsWithCompounds(text);
    }
  }
  
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, 'word');
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        return segments.filter(s => s.isWordLike).length;
      } catch (err) {
        console.error(`Segmenter failed for ${lang}:`, err);
        return text.replace(/\s+/g, '').length;
      }
    }
    return text.replace(/\s+/g, '').length;
  }
  
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};