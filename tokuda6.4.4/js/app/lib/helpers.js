/**
 * General Helper Utilities
 */

// ===== YouTube =====
export const getVideoId = () => new URL(location.href).searchParams.get('v');

export const getTrackLabel = (track) =>
  track?.name?.simpleText ||
  track?.name?.runs?.map((r) => r.text).join('') ||
  track?.languageName?.simpleText ||
  track?.languageCode ||
  'Unknown';

// ===== Clipboard =====
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('✅ Copied to clipboard');
  } catch {
    const textarea = Object.assign(document.createElement('textarea'), {
      value: text,
      style: 'position:fixed;opacity:0'
    });
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

// ===== File Operations =====
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

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const estimateFileSize = (content) => new Blob([content]).size;

export const sanitizeFilename = (filename) =>
  filename
    .replace(/[^a-z0-9_\-\.]/gi, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);

export const getTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// ===== JSON Formatting =====
export const formatJSON = (obj, indent = 2) => {
  const sp = ' '.repeat(indent);
  const isArrOfArr = (arr) => Array.isArray(arr) && arr.length && arr.every(Array.isArray);
  const isArrOfObj = (arr) => arr.every((v) => v?.constructor === Object);

  const fmt = (val, depth) => {
    const ind = sp.repeat(depth);
    const nxt = sp.repeat(depth + 1);

    if (val === null) return 'null';
    if (typeof val !== 'object') return JSON.stringify(val);

    if (Array.isArray(val)) {
      if (!val.length) return '[]';
      if (isArrOfArr(val)) return `[\n${val.map((v) => nxt + JSON.stringify(v)).join(',\n')}\n${ind}]`;
      if (isArrOfObj(val)) return `[\n${val.map((v) => nxt + fmt(v, depth + 1)).join(',\n')}\n${ind}]`;
      return JSON.stringify(val);
    }

    const entries = Object.entries(val).map(([k, v]) => `${nxt}"${k}": ${fmt(v, depth + 1)}`);
    return `{\n${entries.join(',\n')}\n${ind}}`;
  };

  return fmt(obj, 0);
};

// ===== Language Detection =====
export const detectLanguage = (text) => {
  if (!text) return 'en';

  const patterns = {
    th: /[\u0E00-\u0E7F]/,
    lo: /[\u0E80-\u0EFF]/,
    km: /[\u1780-\u17FF]/,
    vi: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i,
    ja: /[\u3040-\u309F\u30A0-\u30FF]/,
    zh: /[\u4E00-\u9FAF]/
  };

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return lang;
  }

  return 'en';
};

// ===== Validation =====
export const validateExportData = (jsonData) => {
  const errors = [];

  if (!jsonData) {
    errors.push('No data provided');
    return { valid: false, errors };
  }

  if (!jsonData.markers || typeof jsonData.markers !== 'object') {
    errors.push('Invalid markers structure');
  }

  if (jsonData.totalMarkers === undefined) {
    errors.push('Missing totalMarkers count');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// ===== Seeded Random (for reproducible parsing) =====
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