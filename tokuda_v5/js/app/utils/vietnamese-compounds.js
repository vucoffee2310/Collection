/**
 * Vietnamese Compound Word Processing (PERFORMANCE OPTIMIZED)
 */

let compoundData = null;
let compoundTrie = null;

// Cached regex patterns and normalizations
const normalizationCache = new Map();
const regexCache = new Map();

// Pre-compiled patterns
const COMPOUND_OPEN = '«';
const COMPOUND_CLOSE = '»';
const COMPOUND_PATTERN_GLOBAL = /«([^»]+)»/g;
const WORD_PATTERN = /[\p{L}]+/gu;
const PUNCTUATION_PATTERN = /^[^\p{L}\p{N}]+$/u;

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
    if (!trie[root]) {
      trie[root] = new Set(suffixes);
    }
  });
  
  return trie;
};

/**
 * Normalize Vietnamese text for compound matching (WITH CACHE)
 */
export const normalizeVietnamese = (text) => {
  // Check cache first
  if (normalizationCache.has(text)) {
    return normalizationCache.get(text);
  }
  
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  // Cache result (limit cache size)
  if (normalizationCache.size > 1000) {
    normalizationCache.clear(); // Simple eviction strategy
  }
  normalizationCache.set(text, normalized);
  
  return normalized;
};

/**
 * Check if token is pure punctuation (CACHED REGEX)
 */
const isPunctuation = (token) => {
  return PUNCTUATION_PATTERN.test(token);
};

/**
 * Check if two words form a compound (OPTIMIZED)
 */
const isCompound = (word1, word2) => {
  if (!compoundTrie || !word1 || !word2) return false;
  
  const normalized1 = normalizeVietnamese(word1);
  const normalized2 = normalizeVietnamese(word2);
  
  return compoundTrie[normalized1]?.has(normalized2) || false;
};

/**
 * Get cached regex pattern
 */
const getCachedRegex = (word1, word2) => {
  const key = `${word1}|${word2}`;
  
  if (regexCache.has(key)) {
    return regexCache.get(key);
  }
  
  const pattern = new RegExp(
    `\\b${escapeRegex(word1)}\\s+${escapeRegex(word2)}\\b`,
    'gi'
  );
  
  // Limit cache size
  if (regexCache.size > 500) {
    regexCache.clear();
  }
  regexCache.set(key, pattern);
  
  return pattern;
};

/**
 * Merge compound words in Vietnamese text (OPTIMIZED)
 */
export const mergeVietnameseCompounds = (text) => {
  if (!text || !compoundTrie) return text;
  
  // Single pass: Extract words using cached regex
  WORD_PATTERN.lastIndex = 0;
  const words = [];
  let match;
  
  while ((match = WORD_PATTERN.exec(text)) !== null) {
    words.push(match[0]);
  }
  
  if (words.length < 2) return text; // Early exit
  
  // Find compounds in single pass
  const compounds = [];
  
  for (let i = 0; i < words.length - 1; i++) {
    if (isCompound(words[i], words[i + 1])) {
      compounds.push({
        word1: words[i],
        word2: words[i + 1],
        text: `${words[i]} ${words[i + 1]}`
      });
      i++; // Skip next word (already part of compound)
    }
  }
  
  if (compounds.length === 0) return text; // Early exit
  
  // Replace compounds using cached regex patterns
  let result = text;
  
  // Sort by length (longest first)
  compounds.sort((a, b) => b.text.length - a.text.length);
  
  for (const compound of compounds) {
    const pattern = getCachedRegex(compound.word1, compound.word2);
    pattern.lastIndex = 0; // Reset regex state
    
    result = result.replace(pattern, (match) => {
      return `${COMPOUND_OPEN}${match}${COMPOUND_CLOSE}`;
    });
  }
  
  return result;
};

/**
 * Fix compound words split across text segment boundaries (OPTIMIZED)
 */
