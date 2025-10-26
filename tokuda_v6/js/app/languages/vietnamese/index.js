/**
 * Vietnamese Module Exports
 */

export { normalizeVietnamese, isPunctuation, removeDiacritics } from './normalizer.js';
export { loadCompoundData, getCompoundTrie, isDataLoaded, getSuffixes } from './compound-loader.js';
export { isCompound, findCompounds, getPossibleCompounds } from './compound-matcher.js';
export { mergeVietnameseCompounds, removeCompoundMarkers, hasCompoundMarkers, COMPOUND_OPEN, COMPOUND_CLOSE } from './compound-merger.js';
export { extractCompounds, countWordsWithCompounds, splitIntoWordsWithCompounds, formatCompoundsForDisplay } from './compound-formatter.js';
export { fixCompoundBoundaries, checkBoundaries } from './boundary-fixer.js';