/**
 * Subtitle Parser
 * Parses YouTube XML subtitle format
 */

/**
 * Format timestamp to HH:MM:SS.mmm
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
export const formatTimestamp = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

/**
 * Count words in text (language-aware)
 * @param {string} text - Text to count
 * @param {string} lang - Language code
 * @returns {number} - Word count
 */
const countWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return 0;
  
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang)) {
    // For non-spaced languages, count characters
    return text.replace(/\s+/g, '').length;
  }
  
  // For spaced languages, count words
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

/**
 * Parse YouTube XML subtitles with timing information
 * @param {string} xml - XML subtitle content
 * @param {string} lang - Language code (default: 'en')
 * @returns {Array<Object>} - Array of subtitle entries
 * 
 * @example
 * parseSubtitlesWithTiming(xmlString, 'en')
 * // => [
 * //   {
 * //     utterance: "Hello world",
 * //     timestamp: "00:00:01.500",
 * //     start: 1.5,
 * //     end: 3.5,
 * //     duration: 2.0,
 * //     index: 0,
 * //     wordLength: 2
 * //   },
 * //   ...
 * // ]
 */
export const parseSubtitlesWithTiming = (xml, lang = 'en') => {
  if (!xml || typeof xml !== 'string') {
    return [];
  }
  
  try {
    // Parse XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    
    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('XML parsing failed');
    }
    
    // Extract text elements
    const textElements = Array.from(doc.getElementsByTagName('text'));
    
    return textElements.map((el, index) => {
      const start = parseFloat(el.getAttribute('start')) || 0;
      const dur = parseFloat(el.getAttribute('dur')) || 0;
      const text = el.textContent?.replace(/[\r\n]+/g, ' ').trim() || '';
      
      return {
        utterance: text,
        timestamp: formatTimestamp(start),
        start: start,
        end: start + dur,
        duration: dur,
        index: index,
        wordLength: countWords(text, lang)
      };
    }).filter(item => item.utterance); // Filter empty utterances
    
  } catch (err) {
    console.error('Failed to parse subtitles:', err);
    return [];
  }
};

/**
 * Parse subtitles without timing (text only)
 * @param {string} xml - XML subtitle content
 * @param {string} lang - Language code
 * @returns {Array<string>} - Array of utterances
 */
export const parseSubtitles = (xml, lang = 'en') => {
  return parseSubtitlesWithTiming(xml, lang).map(item => item.utterance);
};

/**
 * Get subtitle statistics
 * @param {string} xml - XML subtitle content
 * @param {string} lang - Language code
 * @returns {Object} - Statistics
 */
export const getSubtitleStats = (xml, lang = 'en') => {
  const entries = parseSubtitlesWithTiming(xml, lang);
  
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      totalDuration: 0,
      totalWords: 0,
      avgDuration: 0,
      avgWords: 0
    };
  }
  
  const totalDuration = entries[entries.length - 1].end - entries[0].start;
  const totalWords = entries.reduce((sum, e) => sum + e.wordLength, 0);
  
  return {
    totalEntries: entries.length,
    totalDuration: totalDuration,
    totalWords: totalWords,
    avgDuration: (totalDuration / entries.length).toFixed(2),
    avgWords: (totalWords / entries.length).toFixed(2),
    firstEntry: entries[0],
    lastEntry: entries[entries.length - 1]
  };
};