/**
 * Vietnamese Boundary Fixer
 * Fixes compound words split across text segment boundaries
 */

import { isCompound } from './compound-matcher.js';
import { removeCompoundMarkers, COMPOUND_OPEN, COMPOUND_CLOSE } from './compound-merger.js';
import { isPunctuation } from './normalizer.js';

/**
 * Fix compound words split across segment boundaries
 * @param {Array<string>} segments - Array of text segments
 * @returns {Array<string>} - Adjusted segments
 * 
 * @example
 * fixCompoundBoundaries(["Tôi hoạt", "động hàng ngày"])
 * // => ["Tôi «hoạt động»", "hàng ngày"]
 */
export const fixCompoundBoundaries = (segments) => {
  if (!Array.isArray(segments) || segments.length < 2) {
    return segments || [];
  }
  
  const adjusted = [...segments];
  
  // Process boundaries in single pass
  for (let i = 0; i < adjusted.length - 1; i++) {
    const current = adjusted[i];
    const next = adjusted[i + 1];
    
    if (!current || !next) continue;
    
    // Remove markers for analysis
    const currentClean = removeCompoundMarkers(current);
    const nextClean = removeCompoundMarkers(next);
    
    // Extract last/first words
    const { lastWord, lastWordIndex, tokens: currentTokens } = extractLastWord(currentClean);
    const { firstWord, firstWordIndex, tokens: nextTokens } = extractFirstWord(nextClean);
    
    if (!lastWord || !firstWord) continue;
    
    // Check if they form a compound
    if (!isCompound(lastWord, firstWord)) continue;
    
    console.log(`🔗 Compound boundary fix: "${lastWord}" + "${firstWord}" → «${lastWord} ${firstWord}»`);
    
    // Rebuild segments with compound
    const newCurrent = rebuildSegmentWithCompound(
      currentTokens,
      lastWordIndex,
      lastWord,
      firstWord,
      'end'
    );
    
    const newNext = rebuildSegmentWithCompound(
      nextTokens,
      firstWordIndex,
      firstWord,
      lastWord,
      'start'
    );
    
    adjusted[i] = newCurrent;
    adjusted[i + 1] = newNext;
  }
  
  return adjusted.filter(s => s && s.trim());
};

/**
 * Extract last non-punctuation word from text
 * @private
 */
const extractLastWord = (text) => {
  const tokens = text.trim().split(/\s+/);
  let lastWord = null;
  let lastWordIndex = -1;
  
  // Search backwards for last word
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (!isPunctuation(tokens[i])) {
      lastWord = tokens[i];
      lastWordIndex = i;
      break;
    }
  }
  
  return { lastWord, lastWordIndex, tokens };
};

/**
 * Extract first non-punctuation word from text
 * @private
 */
const extractFirstWord = (text) => {
  const tokens = text.trim().split(/\s+/);
  let firstWord = null;
  let firstWordIndex = -1;
  
  // Search forward for first word
  for (let i = 0; i < tokens.length; i++) {
    if (!isPunctuation(tokens[i])) {
      firstWord = tokens[i];
      firstWordIndex = i;
      break;
    }
  }
  
  return { firstWord, firstWordIndex, tokens };
};

/**
 * Rebuild segment with compound at boundary
 * @private
 */
const rebuildSegmentWithCompound = (tokens, wordIndex, word, otherWord, position) => {
  if (position === 'end') {
    // Remove last word and add compound
    const before = tokens.slice(0, wordIndex).join(' ');
    const after = tokens.slice(wordIndex + 1).join(' ');
    const compound = `${COMPOUND_OPEN}${word} ${otherWord}${COMPOUND_CLOSE}`;
    
    return [before, compound, after].filter(Boolean).join(' ');
  } else {
    // Remove first word (compound is in previous segment)
    const before = tokens.slice(0, wordIndex).join(' ');
    const after = tokens.slice(wordIndex + 1).join(' ');
    
    return [before, after].filter(Boolean).join(' ');
  }
};

/**
 * Check boundaries and report potential issues
 * @param {Array<string>} segments - Text segments
 * @returns {Array<Object>} - Array of boundary issues
 */
export const checkBoundaries = (segments) => {
  if (!Array.isArray(segments) || segments.length < 2) {
    return [];
  }
  
  const issues = [];
  
  for (let i = 0; i < segments.length - 1; i++) {
    const { lastWord } = extractLastWord(removeCompoundMarkers(segments[i]));
    const { firstWord } = extractFirstWord(removeCompoundMarkers(segments[i + 1]));
    
    if (lastWord && firstWord && isCompound(lastWord, firstWord)) {
      issues.push({
        segmentIndex: i,
        word1: lastWord,
        word2: firstWord,
        compound: `${lastWord} ${firstWord}`
      });
    }
  }
  
  return issues;
};