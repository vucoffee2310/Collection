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

export const forceUIUpdate = () => new Promise(resolve => {
  requestAnimationFrame(() => setTimeout(resolve, 0));
});

export const createButtonHandler = (btn, asyncFn) => async () => {
  if (btn.disabled) return;
  
  btn.disabled = true;
  btn.classList.add('loading');
  await forceUIUpdate();
  
  try {
    return await asyncFn();
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
};

// Coordinate utilities - simplified
const COORD_MAP = { T: 0, L: 1, B: 2, R: 3 };

export const parseCoords = (str, order = CONFIG.DEFAULT_COORDINATE_ORDER) => {
  try {
    const raw = JSON.parse(str);
    if (!Array.isArray(raw) || raw.length !== 4) return [0, 0, 0, 0];
    
    return order.split('').map(letter => raw[COORD_MAP[letter]]);
  } catch {
    return [0, 0, 0, 0];
  }
};

export const coordinatesToOrder = (tlbr, order = CONFIG.DEFAULT_COORDINATE_ORDER) => 
  order.split('').map(letter => tlbr[COORD_MAP[letter]]);

export const calculateOverlayPosition = ({ coords, containerWidth, containerHeight, minHeight = 0, coordOrder }) => {
  const [top, left, bottom, right] = parseCoords(coords, coordOrder);
  
  // Validate
  if (top < 0 || left < 0 || bottom <= top || right <= left) {
    console.warn('Invalid coordinates:', { top, left, bottom, right });
    return { left: 0, top: 0, width: 100, height: minHeight };
  }
  
  // Scale from 1000-based system
  const sx = containerWidth / 1000;
  const sy = containerHeight / 1000;
  
  return {
    left: Math.max(0, left * sx),
    top: Math.max(0, top * sy),
    width: Math.max(1, (right - left) * sx),
    height: Math.max(minHeight, (bottom - top) * sy)
  };
};

// DOM utilities
export const checkOverflow = (el, tol = 1) => 
  el.scrollHeight > el.clientHeight + tol || el.scrollWidth > el.clientWidth + tol;

export const toPx = (v) => `${v}px`;

export const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// File utilities
export const readFile = (file, method) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = () => reject(reader.error);
  reader[method](file);
});

// Page specification parser
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