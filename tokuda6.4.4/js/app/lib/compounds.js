/**
 * Compound Word Utilities - MERGED
 * Combines: data-loader.js, detector.js, formatter.js, merger.js, splitter.js
 */

import { getCache } from './cache.js';
import { COMPOUND_MARKERS } from './config.js';

const { OPEN, CLOSE } = COMPOUND_MARKERS;
const COMPOUND_PATTERN_GLOBAL = new RegExp(`${OPEN}([^${CLOSE}]+)${CLOSE}`, 'g');
const PUNCTUATION_PATTERN = /^[^\p{L}\p{N}]+$/u;
const WORD_PATTERN = /[\p{L}]+/gu;

let compoundData = null;
let compoundTrie = null;
let loadingPromise = null;

// ===== Data Loading =====
const buildTrie = (data) => {
  const trie = {};

  Object.entries(data).forEach(([root, suffixes]) => {
    const normalizedRoot = root.normalize('NFC').toLowerCase();
    const normalizedSuffixes = suffixes.map((s) => s.normalize('NFC').toLowerCase());

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

// ===== Detection =====
export const normalizeVietnamese = (text) => {
  const cache = getCache('normalization');

  if (cache.has(text)) {
    return cache.get(text);
  }

  const normalized = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  cache.set(text, normalized);
  return normalized;
};

export const isPunctuation = (token) => PUNCTUATION_PATTERN.test(token);

export const isCompound = (word1, word2) => {
  if (!compoundTrie || !word1 || !word2) return false;

  const normalized1 = normalizeVietnamese(word1);
  const normalized2 = normalizeVietnamese(word2);

  return compoundTrie[normalized1]?.has(normalized2) || false;
};

// ===== Formatting =====
export const removeCompoundMarkers = (text) => {
  if (!text) return text;

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== OPEN && char !== CLOSE) {
      result += char;
    }
  }
  return result;
};

export const cleanupNestedBrackets = (text) => {
  if (!text) return text;

  let cleaned = text.replace(new RegExp(`${OPEN}{2,}`, 'g'), OPEN);
  cleaned = cleaned.replace(new RegExp(`${CLOSE}{2,}`, 'g'), CLOSE);

  const openCount = (cleaned.match(new RegExp(OPEN, 'g')) || []).length;
  const closeCount = (cleaned.match(new RegExp(CLOSE, 'g')) || []).length;

  if (openCount !== closeCount) {
    console.warn(`⚠️ Mismatched brackets: ${openCount} open, ${closeCount} close`);
  }

  return cleaned;
};

export const hasCompoundMarkers = (text) => {
  if (!text) return false;
  return text.includes(OPEN) && text.includes(CLOSE);
};

// ===== Merging =====
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getCachedRegex = (word1, word2) => {
  const cache = getCache('regex');
  const key = `${word1}|${word2}`;

  if (cache.has(key)) {
    return cache.get(key);
  }

  const pattern = new RegExp(
    `(?<![\\p{L}${OPEN}])${escapeRegex(word1)}\\s+${escapeRegex(word2)}(?![\\p{L}${CLOSE}])`,
    'giu'
  );

  cache.set(key, pattern);
  return pattern;
};

export const mergeVietnameseCompounds = (text) => {
  if (!text) return text;

  WORD_PATTERN.lastIndex = 0;
  const words = [];
  let match;

  while ((match = WORD_PATTERN.exec(text)) !== null) {
    words.push(match[0]);
  }

  if (words.length < 2) return text;

  const compounds = [];

  for (let i = 0; i < words.length - 1; i++) {
    if (isCompound(words[i], words[i + 1])) {
      compounds.push({
        word1: words[i],
        word2: words[i + 1],
        text: `${words[i]} ${words[i + 1]}`
      });
      i++;
    }
  }

  if (compounds.length === 0) return text;

  let result = text;
  compounds.sort((a, b) => b.text.length - a.text.length);

  for (const compound of compounds) {
    const pattern = getCachedRegex(compound.word1, compound.word2);
    pattern.lastIndex = 0;

    result = result.replace(pattern, (match) => {
      return `${OPEN}${match}${CLOSE}`;
    });
  }

  return result;
};

export const safelyMergeCompounds = (text, force = false) => {
  if (!text || !text.trim()) return text;

  const alreadyHasMarkers = text.includes(OPEN) && text.includes(CLOSE);

  if (alreadyHasMarkers && !force) {
    console.log('⚠️ Text already contains compound markers, cleaning up only');
    return cleanupNestedBrackets(text);
  }

  return mergeVietnameseCompounds(text);
};

export const fixCompoundBoundaries = (segments) => {
  if (!segments || segments.length < 2) return segments;

  const adjusted = [...segments];

  for (let i = 0; i < adjusted.length - 1; i++) {
    const current = adjusted[i];
    const next = adjusted[i + 1];

    if (!current || !next) continue;

    const currentClean = removeCompoundMarkers(current);
    const nextClean = removeCompoundMarkers(next);

    const currentTokens = currentClean.trim().split(/\s+/);
    const nextTokens = nextClean.trim().split(/\s+/);

    let lastWord = null;
    let lastWordIndex = -1;

    for (let j = currentTokens.length - 1; j >= 0; j--) {
      if (!isPunctuation(currentTokens[j])) {
        lastWord = currentTokens[j];
        lastWordIndex = j;
        break;
      }
    }

    let firstWord = null;
    let firstWordIndex = -1;

    for (let j = 0; j < nextTokens.length; j++) {
      if (!isPunctuation(nextTokens[j])) {
        firstWord = nextTokens[j];
        firstWordIndex = j;
        break;
      }
    }

    if (!lastWord || !firstWord) continue;

    if (!isCompound(lastWord, firstWord)) continue;

    console.log(
      `🔗 Compound boundary fix: "${lastWord}" + "${firstWord}" → ${OPEN}${lastWord} ${firstWord}${CLOSE}`
    );

    const currentWithoutLast = currentTokens.slice(0, lastWordIndex).join(' ');
    const currentPunctuation = currentTokens.slice(lastWordIndex + 1).join(' ');

    const nextPunctuation = nextTokens.slice(0, firstWordIndex).join(' ');
    const nextWithoutFirst = nextTokens.slice(firstWordIndex + 1).join(' ');

    const compoundText = `${OPEN}${lastWord} ${firstWord}${CLOSE}`;

    const parts1 = [currentWithoutLast, compoundText, currentPunctuation].filter(Boolean);
    const parts2 = [nextPunctuation, nextWithoutFirst].filter(Boolean);

    adjusted[i] = parts1.join(' ');
    adjusted[i + 1] = parts2.join(' ');
  }

  return adjusted.filter((s) => s && s.trim());
};

// ===== Splitting =====
const extractCompoundsInternal = (text) => {
  if (!text) return [];

  const parts = [];
  let lastIndex = 0;

  COMPOUND_PATTERN_GLOBAL.lastIndex = 0;

  let match;
  while ((match = COMPOUND_PATTERN_GLOBAL.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText.trim()) {
        parts.push({
          text: beforeText,
          start: lastIndex,
          end: match.index,
          isCompound: false
        });
      }
    }

    parts.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
      isCompound: true
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({
        text: remainingText,
        start: lastIndex,
        end: text.length,
        isCompound: false
      });
    }
  }

  return parts;
};

