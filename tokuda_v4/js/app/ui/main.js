/**
 * UI Main Entry Point
 */

import { $, getVideoId } from '../utils/dom.js';
import { getPot } from '../utils/api.js';
import { convertSubtitlesToMarkedParagraphs } from '../core/subtitle-parser.js';
import { extractMarkersWithContext } from '../core/marker-extractor.js';
import { getLabel } from '../utils/helpers.js';
import { createStreamModal } from './modal.js';

const contentCache = new Map();
const jsonCache = new Map();
let lastClearedVideoId = null;

export const processTrack = async track => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;
  
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey);
  }
  
  const response = await getPot(videoId);
  const pot = response?.pot;
  
  if (!pot) {
    alert('Please enable subtitles and refresh the page');
    return null;
  }
  
  const xml = await fetch(`${track.baseUrl}&fromExt=true&c=WEB&pot=${pot}`).then(r => r.text());
  const { text, metadata } = convertSubtitlesToMarkedParagraphs(xml, track.languageCode);
  const content = `Translate into Vietnamese\n\n${text}`;
  
  const result = { content, metadata };
  contentCache.set(cacheKey, result);
  
  return result;
};

export const getOrCreateJSON = async (track) => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;
  
  if (jsonCache.has(cacheKey)) {
    return jsonCache.get(cacheKey);
  }
  
  const result = await processTrack(track);
  if (!result) return null;
  
  const json = extractMarkersWithContext(result.content, result.metadata);
  jsonCache.set(cacheKey, json);
  
  return json;
};

const btn = (text, handler, primary = false) => {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = `
    padding: 6px 12px;
    background: ${primary ? '#000' : '#fff'};
    color: ${primary ? '#fff' : '#000'};
    border: 1px solid #000;
    font-size: 12px;
    cursor: pointer;
    font-family: sans-serif;
  `;
  b.onmouseenter = () => b.style.background = primary ? '#333' : '#f0f0f0';
  b.onmouseleave = () => b.style.background = primary ? '#000' : '#fff';
  b.onclick = handler;
  return b;
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
    btn('Process Translation', async (e) => {
      e.preventDefault();
      const modal = createStreamModal(track, getOrCreateJSON, processTrack);
      document.body.append(modal);
      modal.querySelector('textarea')?.focus();
    }, true)
  );
  
  row.append(lang, actions);
  return row;
};

export const createUI = tracks => {
  $('#captionDownloadContainer')?.remove();
  
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
  
  const target = $('#bottom-row') || $('#meta #meta-contents #container #top-row');
  target?.parentNode?.insertBefore(container, target);
};