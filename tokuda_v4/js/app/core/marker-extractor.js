/**
 * Marker Extractor
 * Extracts markers with context from marked text
 */

import { combinations } from '../utils/dom.js';
import { formatSRTTime, formatVTTTime } from '../utils/helpers.js';

/**
 * Detect language from content
 * @param {string} text - Input text
 * @returns {string} - Language code
 */
const detectLanguage = (text) => {
  if (!text) return 'en';
  
  const cjkPattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/;
  const thaiPattern = /[\u0E00-\u0E7F]/;
  const laoPattern = /[\u0E80-\u0EFF]/;
  const khmerPattern = /[\u1780-\u17FF]/;
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  
  if (thaiPattern.test(text)) return 'th';
  if (laoPattern.test(text)) return 'lo';
  if (khmerPattern.test(text)) return 'km';
  if (vietnamesePattern.test(text)) return 'vi';
  if (cjkPattern.test(text)) {
    if (/[\u3040-\u309F]/.test(text)) return 'ja'; // Hiragana
    if (/[\u30A0-\u30FF]/.test(text)) return 'ja'; // Katakana
    return 'zh'; // Chinese
  }
  
  return 'en';
};

/**
 * Extract markers with context from marked text
 * Creates structured JSON with pre-calculated metadata
 * @param {string} text - Marked text
 * @param {Array} utteranceData - Array of utterance metadata
 * @returns {Object} - Structured marker data with metadata
 */
