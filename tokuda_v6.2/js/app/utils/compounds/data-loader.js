/**
 * Compound Data Loader - Load and build compound data structures
 * ✅ FIXED: LRU cache with size limits
 */

let compoundData = null;
let compoundTrie = null;
let loadingPromise = null;

const COMPOUND_OPEN = '«';
const COMPOUND_CLOSE = '»';
const COMPOUND_PATTERN_GLOBAL = /«([^»]+)»/g;

/**
 * ✅ LRU Cache implementation
 */
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first item)
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

// ✅ Use LRU caches with limits
const normalizationCache = new LRUCache(1000);
const regexCache = new LRUCache(500);

const buildTrie = (data) => {
  const trie = {};
  
  Object.entries(data).forEach(([root, suffixes]) => {
    const normalizedRoot = root.normalize('NFC').toLowerCase();
    const normalizedSuffixes = suffixes.map(s => s.normalize('NFC').toLowerCase());
    
    if (!trie[normalizedRoot]) {
      trie[normalizedRoot] = new Set(normalizedSuffixes);
    }
  });
  
  return trie;
};

export const loadCompoundData = async () => {
  if (compoundData && compoundTrie) {
    return compoundData;
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    try {
      const response = await fetch(chrome.runtime.getURL('data.json'));
      compoundData = await response.json();
      compoundTrie = buildTrie(compoundData);
      console.log('✅ Loaded compound data:', Object.keys(compoundData).length, 'roots');
      return compoundData;
    } catch (error) {
      console.error('❌ Failed to load compound data:', error);
      compoundData = {};
      compoundTrie = {};
      throw error;
    } finally {
      loadingPromise = null;
    }
  })();
  
  return loadingPromise;
};

export const getCompoundTrie = () => compoundTrie;
export const getNormalizationCache = () => normalizationCache;
export const getRegexCache = () => regexCache;

export const getCompoundMarkers = () => ({
  open: COMPOUND_OPEN,
  close: COMPOUND_CLOSE,
  pattern: COMPOUND_PATTERN_GLOBAL
});