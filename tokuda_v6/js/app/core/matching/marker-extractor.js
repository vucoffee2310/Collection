/**
 * Marker Extractor (REFACTORED)
 * Extracts markers from translation text with context
 */

import { detectLanguage } from '../../languages/core/language-detector.js';
import { formatSRTTime, formatVTTTime } from '../../utils/formatting/time-formatter.js';
import { buildMarkerContext } from './context-builder.js';

/**
 * Extract markers with context from translation text
 * @param {string} text - Translation text with markers
 * @param {Array<Object>} utteranceData - Utterance metadata
 * @returns {Object} - Extracted markers structure
 */
export const extractMarkersWithContext = (text, utteranceData = []) => {
  // Remove prefix if present
  const clean = text.replace(/^Translate into Vietnamese\n\n/, '');
  
  // Extract marker positions
  const pattern = /\(([a-z])\)\s*/g;
  const positions = [];
  
  for (let m; (m = pattern.exec(clean));) {
    positions.push({
      letter: m[1],
      start: m.index,
      end: m.index + m[0].length
    });
  }
  
  // Build marker objects
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
  
  // Add context to each marker
  const completedMarkers = [];
  markers.forEach((m, i) => {
    const context = buildMarkerContext(completedMarkers, m.position);
    Object.assign(m, context);
    
    completedMarkers.push({
      marker: `(${m.letter})`,
      position: m.position
    });
  });
  
  // Group markers and enrich with metadata
  const grouped = groupMarkers(markers, totalMarkers);
  
  // Build metadata
  const meta = buildMetadata(markers);
  
  return {
    totalMarkers: totalMarkers,
    totalUniqueMarkers: Object.keys(grouped).length,
    markers: grouped,
    _meta: meta
  };
};

/**
 * Group markers by letter
 * @private
 */
const groupMarkers = (markers, totalMarkers) => {
  const grouped = {};
  const allUtterances = [];
  let globalUtteranceIndex = 0;
  
  markers.forEach((m) => {
    const key = `(${m.letter})`;
    
    // Process utterances
    const utterances = (m.utterances || []).map(utt => {
      const enhanced = {
        ...utt,
        globalIndex: globalUtteranceIndex++,
        markerPosition: m.position,
        markerDomainIndex: `(${m.letter}-${m.indexInDomain})`,
        timestampSRT: utt.start !== undefined ? formatSRTTime(utt.start) : null,
        timestampVTT: utt.start !== undefined ? formatVTTTime(utt.start) : null,
        endTimestampSRT: utt.end !== undefined ? formatSRTTime(utt.end) : null,
        endTimestampVTT: utt.end !== undefined ? formatVTTTime(utt.end) : null,
        detectedLanguage: detectLanguage(utt.utterance)
      };
      
      allUtterances.push(enhanced);
      return enhanced;
    });
    
    // Create instance
    const instance = {
      domainIndex: `(${m.letter}-${m.indexInDomain})`,
      content: m.content,
      position: m.position,
      status: "GAP",
      overallTranslation: "",
      utterances: utterances,
      
      contentLength: (m.content || '').length,
      totalUtteranceWords: utterances.reduce((sum, u) => sum + (u.wordLength || 0), 0),
      utteranceCount: utterances.length,
      detectedLanguage: detectLanguage(m.content),
      
      isFirstPosition: m.position === 1,
      isLastPosition: m.position === totalMarkers,
      isEdgePosition: m.position <= 3 || m.position >= totalMarkers - 2,
      nextPosition: m.position < totalMarkers ? m.position + 1 : null,
      prevPosition: m.position > 1 ? m.position - 1 : null,
      
      globalUtteranceStartIndex: utterances.length > 0 ? utterances[0].globalIndex : null,
      globalUtteranceEndIndex: utterances.length > 0 ? utterances[utterances.length - 1].globalIndex : null,
      
      totalDuration: utterances.reduce((sum, u) => sum + (u.duration || 0), 0),
      
      ...(m.edgeCase && { edgeCase: m.edgeCase }),
      ...Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith('prev')))
    };
    
    (grouped[key] ??= []).push(instance);
  });
  
  return grouped;
};

/**
 * Build metadata
 * @private
 */
const buildMetadata = (markers) => {
  const allUtterances = [];
  const positionMap = new Map();
  const globalUtteranceMap = new Map();
  
  markers.forEach(m => {
    const instance = {
      position: m.position,
      domainIndex: `(${m.letter}-${m.indexInDomain})`
    };
    positionMap.set(m.position, instance);
    
    (m.utterances || []).forEach(utt => {
      allUtterances.push(utt);
      if (utt.globalIndex !== undefined) {
        globalUtteranceMap.set(utt.globalIndex, utt);
      }
    });
  });
  
  allUtterances.sort((a, b) => (a.start || 0) - (b.start || 0));
  
  const languageStats = {};
  allUtterances.forEach(utt => {
    const lang = utt.detectedLanguage || 'en';
    languageStats[lang] = (languageStats[lang] || 0) + 1;
  });
  
  const primaryLanguage = Object.entries(languageStats)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';
  
  const totalDuration = allUtterances.length > 0
    ? (allUtterances[allUtterances.length - 1].end || 0) - (allUtterances[0].start || 0)
    : 0;
  
  const totalWords = markers.reduce((sum, m) =>
    sum + (m.utterances || []).reduce((s, u) => s + (u.wordLength || 0), 0), 0
  );
  
  return {
    positionMap: Array.from(positionMap.entries()),
    globalUtteranceMap: Array.from(globalUtteranceMap.entries()),
    allUtterancesSorted: allUtterances,
    totalUtterances: allUtterances.length,
    totalDuration: totalDuration,
    totalWords: totalWords,
    averageWordsPerUtterance: allUtterances.length > 0 ? (totalWords / allUtterances.length).toFixed(2) : 0,
    primaryLanguage: primaryLanguage,
    languageStats: languageStats,
    startTime: allUtterances[0]?.start || 0,
    endTime: allUtterances[allUtterances.length - 1]?.end || 0
  };
};