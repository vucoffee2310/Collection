const coordCache = new Map();

export function parseCoords(coordsStr) {
    if (!coordCache.has(coordsStr)) {
        try {
            coordCache.set(coordsStr, JSON.parse(coordsStr));
        } catch {
            console.error("Failed to parse coordinates:", coordsStr);
            coordCache.set(coordsStr, [0, 0, 0, 0]);
        }
    }
    return coordCache.get(coordsStr);
}

export const checkOverflow = (el, tolerance = 1) => 
    el.scrollHeight > el.clientHeight + tolerance || el.scrollWidth > el.clientWidth + tolerance;

export function calculateOverlayPosition({ coords, containerWidth, containerHeight, minHeight = 0, sourceWidth = 1000, sourceHeight = 1000 }) {
    const [top, left, bottom, right] = parseCoords(coords);
    const scaleX = containerWidth / sourceWidth;
    const scaleY = containerHeight / sourceHeight;
    
    return {
        left: left * scaleX,
        top: top * scaleY,
        width: (right - left) * scaleX,
        height: Math.max((bottom - top) * scaleY, minHeight)
    };
}