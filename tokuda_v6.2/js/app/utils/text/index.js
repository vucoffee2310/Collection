/**
 * Text Utilities - Main Entry Point
 */

export { countWords, getSegmenter } from './word-counter.js';
export { 
  splitTextIntoWords, 
  splitTranslationByWordRatio, 
  countWordsConsistent 
} from './word-splitter.js';
export { countMarkers, mergeLowMarkerParagraphs, splitTextAtMiddle } from './text-utils.js';