export const countWordsWithCompounds = (text) => {
  if (!text || !text.trim()) return 0;

  const parts = extractCompoundsInternal(text);
  let count = 0;

  for (const part of parts) {
    if (part.isCompound) {
      count += 1;
    } else {
      const tokens = part.text.trim().split(/\s+/);
      for (const token of tokens) {
        if (token.length > 0 && !isPunctuation(token)) {
          count++;
        }
      }
    }
  }

  return count;
};

export const splitIntoWordsWithCompounds = (text) => {
  if (!text || !text.trim()) return [];

  const parts = extractCompoundsInternal(text);
  const words = [];

  for (const part of parts) {
    if (part.isCompound) {
      words.push(`${OPEN}${part.text}${CLOSE}`);
    } else {
      const tokens = part.text.trim().split(/\s+/);
      for (const token of tokens) {
        if (token.length > 0 && !isPunctuation(token)) {
          words.push(token);
        }
      }
    }
  }

  return words;
};

export const validateWordCountConsistency = (text) => {
  if (!text || !text.trim()) return true;

  const count = countWordsWithCompounds(text);
  const split = splitIntoWordsWithCompounds(text);
  const splitCount = split.length;

  if (count !== splitCount) {
    console.error(`❌ Word count inconsistency:`, {
      text: text.substring(0, 100),
      countWordsWithCompounds: count,
      splitIntoWordsWithCompounds: splitCount,
      difference: Math.abs(count - splitCount)
    });
    return false;
  }

  return true;
};