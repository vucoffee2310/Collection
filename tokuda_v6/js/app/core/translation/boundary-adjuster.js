/**
 * Boundary Adjuster
 * Smart adjustment of translation boundaries
 */

/**
 * Vietnamese words that shouldn't end a segment
 */
const VIETNAMESE_DONT_END_WITH = new Set([
  'và', 'hoặc', 'hay', 'nhưng', 'mà', 'nên', 'vì', 'do',
  'để', 'cho', 'với', 'của', 'trong', 'trên', 'dưới', 'ngoài',
  'các', 'những', 'một', 'mỗi', 'từng', 'bất', 'thật', 'rất',
  'đã', 'đang', 'sẽ', 'có', 'là', 'bị', 'được', 'hãy', 'không'
]);

/**
 * Vietnamese words that shouldn't start a segment
 */
const VIETNAMESE_DONT_START_WITH = new Set([
  'hơn', 'nhất', 'lắm', 'quá', 'thôi', 'được', 'rồi'
]);

/**
 * Clean word from compound markers
 * @private
 */
const cleanWord = (word) => {
  if (!word) return '';
  return word.replace(/[«»]/g, '').toLowerCase();
};

/**
 * Adjust word boundaries for Vietnamese
 * @param {Array<string>} words - Word array
 * @param {number} splitIndex - Proposed split index
 * @param {number} maxIndex - Maximum valid index
 * @returns {number} - Adjusted split index
 */
export const adjustVietnameseBoundary = (words, splitIndex, maxIndex) => {
  if (splitIndex <= 0 || splitIndex >= words.length) {
    return splitIndex;
  }
  
  if (splitIndex >= maxIndex) {
    return splitIndex;
  }
  
  const lastWord = cleanWord(words[splitIndex - 1]);
  const nextWord = cleanWord(words[splitIndex]);
  
  let adjusted = splitIndex;
  
  // If last word is a conjunction/preposition, include next word
  if (VIETNAMESE_DONT_END_WITH.has(lastWord) && adjusted < maxIndex) {
    adjusted++;
    console.log(`⚙️ Boundary adjust: "${lastWord}" shouldn't end → moved forward`);
  }
  
  // If next word is a comparative/superlative, pull it back
  if (VIETNAMESE_DONT_START_WITH.has(nextWord) && adjusted < maxIndex) {
    adjusted++;
    console.log(`⚙️ Boundary adjust: "${nextWord}" shouldn't start → moved forward`);
  }
  
  // Ensure we don't exceed max
  if (adjusted > maxIndex) {
    adjusted = maxIndex;
  }
  
  return adjusted;
};

/**
 * Adjust boundaries for all segments
 * @param {Array<Object>} segments - Segment allocation objects
 * @param {Array<string>} words - All words
 * @param {string} lang - Language code
 * @returns {Array<Object>} - Adjusted segments
 */
export const adjustAllBoundaries = (segments, words, lang = 'vi') => {
  if (lang !== 'vi') {
    return segments; // Only Vietnamese for now
  }
  
  let currentIndex = 0;
  
  return segments.map((seg, idx) => {
    const isLastSegment = idx === segments.length - 1;
    
    if (isLastSegment) {
      // Last segment takes all remaining
      return {
        ...seg,
        startIndex: currentIndex,
        endIndex: words.length
      };
    }
    
    const proposedEnd = currentIndex + seg.wordCount;
    const maxEnd = words.length;
    
    const adjustedEnd = adjustVietnameseBoundary(words, proposedEnd, maxEnd);
    
    const result = {
      ...seg,
      startIndex: currentIndex,
      endIndex: adjustedEnd,
      wordCount: adjustedEnd - currentIndex
    };
    
    currentIndex = adjustedEnd;
    return result;
  });
};

/**
 * Extract text from adjusted segments
 * @param {Array<Object>} adjustedSegments - Adjusted segments
 * @param {Array<string>} words - All words
 * @returns {Array<string>} - Text segments
 */
export const extractAdjustedSegments = (adjustedSegments, words) => {
  return adjustedSegments.map(seg => {
    return words.slice(seg.startIndex, seg.endIndex).join(' ').trim();
  });
};