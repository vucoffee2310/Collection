import { CONFIG } from './config.js';

// Performance utilities
export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = (fn, limit = 100) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Simplified UI update - single RAF + setTimeout is sufficient
export const forceUIUpdate = () => new Promise(resolve => {
  requestAnimationFrame(() => setTimeout(resolve, 0));
});

// Button state manager - simplified closure approach
export const createButtonHandler = (btn, asyncFn) => async () => {
  if (btn.disabled) return;
  
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('loading');
  
  await forceUIUpdate();
  
  try {
    return await asyncFn();
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.innerHTML = originalHTML;
  }
};

// Coordinate parsing - simplified without cache for <1000 items
const coordMap = { T: 0, L: 1, B: 2, R: 3 };

export const parseCoords = (str, order = CONFIG.DEFAULT_COORDINATE_ORDER) => {
  try {
    const raw = JSON.parse(str);
    if (!Array.isArray(raw) || raw.length !== 4) return [0, 0, 0, 0];
    
    const result = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      result[coordMap[order[i]]] = raw[i];
    }
    return result;
  } catch {
    return [0, 0, 0, 0];
  }
};

export const coordinatesToOrder = (tlbr, order = CONFIG.DEFAULT_COORDINATE_ORDER) => 
  order.split('').map(letter => tlbr[coordMap[letter]]);

// DOM utilities
export const checkOverflow = (el, tol = 1) => 
  el.scrollHeight > el.clientHeight + tol || el.scrollWidth > el.clientWidth + tol;

export const calculateOverlayPosition = ({
  coords, containerWidth, containerHeight, minHeight = 0, coordOrder
}) => {
  const [top, left, bottom, right] = parseCoords(coords, coordOrder);
  const sx = containerWidth / 1000;
  const sy = containerHeight / 1000;
  
  return {
    left: left * sx,
    top: top * sy,
    width: (right - left) * sx,
    height: Math.max((bottom - top) * sy, minHeight)
  };
};

export const toPercent = (v, t) => t > 0 ? `${(v / t) * 100}%` : '0%';

// File utilities
export const readFile = (file, method) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = () => reject(reader.error);
  reader[method](file);
});

// Page specification parser - merged validation
export const parsePageSpec = (spec, maxPage = Infinity) => {
  if (!spec || typeof spec !== 'string') return [];
  
  const pages = new Set();
  
  spec.split(',').forEach(part => {
    part = part.trim();
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = Math.max(1, start); i <= Math.min(maxPage, end); i++) {
          pages.add(i);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= maxPage) {
        pages.add(page);
      }
    }
  });
  
  return Array.from(pages).sort((a, b) => a - b);
};

export const formatPageList = (pages, max = 10) => {
  if (!pages.length) return 'none';
  if (pages.length <= max) return pages.join(', ');
  return `${pages.slice(0, max).join(', ')} ... (+${pages.length - max} more)`;
};

// Error handling
export const withErrorHandling = async (fn, msg = 'Operation failed') => {
  try {
    return await fn();
  } catch (error) {
    console.error(`${msg}:`, error);
    alert(`${msg}: ${error.message}`);
    throw error;
  }
};

// Validation
export const validateRange = (start, end, max) => {
  if (start < 1 || end < 1) return { valid: false, error: 'Page numbers must be positive' };
  if (start > end) return { valid: false, error: 'Start page must be ≤ end page' };
  if (end > max) return { valid: false, error: `End page exceeds total pages (${max})` };
  return { valid: true };
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const sanitizeFilename = (filename) => 
  filename.replace(/[^a-z0-9_-]/gi, '_').substring(0, 200);