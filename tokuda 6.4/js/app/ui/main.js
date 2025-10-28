/**
 * UI Main Entry Point
 * ✅ FIXED: Use POT retry logic
 */

import { getVideoId } from '../utils/dom.js';
import { getPotWithRetry } from '../utils/api.js';
import { convertSubtitlesToMarkedParagraphs } from '../core/subtitle-parser.js';
import { extractMarkersWithContext } from '../core/marker-extractor.js';
import { getLabel } from '../utils/helpers.js';
import { createStreamModal } from './modal/index.js';
import { loadCompoundData } from '../utils/compounds/index.js';

const contentCache = new Map();
const jsonCache = new Map();
let lastClearedVideoId = null;
let compoundDataLoaded = false;

const ensureCompoundDataLoaded = async () => {
  if (!compoundDataLoaded) {
    await loadCompoundData();
    compoundDataLoaded = true;
  }
};

export const processTrack = async track => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;
  
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }
  
  // ✅ Use retry logic
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
    
    // User-friendly error
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

export const getOrCreateJSON = async (track) => {
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

const createButton = (text, handler, isPrimary = false) => {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = `
    padding: 6px 12px;
    background: ${isPrimary ? '#000' : '#fff'};
    color: ${isPrimary ? '#fff' : '#000'};
    border: 1px solid #000;
    font-size: 12px;
    cursor: pointer;
    font-family: sans-serif;
  `;
  btn.onmouseenter = () => btn.style.background = isPrimary ? '#333' : '#f0f0f0';
  btn.onmouseleave = () => btn.style.background = isPrimary ? '#000' : '#fff';
  btn.onclick = handler;
  return btn;
};

const createTrackRow = (track) => {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #fff;
    border: 1px solid #ccc;
    margin-bottom: 8px;
  `;
  
  const lang = document.createElement('div');
  lang.style.cssText = 'flex: 0 0 180px; font-weight: bold; color: #000; font-size: 12px;';
  lang.textContent = getLabel(track);
  
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; gap: 6px;';
  
  actions.append(
    createButton('Process Translation', async (e) => {
      e.preventDefault();
      await ensureCompoundDataLoaded();
      const modal = await createStreamModal(track, getOrCreateJSON, processTrack);
      document.body.append(modal);
      modal.querySelector('textarea')?.focus();
    }, true)
  );
  
  row.append(lang, actions);
  return row;
};

export const createUI = tracks => {
  const existing = document.querySelector('#captionDownloadContainer');
  if (existing) existing.remove();
  
  const currentVideoId = getVideoId();
  if (currentVideoId !== lastClearedVideoId) {
    contentCache.clear();
    jsonCache.clear();
    lastClearedVideoId = currentVideoId;
  }
  
  const container = document.createElement('div');
  container.id = 'captionDownloadContainer';
  container.style.cssText = 'margin: 12px 0; font-family: sans-serif;';
  
  if (!tracks?.length) {
    container.innerHTML = '<div style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc; color: #000; font-size: 12px;">No subtitles available</div>';
  } else {
    const title = document.createElement('div');
    title.style.cssText = 'font-size: 14px; font-weight: bold; color: #000; margin-bottom: 10px;';
    title.textContent = `Subtitle Tools (${tracks.length})`;
    container.appendChild(title);
    
    tracks.forEach(track => container.appendChild(createTrackRow(track)));
  }
  
  const target = document.querySelector('#bottom-row') || document.querySelector('#meta #meta-contents #container #top-row');
  target?.parentNode?.insertBefore(container, target);
};