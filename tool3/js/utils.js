const coordCache = new Map();

export function parseCoords(coordsStr) {
    if (!coordCache.has(coordsStr)) {
        let coords;
        try {
            coords = JSON.parse(coordsStr);
            if (!Array.isArray(coords) || coords.length !== 4) {
                throw new Error("Invalid coordinate format");
            }
        } catch (e) {
            console.error("Failed to parse coordinates:", coordsStr, e);
            coords = [0, 0, 0, 0];
        }
        coordCache.set(coordsStr, coords);
    }
    return coordCache.get(coordsStr);
}

export const checkOverflow = (el, tolerance = 1) => 
    el.scrollHeight > el.clientHeight + tolerance || el.scrollWidth > el.clientWidth + tolerance;

export function calculateOverlayPosition({ coords, containerWidth, containerHeight, minHeight = 0, sourceWidth = 1000, sourceHeight = 1000 }) {
    const [top, left, bottom, right] = parseCoords(coords);
    const scaleX = containerWidth / sourceWidth;
    const scaleY = containerHeight / sourceHeight;
    
    // Optimization: Ensure calculation uses Math.max only once
    const width = (right - left) * scaleX;
    const height = Math.max((bottom - top) * scaleY, minHeight);
    
    return {
        left: left * scaleX,
        top: top * scaleY,
        width: width,
        height: height
    };
}

export function toPercentage(value, total) {
    return total > 0 ? `${(value / total) * 100}%` : '0%';
}