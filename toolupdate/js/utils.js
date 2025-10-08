import { CONFIG } from './config.js';

const cache = new Map();

// Debouncing utility
export const debounce = (fn, delay = 300) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

// Throttling utility
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

// Batch DOM operations
export const batchDOMUpdates = (callback) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(callback);
    });
};

export const parseCoords = (str, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER) => {
    const cacheKey = `${coordOrder}:${str}`;
    
    if (!cache.has(cacheKey)) {
        try {
            const raw = JSON.parse(str);
            if (!Array.isArray(raw) || raw.length !== 4) {
                cache.set(cacheKey, [0, 0, 0, 0]);
                return cache.get(cacheKey);
            }
            
            // Map the input order to [T, L, B, R]
            const mapping = {};
            coordOrder.split('').forEach((letter, index) => {
                mapping[letter] = raw[index];
            });
            
            const coords = [
                mapping['T'], // Top
                mapping['L'], // Left
                mapping['B'], // Bottom
                mapping['R']  // Right
            ];
            
            cache.set(cacheKey, coords);
        } catch (e) {
            cache.set(cacheKey, [0, 0, 0, 0]);
        }
    }
    return cache.get(cacheKey);
};

export const checkOverflow = (el, tol = 1) => el.scrollHeight > el.clientHeight + tol || el.scrollWidth > el.clientWidth + tol;

export const calculateOverlayPosition = ({ coords, containerWidth: cw, containerHeight: ch, minHeight = 0, sourceWidth = 1000, sourceHeight = 1000, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER }) => {
    const [top, left, bottom, right] = parseCoords(coords, coordOrder);
    const sx = cw / sourceWidth, sy = ch / sourceHeight;
    return { left: left * sx, top: top * sy, width: (right - left) * sx, height: Math.max((bottom - top) * sy, minHeight) };
};

export const toPercent = (v, t) => t > 0 ? `${(v / t) * 100}%` : '0%';

export const readFile = (file, method) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = () => reject(r.error);
    r[method](file);
});