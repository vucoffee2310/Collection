/**
 * DOM Utilities - Core DOM helpers only
 */

// Re-export text utilities for backward compatibility
export { countWords } from './text/word-counter.js';
export { splitTextIntoWords, splitTranslationByWordRatio, countWordsConsistent } from './text/word-splitter.js';
export { countMarkers, mergeLowMarkerParagraphs, splitTextAtMiddle } from './text/text-utils.js';

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