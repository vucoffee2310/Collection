import { formatSRTTime, formatVTTTime, decodeHTMLEntities, downloadFile, getVideoId } from './helpers.js';

// ✅ NEW: Detect if text is likely from a non-spaced language
const detectNonSpacedLanguage = (text) => {
  if (!text) return false;
  
  // Check for CJK characters (Chinese, Japanese, Korean)
  const cjkPattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/;
  // Check for Thai characters
  const thaiPattern = /[\u0E00-\u0E7F]/;
  // Check for Lao characters
  const laoPattern = /[\u0E80-\u0EFF]/;
  // Check for Khmer characters
  const khmerPattern = /[\u1780-\u17FF]/;
  
  return cjkPattern.test(text) || thaiPattern.test(text) || 
         laoPattern.test(text) || khmerPattern.test(text);
};

export const exportToSRT = (jsonData) => {
  let srtContent = '';
  let counter = 1;
  
  const allUtterances = [];
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(instance => {
      if (instance.status === 'MATCHED' && instance.utterances) {
        instance.utterances.forEach(utt => {
          allUtterances.push(utt);
        });
      }
    });
  });
  
  allUtterances.sort((a, b) => a.start - b.start);
  
  allUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    const startTime = formatSRTTime(utt.start);
    const endTime = formatSRTTime(utt.end);
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    // ✅ IMPROVED: Handle line breaks appropriately
    const isNonSpaced = detectNonSpacedLanguage(translatedText);
    
    srtContent += `${counter}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${originalText}\n`;
    if (translatedText) {
      // For non-spaced languages, might need to wrap long lines
      if (isNonSpaced && translatedText.length > 40) {
        // Split into multiple lines at reasonable points
        const wrapped = wrapNonSpacedText(translatedText, 40);
        srtContent += `${wrapped}\n`;
      } else {
        srtContent += `${translatedText}\n`;
      }
    }
    srtContent += `\n`;
    counter++;
  });
  
  return srtContent;
};

export const exportToVTT = (jsonData) => {
  let vttContent = 'WEBVTT\n\n';
  
  const allUtterances = [];
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(instance => {
      if (instance.status === 'MATCHED' && instance.utterances) {
        instance.utterances.forEach(utt => {
          allUtterances.push(utt);
        });
      }
    });
  });
  
  allUtterances.sort((a, b) => a.start - b.start);
  
  allUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    const startTime = formatVTTTime(utt.start);
    const endTime = formatVTTTime(utt.end);
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    const isNonSpaced = detectNonSpacedLanguage(translatedText);
    
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${originalText}\n`;
    if (translatedText) {
      if (isNonSpaced && translatedText.length > 40) {
        const wrapped = wrapNonSpacedText(translatedText, 40);
        vttContent += `${wrapped}\n`;
      } else {
        vttContent += `${translatedText}\n`;
      }
    }
    vttContent += `\n`;
  });
  
  return vttContent;
};

export const exportToTXT = (jsonData) => {
  let txtContent = '';
  
  const allUtterances = [];
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(instance => {
      if (instance.status === 'MATCHED' && instance.utterances) {
        instance.utterances.forEach(utt => {
          allUtterances.push(utt);
        });
      }
    });
  });
  
  allUtterances.sort((a, b) => a.start - b.start);
  
  allUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    txtContent += `[${utt.timestamp}]\n`;
    txtContent += `${originalText}\n`;
    if (translatedText) {
      txtContent += `${translatedText}\n`;
    }
    txtContent += `\n`;
  });
  
  return txtContent;
};

// ✅ NEW: Wrap non-spaced language text at grapheme boundaries
const wrapNonSpacedText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  
  // Use Intl.Segmenter if available for grapheme-aware wrapping
  if (typeof Intl?.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
      const graphemes = Array.from(segmenter.segment(text)).map(s => s.segment);
      
      const lines = [];
      let currentLine = '';
      
      for (const grapheme of graphemes) {
        if (currentLine.length + grapheme.length > maxLength && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = grapheme;
        } else {
          currentLine += grapheme;
        }
      }
      
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      
      return lines.join('\n');
    } catch (err) {
      console.warn('Grapheme wrapping failed:', err);
    }
  }
  
  // Fallback: simple character-based wrapping
  const lines = [];
  const chars = Array.from(text); // Handles surrogate pairs
  
  for (let i = 0; i < chars.length; i += maxLength) {
    lines.push(chars.slice(i, i + maxLength).join(''));
  }
  
  return lines.join('\n');
};

export const downloadSRT = (jsonData) => {
  const content = exportToSRT(jsonData);
  const filename = `${getVideoId()}_translated.srt`;
  downloadFile(content, filename, 'text/plain');
};

export const downloadVTT = (jsonData) => {
  const content = exportToVTT(jsonData);
  const filename = `${getVideoId()}_translated.vtt`;
  downloadFile(content, filename, 'text/vtt');
};

export const downloadTXT = (jsonData) => {
  const content = exportToTXT(jsonData);
  const filename = `${getVideoId()}_translated.txt`;
  downloadFile(content, filename, 'text/plain');
};