/**
 * DOM Utilities - Core DOM helpers only
 */

export { countWords } from './text/word-counter.js';
export { splitTextIntoWords, splitTranslationByWordRatio, countWordsConsistent } from './text/word-splitter.js';
export { countMarkers, mergeLowMarkerParagraphs, splitTextAtMiddle } from './text/text-utils.js';

export const getVideoId = () => new URL(location.href).searchParams.get('v');

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