export const extractMarkersWithContext = (text, utteranceData = []) => {
  const clean = text.replace(/^Translate into Vietnamese\n\n/, '');
  const pattern = /\(([a-z])\)\s*/g;
  const positions = [];
  
  // Find all marker positions
  for (let m; (m = pattern.exec(clean));) {
    positions.push({ 
      letter: m[1], 
      start: m.index, 
      end: m.index + m[0].length 
    });
  }
  
  // Extract marker content and build initial structure
  const letterCount = {};
  const markers = positions.map((pos, i) => {
    const content = clean.slice(pos.end, positions[i + 1]?.start).trim();
    letterCount[pos.letter] = (letterCount[pos.letter] || 0) + 1;
    const uttData = utteranceData[i] || {};
    
    return { 
      letter: pos.letter, 
      content, 
      position: i + 1, 
      indexInDomain: letterCount[pos.letter],
      ...uttData
    };
  });
  
  const totalMarkers = markers.length;
  
  /**
   * Get previous markers as array
   */
  const getPrev = (idx, n) => idx < n ? [] : 
    markers.slice(idx - n, idx).map(m => `(${m.letter})`);
  
  // Add context (previous markers) to each marker
  markers.forEach((m, i) => {
    if (i < 3) {
      // Edge case: first 3 markers
      m.edgeCase = i === 0 ? "start" : "partial";
      for (let j = 0; j <= i; j++) {
        m[`prev${j}`] = getPrev(i, j);
      }
    } else {
      // Normal case: calculate all combinations
      const [p5, p4, p3] = [getPrev(i, 5), getPrev(i, 4), getPrev(i, 3)];
      Object.assign(m, {
        prev5: p5, 
        prev4: p4, 
        prev3: p3,
        prev5Choose4: p5.length === 5 ? combinations(p5, 4) : [],
        prev5Choose3: p5.length === 5 ? combinations(p5, 3) : [],
        prev4Choose3: p4.length === 4 ? combinations(p4, 3) : []
      });
    }
  });
  
  // Build global sorted utterance list
  const allUtterances = [];
  let globalUtteranceIndex = 0;
  
  const grouped = {};
  
  // Process each marker and enhance utterances
  markers.forEach((m, markerIndex) => {
    const key = `(${m.letter})`;
    
    // Pre-calculate utterance properties
    const utterances = (m.utterances || []).map(utt => {
      const enhancedUtt = {
        ...utt,
        // Global index for sorting
        globalIndex: globalUtteranceIndex++,
        // Parent marker reference
        markerPosition: m.position,
        markerDomainIndex: `(${m.letter}-${m.indexInDomain})`,
        // Pre-formatted timestamps
        timestampSRT: utt.start !== undefined ? formatSRTTime(utt.start) : null,
        timestampVTT: utt.start !== undefined ? formatVTTTime(utt.start) : null,
        endTimestampSRT: utt.end !== undefined ? formatSRTTime(utt.end) : null,
        endTimestampVTT: utt.end !== undefined ? formatVTTTime(utt.end) : null,
        // Language detection
        detectedLanguage: detectLanguage(utt.utterance)
      };
      
      allUtterances.push(enhancedUtt);
      return enhancedUtt;
    });
    
    const contentLength = (m.content || '').length;
    const totalUtteranceWords = utterances.reduce((sum, u) => sum + (u.wordLength || 0), 0);
    const detectedLanguage = detectLanguage(m.content);
    
    // Pre-format context strings for UI
    const contextStrings = {};
    if (m.edgeCase) {
      for (let j = 0; j <= 2; j++) {
        const prevKey = `prev${j}`;
        if (m[prevKey] !== undefined) {
          contextStrings[prevKey] = JSON.stringify(m[prevKey]);
        }
      }
    } else {
      if (m.prev5) contextStrings.prev5 = JSON.stringify(m.prev5);
      if (m.prev4) contextStrings.prev4 = JSON.stringify(m.prev4);
      if (m.prev3) contextStrings.prev3 = JSON.stringify(m.prev3);
      if (m.prev5) contextStrings.prev5Choose4 = `${JSON.stringify(m.prev5)} (choose 4)`;
      if (m.prev5) contextStrings.prev5Choose3 = `${JSON.stringify(m.prev5)} (choose 3)`;
      if (m.prev4) contextStrings.prev4Choose3 = `${JSON.stringify(m.prev4)} (choose 3)`;
    }
    
    // Build instance object
    const instance = {
      domainIndex: `(${m.letter}-${m.indexInDomain})`,
      content: m.content,
      position: m.position,
      status: "GAP",
      overallTranslation: "",
      utterances: utterances,
      
      // Pre-calculated metrics
      contentLength: contentLength,
      totalUtteranceWords: totalUtteranceWords,
      utteranceCount: utterances.length,
      detectedLanguage: detectedLanguage,
      
      // Position metadata
      isFirstPosition: m.position === 1,
      isLastPosition: m.position === totalMarkers,
      isEdgePosition: m.position <= 3 || m.position >= totalMarkers - 2,
      nextPosition: m.position < totalMarkers ? m.position + 1 : null,
      prevPosition: m.position > 1 ? m.position - 1 : null,
      
      // Global utterance range
      globalUtteranceStartIndex: utterances.length > 0 ? utterances[0].globalIndex : null,
      globalUtteranceEndIndex: utterances.length > 0 ? utterances[utterances.length - 1].globalIndex : null,
      
      // Pre-formatted context strings
      contextStrings: contextStrings,
      
      // Total duration
      totalDuration: utterances.reduce((sum, u) => sum + (u.duration || 0), 0),
      
      // Context (existing)
      ...(m.edgeCase && { edgeCase: m.edgeCase }),
      ...Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith('prev')))
    };
    
    (grouped[key] ??= []).push(instance);
  });
  
  // Sort utterances by start time
  allUtterances.sort((a, b) => (a.start || 0) - (b.start || 0));
  
  // Build fast lookup maps
  const positionMap = new Map();
  const globalUtteranceMap = new Map();
  
  Object.values(grouped).forEach(instances => {
    instances.forEach(instance => {
      positionMap.set(instance.position, instance);
    });
  });
  
  allUtterances.forEach(utt => {
    globalUtteranceMap.set(utt.globalIndex, utt);
  });
  
  // Calculate overall statistics
  const totalDuration = allUtterances.length > 0 
    ? (allUtterances[allUtterances.length - 1].end || 0) - (allUtterances[0].start || 0)
    : 0;
  
  const totalWords = markers.reduce((sum, m) => 
    sum + (m.utterances || []).reduce((s, u) => s + (u.wordLength || 0), 0), 0
  );
  
  // Language statistics
  const languageStats = {};
  allUtterances.forEach(utt => {
    const lang = utt.detectedLanguage;
    languageStats[lang] = (languageStats[lang] || 0) + 1;
  });
  
  const primaryLanguage = Object.entries(languageStats)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';
  
  return {
    totalMarkers: totalMarkers,
    totalUniqueMarkers: Object.keys(grouped).length,
    markers: Object.fromEntries(Object.keys(grouped).sort().map(k => [k, grouped[k]])),
    
    // Pre-built lookup maps and metadata
    _meta: {
      positionMap: Array.from(positionMap.entries()),
      globalUtteranceMap: Array.from(globalUtteranceMap.entries()),
      
      // Global sorted utterance list (ready for export)
      allUtterancesSorted: allUtterances,
      
      // Statistics
      totalUtterances: allUtterances.length,
      totalDuration: totalDuration,
      totalWords: totalWords,
      averageWordsPerUtterance: allUtterances.length > 0 ? (totalWords / allUtterances.length).toFixed(2) : 0,
      
      // Language metadata
      primaryLanguage: primaryLanguage,
      languageStats: languageStats,
      
      // Timestamp ranges
      startTime: allUtterances[0]?.start || 0,
      endTime: allUtterances[allUtterances.length - 1]?.end || 0
    }
  };
};