import { CONFIG } from './config.js';

// Caching
const parseCache = new Map();
const MAX_CACHE_SIZE = 2000;

// ==================== Performance Utilities ====================

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

export const yieldToMain = () => {
    return new Promise(resolve => {
        if ('scheduler' in window && 'yield' in window.scheduler) {
            window.scheduler.yield().then(resolve);
        } else {
            setTimeout(resolve, 0);
        }
    });
};

// ==================== UI Update Utilities ====================

/**
 * Force UI update before starting heavy processing
 * Triple RAF + setTimeout ensures browser renders changes
 */
export const forceUIUpdate = () => {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 0);
            });
        });
    });
};

/**
 * Execute function with immediate UI feedback
 */
export const withUIFeedback = async (uiFn, processFn) => {
    // 1. Update UI first
    uiFn();
    
    // 2. Force browser to render the UI changes
    await forceUIUpdate();
    
    // 3. Now run the heavy processing
    return await processFn();
};

/**
 * Button state manager - prevents double clicks and shows loading state
 */
export class ButtonStateManager {
    constructor() {
        this.activeButtons = new Set();
    }
    
    async execute(button, asyncFn) {
        // Prevent double clicks
        if (this.activeButtons.has(button)) {
            return;
        }
        
        // Store original state
        const originalText = button.innerHTML;
        const originalDisabled = button.disabled;
        
        // Disable button and show loading
        this.activeButtons.add(button);
        button.disabled = true;
        button.classList.add('loading');
        
        // Force UI to update BEFORE processing
        await forceUIUpdate();
        
        try {
            // Execute the async function
            return await asyncFn();
        } finally {
            // Restore button state
            button.disabled = originalDisabled;
            button.classList.remove('loading');
            button.innerHTML = originalText;
            this.activeButtons.delete(button);
        }
    }
}

// ==================== Cache Management ====================

const manageCacheSize = (cache, maxSize = MAX_CACHE_SIZE) => {
    if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
};

// ==================== Coordinate Parsing ====================

export const parseCoords = (str, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER) => {
    const cacheKey = `${coordOrder}:${str}`;
    
    if (!parseCache.has(cacheKey)) {
        manageCacheSize(parseCache);
        
        try {
            const raw = JSON.parse(str);
            if (!Array.isArray(raw) || raw.length !== 4) {
                parseCache.set(cacheKey, [0, 0, 0, 0]);
                return parseCache.get(cacheKey);
            }
            
            const mapping = {};
            coordOrder.split('').forEach((letter, index) => {
                mapping[letter] = raw[index];
            });
            
            const coords = [mapping['T'], mapping['L'], mapping['B'], mapping['R']];
            parseCache.set(cacheKey, coords);
        } catch (e) {
            parseCache.set(cacheKey, [0, 0, 0, 0]);
        }
    }
    return parseCache.get(cacheKey);
};

export const coordinatesToOrder = (tlbr, coordOrder = CONFIG.DEFAULT_COORDINATE_ORDER) => {
    const [t, l, b, r] = tlbr;
    const mapping = { T: t, L: l, B: b, R: r };
    return coordOrder.split('').map(letter => mapping[letter]);
};

// ==================== DOM Utilities ====================

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

// ==================== File Utilities ====================

export const readFile = (file, method) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = () => reject(r.error);
    r[method](file);
});

// ==================== Page Specification Parser ====================

export class PageSpecParser {
    static parse(spec) {
        if (!spec || typeof spec !== 'string') return [];
        
        const pages = new Set();
        const parts = spec.split(',').map(s => s.trim());
        
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
                if (isNaN(start) || isNaN(end) || start > end) continue;
                
                for (let i = start; i <= end; i++) {
                    pages.add(i);
                }
            } else {
                const page = parseInt(part, 10);
                if (!isNaN(page) && page > 0) {
                    pages.add(page);
                }
            }
        }
        
        return Array.from(pages).sort((a, b) => a - b);
    }
    
    static validate(pages, maxPage) {
        return pages.filter(p => p >= 1 && p <= maxPage);
    }
    
    static format(pages, maxDisplay = 10) {
        if (pages.length === 0) return 'none';
        if (pages.length <= maxDisplay) return pages.join(', ');
        return pages.slice(0, maxDisplay).join(', ') + `, ... (+${pages.length - maxDisplay} more)`;
    }
}

// ==================== Error Handling ====================

export const withErrorHandling = async (fn, errorMessage = 'Operation failed') => {
    try {
        return await fn();
    } catch (error) {
        console.error(`${errorMessage}:`, error);
        alert(`${errorMessage}: ${error.message}`);
        throw error;
    }
};

// ==================== Validation ====================

export const validateRange = (start, end, max) => {
    if (start < 1 || end < 1) return { valid: false, error: 'Page numbers must be positive' };
    if (start > end) return { valid: false, error: 'Start page must be ≤ end page' };
    if (end > max) return { valid: false, error: `End page exceeds total pages (${max})` };
    return { valid: true };
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-z0-9_\-]/gi, '_').substring(0, 200);
};