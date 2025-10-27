/**
 * Compound Data Loader - Load and build compound data structures
 */

let compoundData = null;
let compoundTrie = null;

// Caches
const normalizationCache = new Map();
const regexCache = new Map();

// Constants
const COMPOUND_OPEN = '«';
const COMPOUND_CLOSE = '»';
const COMPOUND_PATTERN_GLOBAL = /«([^»]+)»/g;

/**
 * Load compound word data from JSON file
 */
export const loadCompoundData = async () => {
  if (compoundData) return compoundData;
  
  try {
    const response = await fetch(chrome.runtime.getURL('data.json'));
    compoundData = await response.json();
    compoundTrie = buildTrie(compoundData);
    console.log('✅ Loaded Vietnamese compound data:', Object.keys(compoundData).length, 'roots');
    return compoundData;
  } catch (error) {
    console.error('❌ Failed to load compound data:', error);
    compoundData = {};
    compoundTrie = {};
    return compoundData;
  }
};

/**
 * Build trie structure for efficient compound lookup
 */
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
 * Get compound trie (internal use)
 */
export const getCompoundTrie = () => compoundTrie;

/**
 * Get normalization cache (internal use)
 */
export const getNormalizationCache = () => normalizationCache;

/**
 * Get regex cache (internal use)
 */
export const getRegexCache = () => regexCache;

/**
 * Get compound marker characters
 */
export const getCompoundMarkers = () => ({
  open: COMPOUND_OPEN,
  close: COMPOUND_CLOSE,
  pattern: COMPOUND_PATTERN_GLOBAL
});

/**
 * Clear all caches
 */
export const clearCaches = () => {
  normalizationCache.clear();
  regexCache.clear();
  console.log('🧹 Cleared compound processing caches');
};