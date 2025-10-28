/**
 * Word Counter - MASTER word counting function
 */

import { countWordsWithCompounds } from '../compounds/splitter.js';  // ✅ CHANGED
import { NON_SPACED_LANGS } from '../config.js';

const segmenterCache = new Map();

class WordCountCache {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(text, lang, respectCompounds) {
    const key = `${lang}:${respectCompounds}:${text}`;
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }
  
  set(text, lang, respectCompounds, count) {
    const key = `${lang}:${respectCompounds}:${text}`;
    
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, count);
  }
  
  clear() {
    this.cache.clear();
  }
}

const wordCountCache = new WordCountCache(500);

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
  
  const cached = wordCountCache.get(text, lang, respectCompounds);
  if (cached !== null) {
    return cached;
  }
  
  let count;
  
  if (lang === 'vi' && respectCompounds) {
    const hasMarkers = text.includes('«') || text.includes('»');
    if (hasMarkers) {
      count = countWordsWithCompounds(text);
      wordCountCache.set(text, lang, respectCompounds, count);
      return count;
    }
  }
  
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, 'word');
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        count = segments.filter(s => s.isWordLike).length;
      } catch (err) {
        console.error(`Segmenter failed for ${lang}:`, err);
        count = text.replace(/\s+/g, '').length;
      }
    } else {
      count = text.replace(/\s+/g, '').length;
    }
  } else {
    count = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
  
  wordCountCache.set(text, lang, respectCompounds, count);
  return count;
};

export const clearWordCountCache = () => {
  wordCountCache.clear();
};