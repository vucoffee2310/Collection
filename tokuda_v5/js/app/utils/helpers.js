/**
 * Formatting, Helpers, and RNG Utilities
 */

// ===========================
// JSON Formatting
// ===========================

/**
 * Format JSON with custom indentation and array handling
 */
export const formatJSON = (obj, indent = 2) => {
  const sp = ' '.repeat(indent);
  const isArrOfArr = arr => Array.isArray(arr) && arr.length && arr.every(Array.isArray);
  const isArrOfObj = arr => arr.every(v => v?.constructor === Object);
  
  const fmt = (val, depth) => {
    const ind = sp.repeat(depth);
    const nxt = sp.repeat(depth + 1);
    
    if (val === null) return 'null';
    if (typeof val !== 'object') return JSON.stringify(val);
    
    if (Array.isArray(val)) {
      if (!val.length) return '[]';
      if (isArrOfArr(val)) return `[\n${val.map(v => nxt + JSON.stringify(v)).join(',\n')}\n${ind}]`;
      if (isArrOfObj(val)) return `[\n${val.map(v => nxt + fmt(v, depth + 1)).join(',\n')}\n${ind}]`;
      return JSON.stringify(val);
    }
    
    const entries = Object.entries(val).map(([k, v]) => `${nxt}"${k}": ${fmt(v, depth + 1)}`);
    return `{\n${entries.join(',\n')}\n${ind}}`;
  };
  
  return fmt(obj, 0);
};

// ===========================
// UI Helper Functions
// ===========================

/**
 * Extract label from YouTube track object
 */
export const getLabel = track => 
  track?.name?.simpleText || 
  track?.name?.runs?.map(r => r.text).join('') || 
  track?.languageName?.simpleText || 
  track?.languageCode || 
  'Unknown';

/**
 * Create stat display element
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

// ===========================
// Time Formatting
// ===========================

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
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
 */
export const formatVTTTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// ===========================
// Text Processing
// ===========================

/**
 * Decode HTML entities in text
 */
export const decodeHTMLEntities = (text) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// ===========================
// File Download
// ===========================

/**
 * Download file to user's system
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

// ===========================
// Seeded Random Number Generator
// ===========================

/**
 * Deterministic RNG for reproducible marker generation
 */
export class SeededRandom {
  constructor(seed) { 
    this.seed = seed; 
  }
  
  reset(seed) { 
    this.seed = seed; 
  }
  
  next() { 
    return (this.seed = (this.seed * 9301 + 49297) % 233280) / 233280; 
  }
  
  nextInt(min, max) { 
    return Math.floor(this.next() * (max - min + 1)) + min; 
  }
}