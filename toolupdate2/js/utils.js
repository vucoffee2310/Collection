import { CONFIG } from './config.js';

const cache = new Map();
const MAX_CACHE_SIZE = 2000;

export const debounce = (fn, delay = 300) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
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

export const batchDOMUpdates = (callback) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(callback);
    });
};

export const parseCoords = (str, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER) => {
    const cacheKey = `${coordOrder}:${str}`;
    
    if (!cache.has(cacheKey)) {
        if (cache.size > MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        try {
            const raw = JSON.parse(str);
            if (!Array.isArray(raw) || raw.length !== 4) {
                cache.set(cacheKey, [0, 0, 0, 0]);
                return cache.get(cacheKey);
            }
            
            const mapping = {};
            coordOrder.split('').forEach((letter, index) => {
                mapping[letter] = raw[index];
            });
            
            const coords = [
                mapping['T'],
                mapping['L'],
                mapping['B'],
                mapping['R']
            ];
            
            cache.set(cacheKey, coords);
        } catch (e) {
            cache.set(cacheKey, [0, 0, 0, 0]);
        }
    }
    return cache.get(cacheKey);
};

export const coordinatesToOrder = (tlbr, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER) => {
    const [t, l, b, r] = tlbr;
    const mapping = { T: t, L: l, B: b, R: r };
    return coordOrder.split('').map(letter => mapping[letter]);
};

export const checkOverflow = (el, tol = 1) => {
    const sh = el.scrollHeight;
    const ch = el.clientHeight;
    const sw = el.scrollWidth;
    const cw = el.clientWidth;
    
    return sh > ch + tol || sw > cw + tol;
};

export const calculateOverlayPosition = ({ 
    coords, 
    containerWidth: cw, 
    containerHeight: ch, 
    minHeight = 0, 
    sourceWidth = 1000, 
    sourceHeight = 1000, 
    coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER 
}) => {
    const [top, left, bottom, right] = parseCoords(coords, coordOrder);
    const sx = cw / sourceWidth;
    const sy = ch / sourceHeight;
    return { 
        left: left * sx, 
        top: top * sy, 
        width: (right - left) * sx, 
        height: Math.max((bottom - top) * sy, minHeight) 
    };
};

export const toPercent = (v, t) => t > 0 ? `${(v / t) * 100}%` : '0%';

export const readFile = (file, method) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = () => reject(r.error);
    r[method](file);
});