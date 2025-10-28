/**
 * Compound Data Loader - Load and build compound data structures
 * ✅ FIXED: Handle missing chrome.runtime in different contexts
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

/**
 * ✅ Get data URL with fallback for different contexts
 */
const getDataURL = () => {
  // Try chrome.runtime.getURL first (works in content scripts, background)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL('data.json');
  }
  
  // Fallback for web-accessible context
  if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
    return browser.runtime.getURL('data.json');
  }
  
  // Last resort: try relative path (won't work, but better error message)
  console.warn('⚠️ Chrome/Browser runtime not available, using relative path');
  return '/data.json';
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
      const dataURL = getDataURL();
      console.log('📥 Loading compound data from:', dataURL);
      
      const response = await fetch(dataURL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      compoundData = await response.json();
      compoundTrie = buildTrie(compoundData);
      console.log('✅ Loaded compound data:', Object.keys(compoundData).length, 'roots');
      return compoundData;
    } catch (error) {
      console.error('❌ Failed to load compound data:', error);
      // Initialize empty data instead of throwing
      compoundData = {};
      compoundTrie = {};
      console.warn('⚠️ Using empty compound data (compound word detection disabled)');
      return compoundData;
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