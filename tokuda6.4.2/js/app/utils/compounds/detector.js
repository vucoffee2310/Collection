/**
 * Compound Detector - Detect compound words
 */

import { getCompoundTrie, getNormalizationCache } from "./data-loader.js";

const PUNCTUATION_PATTERN = /^[^\p{L}\p{N}]+$/u;

export const normalizeVietnamese = (text) => {
  const cache = getNormalizationCache();

  if (cache.has(text)) {
    return cache.get(text);
  }

  const normalized = text
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (cache.size > 1000) {
    cache.clear();
  }
  cache.set(text, normalized);

  return normalized;
};

export const isPunctuation = (token) => {
  return PUNCTUATION_PATTERN.test(token);
};

export const isCompound = (word1, word2) => {
  const trie = getCompoundTrie();
  if (!trie || !word1 || !word2) return false;

  const normalized1 = normalizeVietnamese(word1);
  const normalized2 = normalizeVietnamese(word2);

  return trie[normalized1]?.has(normalized2) || false;
};
