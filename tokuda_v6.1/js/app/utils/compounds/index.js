/**
 * Vietnamese Compound Words - Main Entry Point
 */

export { loadCompoundData, getCompoundMarkers, clearCaches } from './data-loader.js';
export { normalizeVietnamese } from './detector.js';
export { mergeVietnameseCompounds, fixCompoundBoundaries } from './merger.js';
export { splitIntoWordsWithCompounds, countWordsWithCompounds } from './splitter.js';
export { formatCompoundsForDisplay, extractCompounds, removeCompoundMarkers } from './formatter.js';