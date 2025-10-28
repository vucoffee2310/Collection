/**
 * Minimal Processor UI - JSON Output Only
 */

import { getVideoId, copyToClipboard } from '../utils/helpers.js';
import { getPotWithRetry } from '../utils/api.js';
import { convertSubtitlesToMarkedParagraphs } from '../core/subtitle-parser.js';
import { extractMarkersWithContext } from '../core/marker-extractor.js';
import { StreamingTranslationProcessor } from '../core/stream-processor/processor.js';  // ✅ CHANGED
import { loadCompoundData } from '../utils/compounds/data-loader.js';  // ✅ CHANGED
import { formatJSON, downloadFile } from '../utils/helpers.js';
import { getGlobalStats } from '../utils/json-helpers.js';

const contentCache = new Map();
const jsonCache = new Map();
let lastClearedVideoId = null;

const processTrack = async (track) => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;
  
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }
  
  try {
    const response = await getPotWithRetry(videoId);
    const pot = response?.pot;
    
    if (!pot) {
      throw new Error('Unable to obtain POT token');
    }
    
    const xml = await fetch(`${track.baseUrl}&fromExt=true&c=WEB&pot=${pot}`).then(r => r.text());
    const { text, metadata, language } = convertSubtitlesToMarkedParagraphs(xml, track.languageCode);
    const content = `Translate into Vietnamese\n\n\`\`\`\n---\nhttps://www.udemy.com/742828/039131.php\n---\n\n${text}\n\`\`\``;
    
    const result = { content, metadata, language };
    contentCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Failed to process track:', error);
    let message = 'Failed to load subtitles: ';
    if (error.message.includes('POT')) {
      message += 'Token refresh failed. Please refresh the page and try again.';
    } else {
      message += error.message;
    }
    alert(message);
    throw error;
  }
};

const getOrCreateJSON = async (track) => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;
  
  if (jsonCache.has(cacheKey)) {
    return jsonCache.get(cacheKey);
  }
  
  const result = await processTrack(track);
  if (!result) return null;
  
  const json = extractMarkersWithContext(result.content, result.metadata, result.language);
  json.sourceLanguage = result.language;
  
  jsonCache.set(cacheKey, json);
  return json;
};

