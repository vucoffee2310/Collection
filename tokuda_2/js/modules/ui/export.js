import { downloadFile, getVideoId } from './helpers.js';

// ✅ SIMPLIFIED: Use pre-sorted utterances
export const exportToSRT = (jsonData) => {
  let srtContent = '';
  let counter = 1;
  
  // ✅ Use pre-sorted utterances from metadata
  const allUtterances = jsonData._meta?.allUtterancesSorted || [];
  
  // ✅ Filter only MATCHED utterances with translations
  const translatedUtterances = allUtterances.filter(utt => {
    // Check if parent marker is MATCHED
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  });
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    // ✅ Use pre-formatted timestamps
    const startTime = utt.timestampSRT;
    const endTime = utt.endTimestampSRT;
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    srtContent += `${counter}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${originalText}\n`;
    if (translatedText) {
      // ✅ Use pre-detected language
      const isNonSpaced = ['ja', 'th', 'zh', 'lo', 'km'].includes(utt.detectedLanguage);
      if (isNonSpaced && translatedText.length > 40) {
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
  
  // ✅ Use pre-sorted utterances
  const allUtterances = jsonData._meta?.allUtterancesSorted || [];
  
  const translatedUtterances = allUtterances.filter(utt => {
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  });
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    // ✅ Use pre-formatted VTT timestamps
    const startTime = utt.timestampVTT;
    const endTime = utt.endTimestampVTT;
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${originalText}\n`;
    if (translatedText) {
      const isNonSpaced = ['ja', 'th', 'zh', 'lo', 'km'].includes(utt.detectedLanguage);
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
  
  // ✅ Use pre-sorted utterances
  const allUtterances = jsonData._meta?.allUtterancesSorted || [];
  
  const translatedUtterances = allUtterances.filter(utt => {
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  });
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    // ✅ Use original timestamp (human-readable)
    txtContent += `[${utt.timestamp}]\n`;
    txtContent += `${originalText}\n`;
    if (translatedText) {
      txtContent += `${translatedText}\n`;
    }
    txtContent += `\n`;
  });
  
  return txtContent;
};

const wrapNonSpacedText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  
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
  
  const lines = [];
  const chars = Array.from(text);
  
  for (let i = 0; i < chars.length; i += maxLength) {
    lines.push(chars.slice(i, i + maxLength).join(''));
  }
  
  return lines.join('\n');
};

const decodeHTMLEntities = (text) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
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