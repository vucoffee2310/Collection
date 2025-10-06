// js/utils.js

/**
 * Parses a coordinate string key into a number array.
 * Caches the result for performance.
 * @param {string} coordsStr - The coordinate string, e.g., "[0, 709, 29, 902]"
 * @returns {number[]} The parsed array, e.g., [0, 709, 29, 902]
 */
const coordCache = new Map();

export function parseCoords(coordsStr) {
    if (coordCache.has(coordsStr)) {
        return coordCache.get(coordsStr);
    }
    try {
        const result = JSON.parse(coordsStr);
        coordCache.set(coordsStr, result);
        return result;
    } catch (e) {
        console.error("Failed to parse coordinates:", coordsStr);
        // Return a default array to prevent crashes downstream
        return [0, 0, 0, 0];
    }
}