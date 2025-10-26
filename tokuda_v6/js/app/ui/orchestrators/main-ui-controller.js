/**
 * Main UI Controller
 * Manages main YouTube UI integration
 */

import { $, createElement } from '../../../utils/dom/query.js';
import { getVideoId } from '../../../utils/dom/video-id.js';
import { getPot } from '../../../utils/api/pot-manager.js';
import { parseSubtitlesWithTiming } from '../../core/subtitle/parser.js';
import { convertSubtitlesToMarkedParagraphs } from '../../core/subtitle/transformer.js';
import { extractMarkersWithContext } from '../../core/matching/marker-extractor.js';
import { createStreamModal } from './modal-controller.js';
import { loadCompoundData } from '../../languages/vietnamese/compound-loader.js';

/**
 * Caches
 */
const contentCache = new Map();
const jsonCache = new Map();
let lastClearedVideoId = null;
let compoundDataLoaded = false;

/**
 * Ensure compound data is loaded
 */
const ensureCompoundDataLoaded = async () => {
  if (!compoundDataLoaded) {
    await loadCompoundData();
    compoundDataLoaded = true;
  }
};

/**
 * Get track label
 * @param {Object} track - Track object
 * @returns {string} - Track label
 */
const getLabel = (track) => {
  return track?.name?.simpleText ||
         track?.name?.runs?.map(r => r.text).join('') ||
         track?.languageName?.simpleText ||
         track?.languageCode ||
         'Unknown';
};

/**
 * Process track
 * @param {Object} track - Track object
 * @returns {Promise<Object>} - Processed content
 */
export const processTrack = async (track) => {
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
  const utteranceData = parseSubtitlesWithTiming(xml, track.languageCode);
  const { text, metadata } = convertSubtitlesToMarkedParagraphs(utteranceData, track.languageCode);
  const content = `Translate into Vietnamese\n\n${text}`;
  
  const result = { content, metadata };
  contentCache.set(cacheKey, result);
  
  return result;
};

/**
 * Get or create JSON
 * @param {Object} track - Track object
 * @returns {Promise<Object>} - JSON object
 */
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

/**
 * Create button
 * @param {string} text - Button text
 * @param {Function} handler - Click handler
 * @param {boolean} primary - Primary style
 * @returns {HTMLElement} - Button element
 */
const createButton = (text, handler, primary = false) => {
  const btn = createElement('button', {
    style: {
      padding: '6px 12px',
      background: primary ? '#000' : '#fff',
      color: primary ? '#fff' : '#000',
      border: '1px solid #000',
      fontSize: '12px',
      cursor: 'pointer',
      fontFamily: 'sans-serif'
    }
  }, text);
  
  btn.onmouseenter = () => btn.style.background = primary ? '#333' : '#f0f0f0';
  btn.onmouseleave = () => btn.style.background = primary ? '#000' : '#fff';
  btn.onclick = handler;
  
  return btn;
};

/**
 * Create track row
 * @param {Object} track - Track object
 * @returns {HTMLElement} - Track row element
 */
const createTrackRow = (track) => {
  const row = createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px',
      background: '#fff',
      border: '1px solid #ccc',
      marginBottom: '8px'
    }
  });
  
  const lang = createElement('div', {
    style: {
      flex: '0 0 180px',
      fontWeight: 'bold',
      color: '#000',
      fontSize: '12px'
    }
  }, getLabel(track));
  
  const actions = createElement('div', {
    style: {
      display: 'flex',
      gap: '6px'
    }
  });
  
  const processBtn = createButton('Process Translation', async (e) => {
    e.preventDefault();
    
    await ensureCompoundDataLoaded();
    
    const modal = await createStreamModal({
      track,
      getOrCreateJSON,
      processTrack
    });
    
    document.body.appendChild(modal);
    modal.querySelector('textarea')?.focus();
  }, true);
  
  actions.appendChild(processBtn);
  row.append(lang, actions);
  
  return row;
};

/**
 * Create main UI
 * @param {Array} tracks - Subtitle tracks
 */
export const createUI = (tracks) => {
  // Remove existing container
  $('#captionDownloadContainer')?.remove();
  
  // Clear cache on video change
  const currentVideoId = getVideoId();
  if (currentVideoId !== lastClearedVideoId) {
    contentCache.clear();
    jsonCache.clear();
    lastClearedVideoId = currentVideoId;
  }
  
  const container = createElement('div', {
    id: 'captionDownloadContainer',
    style: {
      margin: '12px 0',
      fontFamily: 'sans-serif'
    }
  });
  
  if (!tracks?.length) {
    container.innerHTML = '<div style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc; color: #000; font-size: 12px;">No subtitles available</div>';
  } else {
    const title = createElement('div', {
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#000',
        marginBottom: '10px'
      }
    }, `Subtitle Tools (${tracks.length})`);
    
    container.appendChild(title);
    tracks.forEach(track => container.appendChild(createTrackRow(track)));
  }
  
  const target = $('#bottom-row') || $('#meta #meta-contents #container #top-row');
  target?.parentNode?.insertBefore(container, target);
};