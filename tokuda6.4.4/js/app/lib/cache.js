/**
 * Centralized Cache Manager
 * Single source of truth for all caching
 */

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

// ===== Cache Instances =====
const caches = {
  normalization: new LRUCache(1000),   // Vietnamese normalization
  regex: new LRUCache(500),            // Compiled regex patterns
  wordCount: new LRUCache(500),        // Word count results
  segmenter: new Map(),                // Intl.Segmenter instances
  content: new Map(),                  // Subtitle content
  json: new Map()                      // Processed JSON
};

// ===== Public API =====
export const getCache = (name) => {
  if (!caches[name]) {
    console.warn(`Cache "${name}" does not exist`);
    return new Map();
  }
  return caches[name];
};

export const clearCache = (name) => {
  if (caches[name]) {
    caches[name].clear();
  }
};

export const clearAllCaches = () => {
  Object.values(caches).forEach(cache => cache.clear?.());
  console.log('🧹 All caches cleared');
};