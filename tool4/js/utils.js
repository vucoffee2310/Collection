const coordCache = new Map();
let coordMappings = {
    global: { top: 0, left: 1, bottom: 2, right: 3 }
};

export function setAllCoordMappings(mappings) {
    coordMappings = mappings;
    coordCache.clear();
}

export function parseCoords(coordsStr, pageKey) {
    const cacheKey = `${pageKey}:${coordsStr}`;
    if (coordCache.has(cacheKey)) {
        return coordCache.get(cacheKey);
    }

    let rawCoords;
    try {
        rawCoords = JSON.parse(coordsStr);
        if (!Array.isArray(rawCoords) || rawCoords.length !== 4) {
            throw new Error("Invalid coordinate format - not a 4-element array.");
        }
    } catch (e) {
        console.error("Failed to parse coordinates:", coordsStr, e);
        rawCoords = [0, 0, 0, 0];
    }

    const mapping = coordMappings[pageKey] || coordMappings.global;
    const { top, left, bottom, right } = mapping;

    const mappedCoords = [
        rawCoords[top],
        rawCoords[left],
        rawCoords[bottom],
        rawCoords[right]
    ];

    coordCache.set(cacheKey, mappedCoords);
    return mappedCoords;
}

export const checkOverflow = (el, tolerance = 1) => 
    el.scrollHeight > el.clientHeight + tolerance || el.scrollWidth > el.clientWidth + tolerance;

export function calculateOverlayPosition({ coords, pageKey, expansion = 0, containerWidth, containerHeight, minHeight = 0, sourceWidth = 1000, sourceHeight = 1000 }) {
    let [top, left, bottom, right] = parseCoords(coords, pageKey);
    
    // Apply expansion non-destructively
    top -= expansion;
    left -= expansion;
    bottom += expansion;
    right += expansion;

    const scaleX = containerWidth / sourceWidth;
    const scaleY = containerHeight / sourceHeight;
    
    return {
        left: left * scaleX,
        top: top * scaleY,
        width: (right - left) * scaleX,
        height: Math.max((bottom - top) * scaleY, minHeight)
    };
}

export function toPercentage(value, total) {
    return total > 0 ? `${(value / total) * 100}%` : '0%';
}

export function readFileAs(file, readAs) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(reader.error);
        reader[readAs](file);
    });
}