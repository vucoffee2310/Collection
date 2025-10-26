/**
 * Vietnamese Compound Matcher
 * Checks if two words form a compound
 */

import { getCompoundTrie } from './compound-loader.js';
import { normalizeVietnamese } from './normalizer.js';

/**
 * Regex cache for compound patterns
 * @type {Map<string, RegExp>}
 */
const regexCache = new Map();
const MAX_REGEX_CACHE_SIZE = 500;

/**
 * Check if two Vietnamese words form a compound
 * @param {string} word1 - First word (root)
 * @param {string} word2 - Second word (suffix)
 * @returns {boolean} - True if compound exists
 * 
 * @example
 * isCompound('hoạt', 'động') // => true
 * isCompound('xin', 'chào') // => false
 */
export const isCompound = (word1, word2) => {
  const trie = getCompoundTrie();
  
  if (!trie || !word1 || !word2) {
    return false;
  }
  
  const normalized1 = normalizeVietnamese(word1);
  const normalized2 = normalizeVietnamese(word2);
  
  // Check if root exists and has this suffix
  const suffixes = trie[normalized1];
  return suffixes ? suffixes.has(normalized2) : false;
};

/**
 * Check multiple word pairs for compounds
 * @param {Array<[string, string]>} pairs - Array of word pairs
 * @returns {Array<boolean>} - Array of results
 */
export const areCompounds = (pairs) => {
  if (!Array.isArray(pairs)) {
    return [];
  }
  
  return pairs.map(([word1, word2]) => isCompound(word1, word2));
};

/**
 * Get cached regex pattern for compound replacement
 * @param {string} word1 - First word
 * @param {string} word2 - Second word
 * @returns {RegExp} - Cached regex pattern
 */
export const getCompoundRegex = (word1, word2) => {
  const key = `${word1}|${word2}`;
  
  // Return cached pattern
  if (regexCache.has(key)) {
    return regexCache.get(key);
  }
  
  // Create new pattern with Unicode-aware word boundaries
  // (?<![\p{L}]) = not preceded by a Unicode letter
  // (?![\p{L}]) = not followed by a Unicode letter
  const pattern = new RegExp(
    `(?<![\\p{L}])${escapeRegex(word1)}\\s+${escapeRegex(word2)}(?![\\p{L}])`,
    'giu'  // global, case-insensitive, unicode
  );
  
  // Cache with size limit
  if (regexCache.size >= MAX_REGEX_CACHE_SIZE) {
    regexCache.clear();
  }
  
  regexCache.set(key, pattern);
  return pattern;
};

/**
 * Find all compounds in text
 * @param {string} text - Text to analyze
 * @returns {Array<Object>} - Array of compound matches
 * 
 * @example
 * findCompounds("Tôi hoạt động mỗi ngày")
 * // => [{ word1: "hoạt", word2: "động", index: 4 }]
 */
export const findCompounds = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const compounds = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    if (isCompound(words[i], words[i + 1])) {
      compounds.push({
        word1: words[i],
        word2: words[i + 1],
        index: i,
        compound: `${words[i]} ${words[i + 1]}`
      });
    }
  }
  
  return compounds;
};

/**
 * Get all possible compounds for a root word
 * @param {string} root - Root word
 * @returns {Array<string>} - Array of possible compounds
 * 
 * @example
 * getPossibleCompounds('hoạt')
 * // => ["hoạt động", "hoạt hình", ...]
 */
export const getPossibleCompounds = (root) => {
  const trie = getCompoundTrie();
  
  if (!trie || !root) {
    return [];
  }
  
  const normalized = normalizeVietnamese(root);
  const suffixes = trie[normalized];
  
  if (!suffixes) {
    return [];
  }
  
  return Array.from(suffixes).map(suffix => `${root} ${suffix}`);
};

/**
 * Clear regex cache
 */
export const clearCompoundRegexCache = () => {
  regexCache.clear();
  console.log('🧹 Cleared compound regex cache');
};

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export const getCompoundMatcherStats = () => {
  return {
    regexCacheSize: regexCache.size,
    regexCacheMax: MAX_REGEX_CACHE_SIZE,
    regexCacheUsage: ((regexCache.size / MAX_REGEX_CACHE_SIZE) * 100).toFixed(1) + '%'
  };
};

/**
 * Escape special regex characters
 * @private
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};