/**
 * DOM and Text Processing Utilities
 */

import { 
  splitIntoWordsWithCompounds, 
  countWordsWithCompounds, 
  extractCompounds,
  fixCompoundBoundaries 
} from './vietnamese-compounds.js';

// ===========================
// DOM Utilities
// ===========================

/**
 * Query selector shorthand
 */
export const $ = (selector) => document.querySelector(selector);

/**
 * Get current YouTube video ID from URL
 */
export const getVideoId = () => new URL(location.href).searchParams.get('v');

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('✅ Copied to clipboard');
  } catch {
    const textarea = Object.assign(document.createElement('textarea'), { 
      value: text, 
      style: 'position:fixed;opacity:0' 
    });
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

/**
 * Generate combinations of array elements
 */
export const combinations = (arr, size) => {
  if (size > arr.length || !arr.length) return [];
  if (size === arr.length) return [arr];
  if (size === 1) return arr.map(x => [x]);
  
  const result = [];
  const bt = (start, combo) => {
    if (combo.length === size) return result.push([...combo]);
    for (let i = start; i <= arr.length - (size - combo.length); i++) {
      bt(i + 1, [...combo, arr[i]]);
    }
  };
  bt(0, []);
  return result;
};

// ===========================
// Text Processing Utilities
// ===========================

/**
 * Cache for Intl.Segmenter instances
 */
const segmenterCache = new Map();

/**
 * Get or create cached segmenter instance
 */
const getSegmenter = (lang, granularity) => {
  const key = `${lang}-${granularity}`;
  if (!segmenterCache.has(key)) {
    if (typeof Intl?.Segmenter === 'function') {
      try {
        segmenterCache.set(key, new Intl.Segmenter(lang, { granularity }));
      } catch {
        segmenterCache.set(key, null);
      }
    } else {
      segmenterCache.set(key, null);
    }
  }
  return segmenterCache.get(key);
};

/**
 * Count words in text (handles non-spaced languages)
 */
export const countWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return 0;
  
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, 'word');
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        return segments.filter(s => s.isWordLike).length;
      } catch {
        return text.replace(/\s+/g, '').length;
      }
    }
    return text.replace(/\s+/g, '').length;
  }
  
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Split text into words (unified function)
 */
export const splitTextIntoWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return [];
  
  // Check for Vietnamese compounds first (using guillemets «»)
  if (lang === 'vi' && (text.includes('«') || text.includes('»'))) {
    return splitIntoWordsWithCompounds(text);
  }
  
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, 'word');
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        return segments.filter(s => s.isWordLike).map(s => s.segment);
      } catch {
        return text.split('');
      }
    }
    return text.split('');
  }
  
  return text.trim().split(/\s+/).filter(w => w.length > 0);
};

/**
 * Split translation by word ratio across utterances
 */
export const splitTranslationByWordRatio = (translationText, utterances, lang = 'vi') => {
  if (!translationText || !utterances || utterances.length === 0) {
    return utterances.map(() => '');
  }

  const totalWordLength = utterances.reduce((sum, utt) => sum + (utt.wordLength || 0), 0);
  
  if (totalWordLength === 0) {
    return utterances.map(() => '');
  }

  const translationWords = splitTextIntoWords(translationText, lang);
  const totalTranslationWords = translationWords.length;
  
  if (totalTranslationWords === 0) {
    return utterances.map(() => '');
  }

  const elementTranslations = [];
  let currentIndex = 0;

  utterances.forEach((utt, idx) => {
    const ratio = utt.wordLength / totalWordLength;
    let wordsToTake = Math.round(totalTranslationWords * ratio);
    
    if (currentIndex + wordsToTake > translationWords.length) {
      wordsToTake = translationWords.length - currentIndex;
    }
    
    if (idx === utterances.length - 1) {
      wordsToTake = translationWords.length - currentIndex;
    }

    const portion = translationWords.slice(currentIndex, currentIndex + wordsToTake).join(' ');
    elementTranslations.push(portion.trim());
    
    currentIndex += wordsToTake;
  });

  // Fix compound boundaries between utterances for Vietnamese
  if (lang === 'vi' && elementTranslations.length > 1) {
    const fixed = fixCompoundBoundaries(elementTranslations);
    return fixed;
  }

  return elementTranslations;
};

/**
 * Count markers in text
 */
export const countMarkers = text => (text.match(/\([a-z]\)/g) || []).length;

/**
 * Merge paragraphs with low marker counts
 */
export const mergeLowMarkerParagraphs = text => {
  let paras = text.split('\n\n').filter(p => p.trim());
  
  for (let changed = true; changed;) {
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

/**
 * Split text at middle (handles non-spaced languages)
 */
export const splitTextAtMiddle = (text, lang) => {
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang) && typeof Intl?.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'grapheme' });
      const segments = Array.from(segmenter.segment(text));
      const graphemes = segments.map(s => s.segment);
      
      if (graphemes.length > 1) {
        const mid = Math.floor(graphemes.length / 2);
        const before = graphemes.slice(0, mid).join('');
        const after = graphemes.slice(mid).join('');
        return { before: before.trim(), after: after.trim() };
      }
    } catch (err) {
      console.warn('Grapheme splitting failed:', err);
    }
  }
  
  const mid = Math.floor(text.length / 2);
  const [after, before] = [text.indexOf(' ', mid), text.lastIndexOf(' ', mid)];
  const idx = after === -1 && before === -1 ? mid :
              after === -1 ? before + 1 :
              before === -1 ? after + 1 :
              mid - before <= after - mid ? before + 1 : after + 1;
  
  return { before: text.slice(0, idx).trim(), after: text.slice(idx).trim() };
};