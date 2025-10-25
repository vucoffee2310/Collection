import { $, getVideoId } from '../utils.js';
import { getPot } from '../api.js';
import { convertSubtitlesToMarkedParagraphs } from '../subs.js';
import { extractMarkersWithContext } from '../markers.js';
import { getLabel } from './helpers.js';
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
    padding: 8px 14px;
    background: ${primary ? '#0066cc' : '#fff'};
    color: ${primary ? '#fff' : '#333'};
    border: 1px solid ${primary ? '#0066cc' : '#ddd'};
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    transition: all 0.15s;
  `;
  b.onmouseenter = () => b.style.background = primary ? '#0052a3' : '#f5f5f5';
  b.onmouseleave = () => b.style.background = primary ? '#0066cc' : '#fff';
  b.onclick = handler;
  return b;
};

const createTrackRow = (track) => {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    margin-bottom: 12px;
  `;
  
  const lang = document.createElement('div');
  lang.style.cssText = 'flex: 0 0 180px; font-weight: 600; color: #333; font-size: 14px;';
  lang.textContent = getLabel(track);
  
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
  
  actions.append(
    btn('SSE Simulator', async (e) => {
      e.preventDefault();
      const modal = createStreamModal(track, getOrCreateJSON, processTrack);
      document.body.append(modal);
      modal.querySelector('textarea').focus();
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
  container.style.cssText = 'margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
  
  if (!tracks?.length) {
    container.innerHTML = '<div style="padding: 12px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; color: #856404; font-size: 14px;">No subtitles available</div>';
  } else {
    const title = document.createElement('div');
    title.style.cssText = 'font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px;';
    title.textContent = `Subtitle Tools (${tracks.length})`;
    container.appendChild(title);
    
    tracks.forEach(track => container.appendChild(createTrackRow(track)));
  }
  
  const target = $('#bottom-row') || $('#meta #meta-contents #container #top-row');
  target?.parentNode?.insertBefore(container, target);
};