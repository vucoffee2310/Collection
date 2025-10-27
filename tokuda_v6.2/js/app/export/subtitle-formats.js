/**
 * Subtitle Format Exports
 * Generate timestamps on-demand from start/end values
 */

import { downloadFile, decodeHTMLEntities, formatSRTTime, formatVTTTime } from '../utils/helpers.js';
import { getVideoId } from './helpers.js';
import { getAllUtterancesSorted } from '../utils/json-helpers.js';

/**
 * Get translated utterances from processed JSON
 */
const getTranslatedUtterances = (jsonData) => {
  const allUtterances = getAllUtterancesSorted(jsonData);
  
  const translatedUtterances = allUtterances.filter(utt => {
    if (!utt.elementTranslation || !utt.elementTranslation.trim()) {
      return false;
    }
    
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    
    return parentMarker?.status === 'MATCHED';
  });
  
  console.log(`Found ${translatedUtterances.length} translated utterances`);
  
  return translatedUtterances;
};

export const exportToSRT = (jsonData) => {
  let srtContent = '';
  let counter = 1;
  
  const translatedUtterances = getTranslatedUtterances(jsonData);
  
  if (translatedUtterances.length === 0) {
    console.warn('No translated utterances found for SRT export');
    return '';
  }
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    const startTime = formatSRTTime(utt.start);
    const endTime = formatSRTTime(utt.end);
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    srtContent += `${counter}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${originalText}\n`;
    
    if (translatedText) {
      srtContent += `${translatedText}\n`;
    }
    
    srtContent += `\n`;
    counter++;
  });
  
  console.log(`Generated SRT content: ${srtContent.length} bytes`);
  return srtContent;
};

export const exportToVTT = (jsonData) => {
  let vttContent = 'WEBVTT\n\n';
  
  const translatedUtterances = getTranslatedUtterances(jsonData);
  
  if (translatedUtterances.length === 0) {
    console.warn('No translated utterances found for VTT export');
    return 'WEBVTT\n\n';
  }
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    const startTime = formatVTTTime(utt.start);
    const endTime = formatVTTTime(utt.end);
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${originalText}\n`;
    
    if (translatedText) {
      vttContent += `${translatedText}\n`;
    }
    
    vttContent += `\n`;
  });
  
  console.log(`Generated VTT content: ${vttContent.length} bytes`);
  return vttContent;
};

export const exportToTXT = (jsonData) => {
  let txtContent = '';
  
  const translatedUtterances = getTranslatedUtterances(jsonData);
  
  if (translatedUtterances.length === 0) {
    console.warn('No translated utterances found for TXT export');
    return '';
  }
  
  translatedUtterances.forEach(utt => {
    if (!utt.utterance) return;
    
    const timestamp = formatSRTTime(utt.start);
    const originalText = decodeHTMLEntities(utt.utterance);
    const translatedText = decodeHTMLEntities(utt.elementTranslation || '');
    
    txtContent += `[${timestamp}]\n`;
    txtContent += `${originalText}\n`;
    if (translatedText) {
      txtContent += `${translatedText}\n`;
    }
    txtContent += `\n`;
  });
  
  console.log(`Generated TXT content: ${txtContent.length} bytes`);
  return txtContent;
};

export const downloadSRT = (jsonData) => {
  const content = exportToSRT(jsonData);
  
  if (!content || content.length === 0) {
    alert('No translated content available to export. Please ensure you have processed the translation.');
    return;
  }
  
  const filename = `${getVideoId()}_translated.srt`;
  downloadFile(content, filename, 'text/plain');
  console.log(`Downloaded SRT: ${filename} (${content.length} bytes)`);
};

export const downloadVTT = (jsonData) => {
  const content = exportToVTT(jsonData);
  
  if (!content || content.length <= 8) {
    alert('No translated content available to export. Please ensure you have processed the translation.');
    return;
  }
  
  const filename = `${getVideoId()}_translated.vtt`;
  downloadFile(content, filename, 'text/vtt');
  console.log(`Downloaded VTT: ${filename} (${content.length} bytes)`);
};

export const downloadTXT = (jsonData) => {
  const content = exportToTXT(jsonData);
  
  if (!content || content.length === 0) {
    alert('No translated content available to export. Please ensure you have processed the translation.');
    return;
  }
  
  const filename = `${getVideoId()}_translated.txt`;
  downloadFile(content, filename, 'text/plain');
  console.log(`Downloaded TXT: ${filename} (${content.length} bytes)`);
};