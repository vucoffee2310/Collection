/**
 * Core Helper Utilities - Minimal Version
 */

export const getVideoId = () => new URL(location.href).searchParams.get('v');

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

export const getLabel = track => 
  track?.name?.simpleText || 
  track?.name?.runs?.map(r => r.text).join('') || 
  track?.languageName?.simpleText || 
  track?.languageCode || 
  'Unknown';

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