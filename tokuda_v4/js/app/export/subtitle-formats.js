/**
 * Subtitle Format Exports
 * Generate SRT, VTT, and TXT subtitle files from processed data
 */

import { downloadFile, getVideoId } from './helpers.js';

/**
 * Wrap text for non-spaced languages (handles long lines)
 * @param {string} text - Text to wrap
 * @param {number} maxLength - Maximum line length
 * @returns {string} - Wrapped text with newlines
 */
const wrapNonSpacedText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  
  // Try grapheme segmentation for proper wrapping
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
  
  // Fallback: simple character splitting
  const lines = [];
  const chars = Array.from(text);
  
  for (let i = 0; i < chars.length; i += maxLength) {
    lines.push(chars.slice(i, i + maxLength).join(''));
  }
  
  return lines.join('\n');
};

/**
 * Decode HTML entities in text
 * @param {string} text - Text with HTML entities
 * @returns {string} - Decoded text
 */
const decodeHTMLEntities = (text) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/**
 * Export to SRT format
 * @param {Object} jsonData - Processed JSON data
 * @returns {string} - SRT formatted content
 */
export const exportToSRT = (jsonData) => {
  let srtContent = '';
  let counter = 1;
  
  // Use pre-sorted utterances from metadata
  const allUtterances = jsonData._meta?.allUtterancesSorted || [];
  
  // Filter only MATCHED utterances with translations
  const translatedUtterances = allUtterances.filter(utt => {
    // Check if parent marker is MATCHED
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  });
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    // Use pre-formatted timestamps
    const startTime = utt.timestampSRT;
    const endTime = utt.endTimestampSRT;
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    srtContent += `${counter}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${originalText}\n`;
    
    if (translatedText) {
      // Use pre-detected language
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

/**
 * Export to VTT format
 * @param {Object} jsonData - Processed JSON data
 * @returns {string} - VTT formatted content
 */
export const exportToVTT = (jsonData) => {
  let vttContent = 'WEBVTT\n\n';
  
  // Use pre-sorted utterances
  const allUtterances = jsonData._meta?.allUtterancesSorted || [];
  
  const translatedUtterances = allUtterances.filter(utt => {
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  });
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    // Use pre-formatted VTT timestamps
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

/**
 * Export to TXT format (plain text with timestamps)
 * @param {Object} jsonData - Processed JSON data
 * @returns {string} - TXT formatted content
 */
export const exportToTXT = (jsonData) => {
  let txtContent = '';
  
  // Use pre-sorted utterances
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
    
    // Use original timestamp (human-readable)
    txtContent += `[${utt.timestamp}]\n`;
    txtContent += `${originalText}\n`;
    if (translatedText) {
      txtContent += `${translatedText}\n`;
    }
    txtContent += `\n`;
  });
  
  return txtContent;
};

/**
 * Download SRT file
 * @param {Object} jsonData - Processed JSON data
 */
export const downloadSRT = (jsonData) => {
  const content = exportToSRT(jsonData);
  const filename = `${getVideoId()}_translated.srt`;
  downloadFile(content, filename, 'text/plain');
};

/**
 * Download VTT file
 * @param {Object} jsonData - Processed JSON data
 */
export const downloadVTT = (jsonData) => {
  const content = exportToVTT(jsonData);
  const filename = `${getVideoId()}_translated.vtt`;
  downloadFile(content, filename, 'text/vtt');
};

/**
 * Download TXT file
 * @param {Object} jsonData - Processed JSON data
 */
export const downloadTXT = (jsonData) => {
  const content = exportToTXT(jsonData);
  const filename = `${getVideoId()}_translated.txt`;
  downloadFile(content, filename, 'text/plain');
};