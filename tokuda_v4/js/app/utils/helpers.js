/**
 * UI Helper Utilities
 * Common helpers for UI components
 */

/**
 * Extract label from YouTube track object
 * @param {Object} track - YouTube caption track object
 * @returns {string} - Human-readable label
 */
export const getLabel = track => 
  track?.name?.simpleText || 
  track?.name?.runs?.map(r => r.text).join('') || 
  track?.languageName?.simpleText || 
  track?.languageCode || 
  'Unknown';

/**
 * Create styled button element
 * @param {string} text - Button text
 * @param {string} color - Button color
 * @param {Function} handler - Click handler
 * @returns {HTMLElement} - Button element
 */
export const createBtn = (text, color, handler) => Object.assign(document.createElement('a'), {
  textContent: text,
  href: '#',
  style: `margin-left:8px;cursor:pointer;color:${color};font-weight:bold;text-decoration:underline`,
  onclick: handler
});

/**
 * Create stat display element
 * @param {string|number} value - Stat value
 * @param {string} label - Stat label
 * @param {string} color - Text color
 * @returns {Object} - {container, valueEl, labelEl}
 */
export const createStatElement = (value, label, color = 'white') => {
  const container = document.createElement('div');
  
  const valueEl = document.createElement('div');
  valueEl.style.cssText = `font-size: 24px; font-weight: bold; color: ${color};`;
  valueEl.textContent = value;
  
  const labelEl = document.createElement('div');
  labelEl.style.cssText = 'opacity: 0.9;';
  labelEl.textContent = label;
  
  container.appendChild(valueEl);
  container.appendChild(labelEl);
  
  return { container, valueEl, labelEl };
};

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted SRT timestamp
 */
export const formatSRTTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

/**
 * Format seconds to VTT timestamp (HH:MM:SS.mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted VTT timestamp
 */
export const formatVTTTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

/**
 * Decode HTML entities in text
 * @param {string} text - Text with HTML entities
 * @returns {string} - Decoded text
 */
export const decodeHTMLEntities = (text) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/**
 * Download file to user's system
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Get current video ID from URL
 * @returns {string} - Video ID or 'video' fallback
 */
export const getVideoId = () => new URL(location.href).searchParams.get('v') || 'video';