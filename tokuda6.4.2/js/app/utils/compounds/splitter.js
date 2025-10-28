/**
 * Compound Splitter - Split text treating compounds as single units
 */

import { isPunctuation } from "./detector.js";
import { getCompoundMarkers } from "./data-loader.js";

const extractCompoundsInternal = (text) => {
  if (!text) return [];

  const {
    open: COMPOUND_OPEN,
    close: COMPOUND_CLOSE,
    pattern: COMPOUND_PATTERN_GLOBAL,
  } = getCompoundMarkers();
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
          isCompound: false,
        });
      }
    }

    parts.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
      isCompound: true,
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
        isCompound: false,
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

  const { open: COMPOUND_OPEN, close: COMPOUND_CLOSE } = getCompoundMarkers();
  const parts = extractCompoundsInternal(text);
  const words = [];

  for (const part of parts) {
    if (part.isCompound) {
      words.push(`${COMPOUND_OPEN}${part.text}${COMPOUND_CLOSE}`);
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
      difference: Math.abs(count - splitCount),
    });
    return false;
  }

  return true;
};
