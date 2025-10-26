/**
 * Paragraph Merger Utility
 * Merges paragraphs with insufficient markers
 */

/**
 * Count markers in text
 * @param {string} text - Text to analyze
 * @returns {number} - Number of markers found
 */
const countMarkers = (text) => {
  if (!text || typeof text !== 'string') return 0;
  const matches = text.match(/\([a-z]\)/g);
  return matches ? matches.length : 0;
};

/**
 * Merge paragraphs with low marker counts
 * Ensures each paragraph has at least 2 markers
 * 
 * @param {string} text - Text with paragraphs separated by \n\n
 * @param {number} minMarkers - Minimum markers per paragraph (default: 2)
 * @returns {string} - Merged text
 * 
 * @example
 * mergeLowMarkerParagraphs("(a) Hello\n\n(b) World (c) Test")
 * // => "(a) Hello (b) World (c) Test" (merged first para into second)
 */
export const mergeLowMarkerParagraphs = (text, minMarkers = 2) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  let paragraphs = text
    .split('\n\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  if (paragraphs.length === 0) {
    return '';
  }
  
  // Iteratively merge until no changes
  let changed = true;
  
  while (changed) {
    changed = false;
    
    // Iterate backwards to safely splice
    for (let i = paragraphs.length - 1; i >= 0; i--) {
      const markerCount = countMarkers(paragraphs[i]);
      
      // Skip if meets minimum or only one paragraph left
      if (markerCount >= minMarkers || paragraphs.length === 1) {
        continue;
      }
      
      const prev = paragraphs[i - 1];
      const next = paragraphs[i + 1];
      
      // Can't merge if no neighbors
      if (!prev && !next) {
        continue;
      }
      
      // Decide merge direction (prefer shorter paragraph)
      const mergeWithPrev = prev && (!next || prev.length <= next.length);
      
      if (mergeWithPrev) {
        // Merge current into previous
        paragraphs[i - 1] = prev + ' ' + paragraphs[i];
        paragraphs.splice(i, 1);
      } else {
        // Merge current into next
        paragraphs[i + 1] = paragraphs[i] + ' ' + next;
        paragraphs.splice(i, 1);
      }
      
      changed = true;
    }
  }
  
  return paragraphs.join('\n\n');
};

/**
 * Get paragraph statistics
 * @param {string} text - Text to analyze
 * @returns {Object} - Statistics object
 */
export const getParagraphStats = (text) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  const stats = paragraphs.map(p => ({
    length: p.length,
    markers: countMarkers(p),
    wordCount: p.split(/\s+/).filter(w => w.length > 0).length
  }));
  
  return {
    total: paragraphs.length,
    avgLength: stats.reduce((sum, s) => sum + s.length, 0) / stats.length || 0,
    avgMarkers: stats.reduce((sum, s) => sum + s.markers, 0) / stats.length || 0,
    minMarkers: Math.min(...stats.map(s => s.markers)),
    maxMarkers: Math.max(...stats.map(s => s.markers)),
    details: stats
  };
};