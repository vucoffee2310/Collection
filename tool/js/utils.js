// js/utils.js

const coordCache = new Map();

/**
 * Parses a coordinate string key into a number array.
 * @param {string} coordsStr - The coordinate string, e.g., "[0, 709, 29, 902]"
 * @returns {number[]} The parsed array, e.g., [0, 709, 29, 902]
 */
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
        return [0, 0, 0, 0];
    }
}

/**
 * Checks if an element's content is overflowing its container.
 * @param {HTMLElement} el - The element to check.
 * @param {number} tolerance - A small pixel tolerance for sub-pixel rendering differences.
 * @returns {boolean} - True if the content overflows.
 */
export const checkOverflow = (el, tolerance = 1) => {
    return el.scrollHeight > el.clientHeight + tolerance || 
           el.scrollWidth > el.clientWidth + tolerance;
};

/**
 * Gets the total horizontal and vertical padding of an element.
 * @param {HTMLElement} element - The element to measure.
 * @returns {{paddingH: number, paddingV: number}} - An object with total horizontal and vertical padding.
 */
export function getElementSpacing(element) {
    const style = getComputedStyle(element);
    const paddingH = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingV = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    return { paddingH, paddingV };
}

/**
 * Calculates the scaled pixel dimensions and position for an overlay.
 * @param {object} options
 * @param {string} options.coords - The coordinate string.
 * @param {number} options.containerWidth - The width of the target container (e.g., page canvas).
 * @param {number} options.containerHeight - The height of the target container.
 * @param {number} [options.minHeight=0] - The minimum pixel height for the overlay.
 * @param {number} [options.sourceWidth=1000] - The source coordinate system width.
 * @param {number} [options.sourceHeight=1000] - The source coordinate system height.
 * @returns {{left: number, top: number, width: number, height: number}}
 */
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