export const createProcessorUI = (track) => {
  const container = document.createElement('div');
  container.style.cssText = `
    padding: 12px;
    background: #f5f5f5;
    border: 1px solid #ccc;
    margin: 8px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    border-radius: 4px;
  `;
  
  const title = document.createElement('div');
  title.style.cssText = 'font-weight: bold; margin-bottom: 8px; font-size: 13px; color: #000;';
  title.textContent = '🌐 AI Studio Translation Processor';
  
  const status = document.createElement('div');
  status.style.cssText = 'font-size: 11px; color: #666; margin-bottom: 8px; line-height: 1.4;';
  status.textContent = 'Ready to process';
  
  const button = document.createElement('button');
  button.textContent = 'Process Translation';
  button.style.cssText = `
    padding: 8px 16px;
    background: #000;
    color: white;
    border: 1px solid #000;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    border-radius: 4px;
    margin-right: 8px;
  `;
  button.onmouseenter = () => { if (!button.disabled) button.style.background = '#333'; };
  button.onmouseleave = () => { if (!button.disabled) button.style.background = '#000'; };
  
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download JSON';
  downloadBtn.style.cssText = `
    padding: 8px 16px;
    background: white;
    color: #000;
    border: 1px solid #000;
    cursor: pointer;
    font-size: 12px;
    border-radius: 4px;
    margin-right: 8px;
    display: none;
  `;
  downloadBtn.onmouseenter = () => downloadBtn.style.background = '#f0f0f0';
  downloadBtn.onmouseleave = () => downloadBtn.style.background = 'white';
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy JSON';
  copyBtn.style.cssText = `
    padding: 8px 16px;
    background: white;
    color: #000;
    border: 1px solid #000;
    cursor: pointer;
    font-size: 12px;
    border-radius: 4px;
    display: none;
  `;
  copyBtn.onmouseenter = () => copyBtn.style.background = '#f0f0f0';
  copyBtn.onmouseleave = () => copyBtn.style.background = 'white';
  
  let processedJSON = null;
  
  button.onclick = async () => {
    button.disabled = true;
    button.textContent = 'Initializing...';
    button.style.opacity = '0.6';
    status.textContent = 'Loading compound data...';
    status.style.color = '#666';
    
    try {
      await loadCompoundData();
      
      const result = await processTrack(track);
      const cachedJSON = await getOrCreateJSON(track);
      
      if (!result || !cachedJSON) {
        throw new Error('Failed to load subtitle data');
      }
      
      const sourceJSON = JSON.parse(JSON.stringify(cachedJSON));
      const processor = new StreamingTranslationProcessor(sourceJSON);
      
      status.textContent = 'Opening AI Studio in new tab...';
      button.textContent = 'Waiting for AI Studio...';
      
      let lastProcessedText = "";
      let messageHandler = null;
      let timeoutId = null;
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (messageHandler) {
          window.removeEventListener('aiStudioMessage', messageHandler);
          messageHandler = null;
        }
      };
      
      timeoutId = setTimeout(() => {
        cleanup();
        status.textContent = '⏱️ Timeout: AI Studio took too long (5 minutes)';
        status.style.color = '#ff9800';
        button.textContent = 'Process Translation';
        button.disabled = false;
        button.style.opacity = '1';
      }, 300000);
      
      messageHandler = (event) => {
        const request = event.detail;
        
        if (request.action === 'aiStudioUpdate') {
          const chunk = request.currentText.substring(lastProcessedText.length);
          
          if (chunk) {
            try {
              processor.processChunk(chunk);
              
              const markerInfo = request.markerCount !== undefined && request.expectedMarkerCount !== undefined
                ? `${request.markerCount}/${request.expectedMarkerCount} markers`
                : '';
              
              const stats = `${processor.stats.matched} matched, ${processor.stats.merged} merged, ${processor.stats.orphaned} orphaned`;
              status.textContent = `Processing: ${stats} ${markerInfo ? '• ' + markerInfo : ''}`;
              status.style.color = '#2196F3';
            } catch (error) {
              console.error('❌ Error processing chunk:', error);
            }
          }
          
          lastProcessedText = request.currentText;
          
          if (request.isComplete) {
            try {
              processor.finalize();
              processedJSON = processor.getUpdatedJSON();
              
              copyToClipboard(formatJSON(processedJSON));
              
              const globalStats = getGlobalStats(processedJSON);
              const totalMarkers = sourceJSON.totalMarkers || 0;
              const successRate = totalMarkers > 0 
                ? ((processor.stats.matched + processor.stats.merged) / totalMarkers * 100).toFixed(1)
                : 0;
              
              status.innerHTML = `
                ✅ <strong>Complete!</strong> ${processor.stats.matched} matched, ${processor.stats.merged} merged, ${processor.stats.orphaned} orphaned
                <br>
                <span style="font-size: 10px;">Success rate: ${successRate}% • ${globalStats.totalUtterances} utterances • ${globalStats.totalWords} words • JSON copied to clipboard!</span>
              `;
              status.style.color = '#27ae60';
              
              button.textContent = 'Done ✓';
              button.style.background = '#27ae60';
              
              downloadBtn.style.display = 'inline-block';
              copyBtn.style.display = 'inline-block';
              
              cleanup();
              
              setTimeout(() => {
                button.textContent = 'Process Translation';
                button.style.background = '#000';
                button.disabled = false;
                button.style.opacity = '1';
              }, 3000);
              
            } catch (error) {
              console.error('❌ Error finalizing:', error);
              status.textContent = `❌ Error during finalization: ${error.message}`;
              status.style.color = '#d32f2f';
            }
          }
        }
        
        if (request.action === 'aiStudioError' || request.action === 'aiStudioClosed') {
          const isError = request.action === 'aiStudioError';
          status.textContent = isError ? `❌ Error: ${request.error}` : '⚠️ AI Studio tab was closed';
          status.style.color = isError ? '#d32f2f' : '#ff9800';
          button.textContent = 'Process Translation';
          button.disabled = false;
          button.style.opacity = '1';
          cleanup();
        }
        
        if (request.action === 'aiStudioStarted') {
          status.textContent = 'AI Studio automation started, waiting for response...';
          button.textContent = 'Processing...';
          status.style.color = '#2196F3';
        }
      };
      
      window.addEventListener('aiStudioMessage', messageHandler);
      
      chrome.runtime.sendMessage({
        action: 'openAIStudio',
        promptText: result.content,
        cardName: `Translation: ${track.languageCode || 'Unknown'}`
      }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          status.textContent = '❌ Failed to open AI Studio tab';
          status.style.color = '#d32f2f';
          button.textContent = 'Process Translation';
          button.disabled = false;
          button.style.opacity = '1';
          cleanup();
        }
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      status.textContent = `❌ Error: ${error.message}`;
      status.style.color = '#d32f2f';
      button.textContent = 'Process Translation';
      button.disabled = false;
      button.style.opacity = '1';
    }
  };
  
  downloadBtn.onclick = () => {
    if (processedJSON) {
      const videoId = getVideoId();
      const filename = `${videoId}_translation.json`;
      downloadFile(formatJSON(processedJSON), filename, 'application/json');
      console.log(`✅ Downloaded JSON: ${filename}`);
      
      const originalText = downloadBtn.textContent;
      downloadBtn.textContent = 'Downloaded ✓';
      setTimeout(() => {
        downloadBtn.textContent = originalText;
      }, 2000);
    }
  };
  
  copyBtn.onclick = () => {
    if (processedJSON) {
      copyToClipboard(formatJSON(processedJSON));
      console.log('✅ JSON copied to clipboard');
      
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }
  };
  
  container.append(title, status, button, downloadBtn, copyBtn);
  return container;
};

export const clearCache = () => {
  const currentVideoId = getVideoId();
  if (currentVideoId !== lastClearedVideoId) {
    contentCache.clear();
    jsonCache.clear();
    lastClearedVideoId = currentVideoId;
  }
};