import { CONFIG } from './config.js';

const parseCache = new Map();
const MAX_CACHE = 2000;

// ==================== Performance ====================

export const debounce = (fn, delay = 300) => {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
};

export const yieldToMain = () => {
    return new Promise(resolve => {
        if ('scheduler' in window && 'yield' in window.scheduler) {
            window.scheduler.yield().then(resolve);
        } else {
            setTimeout(resolve, 0);
        }
    });
};

export const forceUIUpdate = () => {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setTimeout(resolve, 0));
        });
    });
};

// ==================== Coordinates ====================

export const parseCoords = (str, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER) => {
    const key = `${coordOrder}:${str}`;
    
    if (!parseCache.has(key)) {
        if (parseCache.size > MAX_CACHE) {
            parseCache.delete(parseCache.keys().next().value);
        }
        
        try {
            const raw = JSON.parse(str);
            if (!Array.isArray(raw) || raw.length !== 4) {
                parseCache.set(key, [0, 0, 0, 0]);
            } else {
                const mapping = {};
                coordOrder.split('').forEach((letter, i) => mapping[letter] = raw[i]);
                parseCache.set(key, [mapping.T, mapping.L, mapping.B, mapping.R]);
            }
        } catch {
            parseCache.set(key, [0, 0, 0, 0]);
        }
    }
    return parseCache.get(key);
};

export const coordinatesToOrder = (tlbr, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER) => {
    const [t, l, b, r] = tlbr;
    const mapping = { T: t, L: l, B: b, R: r };
    return coordOrder.split('').map(letter => mapping[letter]);
};

// ==================== DOM ====================

export const checkOverflow = (el, tol = 1) => {
    return el.scrollHeight > el.clientHeight + tol || 
           el.scrollWidth > el.clientWidth + tol;
};

export const calculateOverlayPosition = ({ 
    coords, containerWidth: cw, containerHeight: ch, 
    minHeight = 0, sourceWidth = 1000, sourceHeight = 1000, 
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

// ==================== File ====================

export const readFile = (file, method) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = () => reject(r.error);
    r[method](file);
});

// ==================== Page Spec Parser ====================

export class PageSpecParser {
    static parse(spec) {
        if (!spec || typeof spec !== 'string') return [];
        
        const pages = new Set();
        
        spec.split(',').forEach(part => {
            part = part.trim();
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(s => parseInt(s.trim()));
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let i = start; i <= end; i++) pages.add(i);
                }
            } else {
                const page = parseInt(part);
                if (!isNaN(page) && page > 0) pages.add(page);
            }
        });
        
        return Array.from(pages).sort((a, b) => a - b);
    }
    
    static validate(pages, maxPage) {
        return pages.filter(p => p >= 1 && p <= maxPage);
    }
    
    static format(pages, maxDisplay = 10) {
        if (!pages.length) return 'none';
        if (pages.length <= maxDisplay) return pages.join(', ');
        return pages.slice(0, maxDisplay).join(', ') + `, ... (+${pages.length - maxDisplay} more)`;
    }
}

// ==================== Error Handling ====================

export const withErrorHandling = async (fn, msg = 'Operation failed') => {
    try {
        return await fn();
    } catch (e) {
        console.error(`${msg}:`, e);
        alert(`${msg}: ${e.message}`);
        throw e;
    }
};

// ==================== Validation ====================

export const validateRange = (start, end, max) => {
    if (start < 1 || end < 1) return { valid: false, error: 'Page numbers must be positive' };
    if (start > end) return { valid: false, error: 'Start page must be ≤ end page' };
    if (end > max) return { valid: false, error: `End page exceeds total (${max})` };
    return { valid: true };
};