export const fixCompoundBoundaries = (segments) => {
  if (!segments || segments.length < 2 || !compoundTrie) return segments;
  
  const adjusted = [...segments];
  
  // Process boundaries in single pass
  for (let i = 0; i < adjusted.length - 1; i++) {
    const current = adjusted[i];
    const next = adjusted[i + 1];
    
    if (!current || !next) continue;
    
    // Extract last/first words without creating intermediate arrays
    const currentClean = removeCompoundMarkers(current);
    const nextClean = removeCompoundMarkers(next);
    
    const currentTokens = currentClean.trim().split(/\s+/);
    const nextTokens = nextClean.trim().split(/\s+/);
    
    // Find last word (reverse search for efficiency)
    let lastWord = null;
    let lastWordIndex = -1;
    
    for (let j = currentTokens.length - 1; j >= 0; j--) {
      if (!isPunctuation(currentTokens[j])) {
        lastWord = currentTokens[j];
        lastWordIndex = j;
        break;
      }
    }
    
    // Find first word (forward search)
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
    
    // Check compound
    if (!isCompound(lastWord, firstWord)) continue;
    
    console.log(`🔗 Compound boundary fix: "${lastWord}" + "${firstWord}" → «${lastWord} ${firstWord}»`);
    
    // Rebuild segments efficiently
    const currentWithoutLast = currentTokens.slice(0, lastWordIndex).join(' ');
    const currentPunctuation = currentTokens.slice(lastWordIndex + 1).join(' ');
    
    const nextPunctuation = nextTokens.slice(0, firstWordIndex).join(' ');
    const nextWithoutFirst = nextTokens.slice(firstWordIndex + 1).join(' ');
    
    const compoundText = `${COMPOUND_OPEN}${lastWord} ${firstWord}${COMPOUND_CLOSE}`;
    
    // Use array join for better performance than string concatenation
    const parts1 = [currentWithoutLast, compoundText, currentPunctuation].filter(Boolean);
    const parts2 = [nextPunctuation, nextWithoutFirst].filter(Boolean);
    
    adjusted[i] = parts1.join(' ');
    adjusted[i + 1] = parts2.join(' ');
  }
  
  return adjusted.filter(s => s && s.trim());
};

/**
 * Extract compound words with their positions (OPTIMIZED - CACHED)
 */
const compoundExtractionCache = new Map();

export const extractCompounds = (text) => {
  if (!text) return [];
  
  // Check cache
  if (compoundExtractionCache.has(text)) {
    return compoundExtractionCache.get(text);
  }
  
  const parts = [];
  let lastIndex = 0;
  
  // Reset global regex
  COMPOUND_PATTERN_GLOBAL.lastIndex = 0;
  
  let match;
  while ((match = COMPOUND_PATTERN_GLOBAL.exec(text)) !== null) {
    // Add text before compound
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
    
    // Add compound
    parts.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
      isCompound: true
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
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
  
  // Cache result (with size limit)
  if (compoundExtractionCache.size > 100) {
    compoundExtractionCache.clear();
  }
  compoundExtractionCache.set(text, parts);
  
  return parts;
};

/**
 * Count words treating compounds as single units (OPTIMIZED)
 */
export const countWordsWithCompounds = (text) => {
  if (!text || !text.trim()) return 0;
  
  const parts = extractCompounds(text);
  let count = 0;
  
  for (const part of parts) {
    if (part.isCompound) {
      count += 1;
    } else {
      // Optimized: single pass with early filtering
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

/**
 * Split text into words treating compounds as single units (OPTIMIZED)
 */
export const splitIntoWordsWithCompounds = (text) => {
  if (!text || !text.trim()) return [];
  
  const parts = extractCompounds(text);
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

/**
 * Remove compound markers from text (OPTIMIZED)
 */
export const removeCompoundMarkers = (text) => {
  if (!text) return text;
  
  // Simple character-by-character filtering is faster than regex for this
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char !== '«' && char !== '»') {
      result += char;
    }
  }
  return result;
};

/**
 * Format text for display with compound highlighting (OPTIMIZED WITH FRAGMENT)
 */
export const formatCompoundsForDisplay = (text) => {
  if (!text) return text;
  
  const parts = extractCompounds(text);
  
  // Use array join instead of string concatenation
  const htmlParts = [];
  
  for (const part of parts) {
    if (part.isCompound) {
      htmlParts.push(
        `<span class="compound-word" title="Compound word (merged for accuracy)">`,
        escapeHtml(part.text),
        `</span>`
      );
    } else {
      htmlParts.push(escapeHtml(part.text));
    }
  }
  
  return htmlParts.join('');
};

/**
 * Get compound marker characters for external use
 */
export const getCompoundMarkers = () => ({
  open: COMPOUND_OPEN,
  close: COMPOUND_CLOSE,
  pattern: COMPOUND_PATTERN_GLOBAL
});

/**
 * Clear all caches (for memory management)
 */
export const clearCaches = () => {
  normalizationCache.clear();
  regexCache.clear();
  compoundExtractionCache.clear();
  console.log('🧹 Cleared compound processing caches');
};

// Helper functions
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};