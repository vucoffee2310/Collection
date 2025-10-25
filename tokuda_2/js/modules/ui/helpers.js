export const getLabel = t => 
  t?.name?.simpleText || 
  t?.name?.runs?.map(r => r.text).join('') || 
  t?.languageName?.simpleText || 
  t?.languageCode || 
  'Unknown';

export const createBtn = (text, color, handler) => Object.assign(document.createElement('a'), {
  textContent: text,
  href: '#',
  style: `margin-left:8px;cursor:pointer;color:${color};font-weight:bold;text-decoration:underline`,
  onclick: handler
});

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

export const formatSRTTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

export const formatVTTTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

export const decodeHTMLEntities = (text) => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

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

export const getVideoId = () => new URL(location.href).searchParams.get('v') || 'video';