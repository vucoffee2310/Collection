/**
 * UI Main Entry Point
 * Creates and injects processor UI into YouTube page
 */

import { createProcessorUI, clearProcessorCache } from './processor.js';

export const createUI = (tracks) => {
  const existing = document.querySelector('#captionDownloadContainer');
  if (existing) existing.remove();

  clearProcessorCache();

  const container = document.createElement('div');
  container.id = 'captionDownloadContainer';
  container.style.cssText = 'margin: 12px 0; font-family: sans-serif;';

  if (!tracks?.length) {
    container.innerHTML = `
      <div style="padding: 10px; background: #f0f0f0; border: 1px solid #ccc; color: #000; font-size: 12px; border-radius: 4px;">
        No subtitles available
      </div>
    `;
  } else {
    const title = document.createElement('div');
    title.style.cssText =
      'font-size: 14px; font-weight: bold; color: #000; margin-bottom: 10px;';
    title.textContent = `Translation Processor (${tracks.length} subtitle${
      tracks.length > 1 ? 's' : ''
    })`;
    container.appendChild(title);

    const primaryTrack = tracks[0];
    container.appendChild(createProcessorUI(primaryTrack));

    if (tracks.length > 1) {
      const info = document.createElement('div');
      info.style.cssText = 'font-size: 11px; color: #666; margin-top: 8px;';
      const getTrackLabel = (track) =>
        track?.name?.simpleText ||
        track?.name?.runs?.map((r) => r.text).join('') ||
        track?.languageName?.simpleText ||
        track?.languageCode ||
        'Unknown';
      info.textContent = `Available languages: ${tracks.map((t) => getTrackLabel(t)).join(', ')}`;
      container.appendChild(info);
    }
  }

  const target =
    document.querySelector('#bottom-row') ||
    document.querySelector('#meta #meta-contents #container #top-row');
  target?.parentNode?.insertBefore(container, target);
};