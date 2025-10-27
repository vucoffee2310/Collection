/**
 * Core Helper Utilities
 * Formatting, helpers, and RNG utilities
 */

// ===========================
// JSON Formatting
// ===========================

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
// Time Formatting
// ===========================

export const formatSRTTime = (seconds) => {
  if (seconds === undefined || seconds === null) return '00:00:00,000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

export const formatVTTTime = (seconds) => {
  if (seconds === undefined || seconds === null) return '00:00:00.000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// ===========================
// Text Processing
// ===========================

export const decodeHTMLEntities = (text) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

export const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ===========================
// Language Detection
// ===========================

export const detectLanguage = (text) => {
  if (!text) return 'en';
  
  const cjkPattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/;
  const thaiPattern = /[\u0E00-\u0E7F]/;
  const laoPattern = /[\u0E80-\u0EFF]/;
  const khmerPattern = /[\u1780-\u17FF]/;
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  
  if (thaiPattern.test(text)) return 'th';
  if (laoPattern.test(text)) return 'lo';
  if (khmerPattern.test(text)) return 'km';
  if (vietnamesePattern.test(text)) return 'vi';
  if (cjkPattern.test(text)) {
    if (/[\u3040-\u309F]/.test(text)) return 'ja';
    if (/[\u30A0-\u30FF]/.test(text)) return 'ja';
    return 'zh';
  }
  
  return 'en';
};

// ===========================
// UI Helper Functions
// ===========================

export const getLabel = track => 
  track?.name?.simpleText || 
  track?.name?.runs?.map(r => r.text).join('') || 
  track?.languageName?.simpleText || 
  track?.languageCode || 
  'Unknown';

// ===========================
// File Download
// ===========================

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