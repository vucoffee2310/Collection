/**
 * Marker Extractor
 * Extracts markers with context and utterance data
 * Single source of truth: markers only (no _meta)
 */

import { combinations } from '../utils/dom.js';

export const extractMarkersWithContext = (text, utteranceData = []) => {
  const clean = text.replace(/^Translate into Vietnamese\n\n/, '');
  const pattern = /\(([a-z])\)\s*/g;
  const positions = [];
  
  for (let m; (m = pattern.exec(clean));) {
    positions.push({ 
      letter: m[1], 
      start: m.index, 
      end: m.index + m[0].length 
    });
  }
  
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
  
  const getPrev = (idx, n) => idx < n ? [] : 
    markers.slice(idx - n, idx).map(m => `(${m.letter})`);
  
  markers.forEach((m, i) => {
    if (i < 3) {
      m.edgeCase = i === 0 ? "start" : "partial";
      for (let j = 0; j <= i; j++) {
        m[`prev${j}`] = getPrev(i, j);
      }
    } else {
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
  
  const grouped = {};
  
  markers.forEach((m) => {
    const key = `(${m.letter})`;
    
    const utterances = (m.utterances || []).map(utt => {
      return {
        utterance: utt.utterance,
        start: utt.start,
        end: utt.end,
        duration: utt.duration,
        index: utt.index,
        wordLength: utt.wordLength,
        markerDomainIndex: `(${m.letter}-${m.indexInDomain})`,
        elementTranslation: ""
      };
    });
    
    const instance = {
      domainIndex: `(${m.letter}-${m.indexInDomain})`,
      content: m.content,
      position: m.position,
      status: "GAP",
      overallTranslation: "",
      utterances: utterances,
      
      ...(m.edgeCase && { edgeCase: m.edgeCase }),
      ...Object.fromEntries(Object.entries(m).filter(([k]) => k.startsWith('prev')))
    };
    
    (grouped[key] ??= []).push(instance);
  });
  
  return {
    totalMarkers: totalMarkers,
    totalUniqueMarkers: Object.keys(grouped).length,
    markers: Object.fromEntries(Object.keys(grouped).sort().map(k => [k, grouped[k]]))
  };
};