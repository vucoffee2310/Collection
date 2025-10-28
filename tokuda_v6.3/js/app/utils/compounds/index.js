/**
 * Vietnamese Compound Words - Main Entry Point
 */

export { loadCompoundData, getCompoundMarkers } from './data-loader.js';
export { normalizeVietnamese } from './detector.js';
export { 
  safelyMergeCompounds, 
  hasCompoundMarkers,
  fixCompoundBoundaries 
} from './merger.js';
export { 
  splitIntoWordsWithCompounds, 
  countWordsWithCompounds,
  validateWordCountConsistency 
} from './splitter.js';
export { formatCompoundsForDisplay, extractCompounds, removeCompoundMarkers } from './formatter.js';