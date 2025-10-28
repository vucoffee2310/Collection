/**
 * Text Utilities - MERGED
 * Combines: text-utils.js, word-counter.js, word-splitter.js
 */

import { getCache } from './cache.js';
import { NON_SPACED_LANGS, VIETNAMESE_BOUNDARY_WORDS, MIN_WORDS_PER_SEGMENT } from './config.js';
import { countWordsWithCompounds, splitIntoWordsWithCompounds } from './compounds.js';

// ===== Segmenter Management =====
export const getSegmenter = (lang, granularity = 'word') => {
  const cache = getCache('segmenter');
  const key = `${lang}-${granularity}`;

  if (!cache.has(key)) {
    if (typeof Intl?.Segmenter === 'function') {
      try {
        cache.set(key, new Intl.Segmenter(lang, { granularity }));
      } catch (err) {
        console.warn(`Segmenter creation failed for ${lang}:`, err);
        cache.set(key, null);
      }
    } else {
      cache.set(key, null);
    }
  }
  return cache.get(key);
};

// ===== Word Counting =====
export const countWords = (text, lang = 'en', respectCompounds = true) => {
  if (!text?.trim()) return 0;

  const cache = getCache('wordCount');
  const cacheKey = `${lang}:${respectCompounds}:${text}`;

  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  let count = 0;

  // Vietnamese with compound markers
  if (lang === 'vi' && respectCompounds && (text.includes('«') || text.includes('»'))) {
    count = countWordsWithCompounds(text);
  }
  // Non-spaced languages (Japanese, Thai, Chinese, etc.)
  else if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang);
    if (segmenter) {
      try {
        count = Array.from(segmenter.segment(text))
          .filter((s) => s.isWordLike)
          .length;
      } catch (err) {
        count = text.replace(/\s+/g, '').length;
      }
    } else {
      count = text.replace(/\s+/g, '').length;
    }
  }
  // Spaced languages
  else {
    count = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  cache.set(cacheKey, count);
  return count;
};

// ===== Text Splitting =====
export const splitIntoWords = (text, lang = 'en') => {
  if (!text?.trim()) return [];

  // Vietnamese with compounds
  if (lang === 'vi' && (text.includes('«') || text.includes('»'))) {
    return splitIntoWordsWithCompounds(text);
  }

  // Non-spaced languages
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang);
    if (segmenter) {
      try {
        return Array.from(segmenter.segment(text))
          .filter((s) => s.isWordLike)
          .map((s) => s.segment);
      } catch (err) {
        return text.split('');
      }
    }
    return text.split('');
  }

  // Spaced languages
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
};

// ===== Marker Utilities =====
export const countMarkers = (text) => (text.match(/\([a-z]\)/g) || []).length;

export const mergeLowMarkerParagraphs = (text) => {
  let paras = text.split('\n\n').filter((p) => p.trim());

  for (let changed = true; changed; ) {
    changed = false;
    for (let i = paras.length - 1; i >= 0; i--) {
      if (countMarkers(paras[i]) >= 2 || paras.length === 1) continue;

      const [prev, next] = [paras[i - 1], paras[i + 1]];
      if (!prev && !next) continue;

      const usePrev = prev && (!next || prev.length <= next.length);
      if (usePrev) {
        paras[i - 1] += ' ' + paras[i];
      } else {
        paras[i + 1] = paras[i] + ' ' + next;
      }
      paras.splice(i, 1);
      changed = true;
    }
  }

  return paras.join('\n\n');
};

