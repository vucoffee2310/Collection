/**
 * Subtitle Parser
 */

import { CONFIG, SPLIT_DELIMITER } from '../utils/config.js';
import { SeededRandom } from '../utils/helpers.js';
import { countWords } from '../utils/text/index.js';
import { mergeLowMarkerParagraphs, splitTextAtMiddle } from '../utils/text/index.js';

// ... rest of the file stays the same

const rng = new SeededRandom(CONFIG.RANDOM_SEED);

export const formatTimestamp = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const parseSubtitlesWithTiming = (xml, lang = 'en') => {
  const textElements = Array.from(
    new DOMParser()
      .parseFromString(xml, 'text/xml')
      .getElementsByTagName('text')
  );
  
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
  }).filter(item => item.utterance);
};

export const parseSubtitles = (xml, lang = 'en') => 
  parseSubtitlesWithTiming(xml, lang).map(item => item.utterance);

export const convertSubtitlesToMarkedParagraphs = (xml, lang = 'en') => {
  rng.reset(CONFIG.RANDOM_SEED);
  
  const utteranceData = parseSubtitlesWithTiming(xml, lang);
  const utterances = utteranceData.map(u => u.utterance);
  const paragraphs = [];
  const markerMetadata = [];
  
  for (let i = 0; i < utterances.length;) {
    const segCount = rng.nextInt(
      CONFIG.MIN_MARKERS_PER_PARAGRAPH, 
      CONFIG.MAX_MARKERS_PER_PARAGRAPH
    );
    const segments = [];
    
    for (let j = 0; j < segCount && i < utterances.length; j++) {
      const marker = `(${String.fromCharCode(97 + rng.nextInt(0, 25))})`;
      let text = '';
      const segmentUtterances = [];
      
      for (let k = 0; k < CONFIG.UTTERANCES_PER_SEGMENT && i < utterances.length; k++) {
        text += utterances[i] + ' ';
        segmentUtterances.push(utteranceData[i]);
        i++;
      }
      
      markerMetadata.push({
        utterances: segmentUtterances.map(u => ({
          utterance: u.utterance,
          timestamp: u.timestamp,
          start: u.start,
          end: u.end,
          duration: u.duration,
          index: u.index,
          wordLength: u.wordLength,
          elementTranslation: ""
        }))
      });
      
      segments.push({ marker, text: text.trim(), idx: j });
    }
    
    if (segments.length) {
      const longest = new Set(
        segments
          .slice()
          .sort((a, b) => b.text.length - a.text.length)
          .slice(0, CONFIG.SPLIT_COUNT)
          .map(s => s.idx)
      );
      
      const para = segments.map(s => {
        const full = `${s.marker} ${s.text}`;
        if (!longest.has(s.idx)) return full;
        
        const { before, after } = splitTextAtMiddle(full, lang);
        return `${before}${SPLIT_DELIMITER}${after}`;
      }).join(' ');
      
      paragraphs.push(para);
    }
  }
  
  const finalText = mergeLowMarkerParagraphs(
    paragraphs.join('\n\n').replace(new RegExp(SPLIT_DELIMITER, 'g'), '\n\n')
  );
  
  return { text: finalText, metadata: markerMetadata };
};