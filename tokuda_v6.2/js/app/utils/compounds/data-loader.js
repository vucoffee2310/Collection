/**
 * Compound Data Loader - Load and build compound data structures
 */

let compoundData = null;
let compoundTrie = null;
let loadingPromise = null;

const normalizationCache = new Map();
const regexCache = new Map();

const COMPOUND_OPEN = '«';
const COMPOUND_CLOSE = '»';
const COMPOUND_PATTERN_GLOBAL = /«([^»]+)»/g;

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