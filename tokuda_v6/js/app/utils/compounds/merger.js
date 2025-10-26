/**
 * Compound Merger - Merge compound words in text
 */

import { isCompound, isPunctuation } from './detector.js';
import { getCompoundMarkers, getRegexCache } from './data-loader.js';
import { removeCompoundMarkers } from './formatter.js';

const WORD_PATTERN = /[\p{L}]+/gu;

/**
 * Get cached regex pattern
 */
const getCachedRegex = (word1, word2) => {
  const cache = getRegexCache();
  const key = `${word1}|${word2}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const pattern = new RegExp(
    `(?<![\\p{L}])${escapeRegex(word1)}\\s+${escapeRegex(word2)}(?![\\p{L}])`,
    'giu'
  );
  
  if (cache.size > 500) {
    cache.clear();
  }
  cache.set(key, pattern);
  
  return pattern;
};

/**
 * Merge compound words in Vietnamese text
 */
export const mergeVietnameseCompounds = (text) => {
  if (!text) return text;
  
  const { open: COMPOUND_OPEN, close: COMPOUND_CLOSE } = getCompoundMarkers();
  
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
      return `${COMPOUND_OPEN}${match}${COMPOUND_CLOSE}`;
    });
  }
  
  return result;
};

/**
 * Fix compound words split across text segment boundaries
 */
export const fixCompoundBoundaries = (segments) => {
  if (!segments || segments.length < 2) return segments;
  
  const { open: COMPOUND_OPEN, close: COMPOUND_CLOSE } = getCompoundMarkers();
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
    
    console.log(`🔗 Compound boundary fix: "${lastWord}" + "${firstWord}" → «${lastWord} ${firstWord}»`);
    
    const currentWithoutLast = currentTokens.slice(0, lastWordIndex).join(' ');
    const currentPunctuation = currentTokens.slice(lastWordIndex + 1).join(' ');
    
    const nextPunctuation = nextTokens.slice(0, firstWordIndex).join(' ');
    const nextWithoutFirst = nextTokens.slice(firstWordIndex + 1).join(' ');
    
    const compoundText = `${COMPOUND_OPEN}${lastWord} ${firstWord}${COMPOUND_CLOSE}`;
    
    const parts1 = [currentWithoutLast, compoundText, currentPunctuation].filter(Boolean);
    const parts2 = [nextPunctuation, nextWithoutFirst].filter(Boolean);
    
    adjusted[i] = parts1.join(' ');
    adjusted[i + 1] = parts2.join(' ');
  }
  
  return adjusted.filter(s => s && s.trim());
};

// Helper
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};