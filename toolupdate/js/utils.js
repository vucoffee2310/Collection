const cache = new Map();

export const parseCoords = (str) => {
    if (!cache.has(str)) {
        try {
            const coords = JSON.parse(str);
            cache.set(str, Array.isArray(coords) && coords.length === 4 ? coords : [0, 0, 0, 0]);
        } catch (e) {
            cache.set(str, [0, 0, 0, 0]);
        }
    }
    return cache.get(str);
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