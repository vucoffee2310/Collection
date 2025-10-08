const cache = new Map();
let coordinateOrder = 'TLBR'; // Default: Top, Left, Bottom, Right

export const setCoordinateOrder = (order) => {
    const normalized = order.toUpperCase().trim();
    
    // Validate: must be exactly 4 characters and contain T, L, B, R
    if (normalized.length !== 4) {
        throw new Error('Coordinate order must be exactly 4 characters');
    }
    
    const chars = normalized.split('');
    const required = ['T', 'L', 'B', 'R'];
    
    for (const req of required) {
        if (!chars.includes(req)) {
            throw new Error(`Coordinate order must contain ${req}`);
        }
    }
    
    // Check for duplicates
    if (new Set(chars).size !== 4) {
        throw new Error('Coordinate order must not have duplicate letters');
    }
    
    coordinateOrder = normalized;
    cache.clear(); // Clear cache when order changes
    return true;
};

export const getCoordinateOrder = () => coordinateOrder;

export const parseCoords = (str) => {
    const cacheKey = `${coordinateOrder}:${str}`;
    
    if (!cache.has(cacheKey)) {
        try {
            const raw = JSON.parse(str);
            if (!Array.isArray(raw) || raw.length !== 4) {
                cache.set(cacheKey, [0, 0, 0, 0]);
                return cache.get(cacheKey);
            }
            
            // Map the input order to [T, L, B, R]
            const mapping = {};
            coordinateOrder.split('').forEach((letter, index) => {
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

export const calculateOverlayPosition = ({ coords, containerWidth: cw, containerHeight: ch, minHeight = 0, sourceWidth = 1000, sourceHeight = 1000 }) => {
    const [top, left, bottom, right] = parseCoords(coords);
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