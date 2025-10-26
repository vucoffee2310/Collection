/**
 * Text Utilities - General text processing utilities
 */

import { getSegmenter } from './word-counter.js';

const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);

/**
 * Count markers in text
 */
export const countMarkers = (text) => {
  return (text.match(/\([a-z]\)/g) || []).length;
};

/**
 * Merge paragraphs with low marker counts
 */
export const mergeLowMarkerParagraphs = (text) => {
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