// ===== Middle Split =====
export const splitTextAtMiddle = (text, lang) => {
  // Try grapheme-based splitting for non-spaced languages
  if (NON_SPACED_LANGS.has(lang)) {
    try {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'grapheme' });
      const graphemes = Array.from(segmenter.segment(text)).map((s) => s.segment);

      if (graphemes.length > 1) {
        const mid = Math.floor(graphemes.length / 2);
        return {
          before: graphemes.slice(0, mid).join('').trim(),
          after: graphemes.slice(mid).join('').trim()
        };
      }
    } catch (err) {
      console.warn('Grapheme splitting failed:', err);
    }
  }

  // Fallback: split at nearest space to middle
  const mid = Math.floor(text.length / 2);
  const afterSpace = text.indexOf(' ', mid);
  const beforeSpace = text.lastIndexOf(' ', mid);

  const splitIdx =
    afterSpace === -1 && beforeSpace === -1
      ? mid
      : afterSpace === -1
      ? beforeSpace + 1
      : beforeSpace === -1
      ? afterSpace + 1
      : mid - beforeSpace <= afterSpace - mid
      ? beforeSpace + 1
      : afterSpace + 1;

  return {
    before: text.slice(0, splitIdx).trim(),
    after: text.slice(splitIdx).trim()
  };
};

// ===== Translation Splitting =====
export const splitTranslationByWordRatio = (translationText, utterances, lang = 'vi') => {
  if (!translationText || !utterances?.length) {
    return utterances.map(() => '');
  }

  const totalSourceWords = utterances.reduce((sum, u) => sum + (u.wordLength || 0), 0);
  if (totalSourceWords === 0) return utterances.map(() => '');

  const translationWords = splitIntoWords(translationText, lang);
  const totalTransWords = translationWords.length;
  if (totalTransWords === 0) return utterances.map(() => '');

  // Calculate target positions based on word ratios
  const targetPositions = calculateTargetPositions(utterances, totalSourceWords, totalTransWords);

  // Split translation at target positions
  const segments = splitAtPositions(translationWords, targetPositions, utterances.length, lang);

  // Fix compound word boundaries for Vietnamese
  if (lang === 'vi' && segments.length > 1 && hasCompoundMarkers(translationText)) {
    // Import fixCompoundBoundaries dynamically to avoid circular dependency
    return import('./compounds.js').then(({ fixCompoundBoundaries }) => {
      return fixCompoundBoundaries(segments);
    });
  }

  return segments;
};

// ===== Helper Functions =====
const calculateTargetPositions = (utterances, totalSourceWords, totalTransWords) => {
  const positions = [];
  let cumulativeRatio = 0;

  utterances.forEach((utt, idx) => {
    cumulativeRatio += utt.wordLength / totalSourceWords;
    positions.push(Math.round(totalTransWords * cumulativeRatio));
  });

  positions[positions.length - 1] = totalTransWords; // Ensure last position is exact
  return positions;
};

const splitAtPositions = (words, positions, segmentCount, lang) => {
  const segments = [];
  let currentStart = 0;

  positions.forEach((targetEnd, idx) => {
    let actualEnd = targetEnd;

    // Adjust boundaries to avoid breaking on bad words (Vietnamese only)
    if (lang === 'vi' && idx < segmentCount - 1 && actualEnd < words.length) {
      actualEnd = adjustBoundary(words, actualEnd, words.length, segmentCount - idx - 1);
    }

    segments.push(words.slice(currentStart, actualEnd).join(' ').trim());
    currentStart = actualEnd;
  });

  return segments;
};

const adjustBoundary = (words, position, totalWords, remainingSegments) => {
  if (position >= totalWords || position <= 0) return position;

  const lastWord = cleanWord(words[position - 1]);
  const nextWord = cleanWord(words[position]);
  const remainingWords = totalWords - position;

  // Don't adjust if we don't have enough words left
  if (remainingWords <= remainingSegments * MIN_WORDS_PER_SEGMENT) {
    return position;
  }

  // Move forward one word if current split is bad
  if (
    VIETNAMESE_BOUNDARY_WORDS.dontEndWith.has(lastWord) ||
    VIETNAMESE_BOUNDARY_WORDS.dontStartWith.has(nextWord)
  ) {
    return position + 1;
  }

  return position;
};

const cleanWord = (word) => word?.replace(/[«»]/g, '').toLowerCase() || '';
const hasCompoundMarkers = (text) => text.includes('«') || text.includes('»');