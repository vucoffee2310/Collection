import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

/**
 * Calculates the optimal font size for text to fit within an overlay container.
 * This improved version includes:
 * - Caching/memoization to avoid re-calculating for identical inputs.
 * - A smarter initial guess heuristic to speed up the binary search.
 * - An iteration limit for robustness.
 * - Clearer separation of concerns between finding the size and applying it.
 */
export class FontSizeCalculator {
    constructor() {
        // Cache to store results.
        // Key: `${width}x${height}:${innerHTML}`
        // Value: calculated font size in px
        this.sizeCache = new Map();
    }

    /**
     * Clears the font size cache. Should be called when global styles
     * affecting text layout (like paragraph spacing) are changed.
     */
    clearCache() {
        this.sizeCache.clear();
    }

    /**
     * Main method to calculate and apply the optimal font size for an overlay.
     * @param {HTMLElement} overlay The overlay container element.
     */
    calculateOptimalSize(overlay) {
        const textSpan = overlay.querySelector('.overlay-text');
        // No text or element, nothing to do.
        if (!textSpan || !textSpan.innerHTML.trim()) return;

        const { clientWidth: w, clientHeight: h } = overlay;
        if (w <= 0 || h <= 0) return;

        // Use a key that includes dimensions and content structure.
        const cacheKey = `${w.toFixed(1)}x${h.toFixed(1)}:${textSpan.innerHTML}`;
        if (this.sizeCache.has(cacheKey)) {
            this._applyFontSize(overlay, this.sizeCache.get(cacheKey));
            return;
        }

        const optimalSizePx = this._findOptimalSize(textSpan, overlay);
        this.sizeCache.set(cacheKey, optimalSizePx);
        this._applyFontSize(overlay, optimalSizePx);
    }

    /**
     * Applies the calculated font size to the overlay element, converting to
     * a relative unit (%) for better responsiveness.
     * @param {HTMLElement} overlay The overlay container element.
     * @param {number} sizeInPx The calculated optimal font size in pixels.
     */
    _applyFontSize(overlay, sizeInPx) {
        const pageWrapper = overlay.closest('.page-wrapper');
        const textSpan = overlay.querySelector('.overlay-text');
        
        // Always reset the text span's specific font size to allow inheritance.
        if (textSpan) textSpan.style.fontSize = '';

        if (pageWrapper) {
            // The base font size is 1vw, get its computed value in pixels.
            const baseSizePx = parseFloat(getComputedStyle(pageWrapper).fontSize);
            if (baseSizePx > 0) {
                // Set font size as a percentage relative to the page's base size.
                overlay.style.fontSize = `${(sizeInPx / baseSizePx) * 100}%`;
                return;
            }
        }
        
        // Fallback to absolute pixels if no wrapper or base size is found.
        overlay.style.fontSize = `${sizeInPx}px`;
    }

    /**
     * Performs the binary search to find the best font size.
     * @param {HTMLElement} textSpan The element containing the text.
     * @param {HTMLElement} container The bounding container.
     * @returns {number} The optimal font size in pixels.
     */
    _findOptimalSize(textSpan, container) {
        const { MIN_FONT_SIZE, MAX_FONT_SIZE } = CONFIG.OVERLAY;
        textSpan.style.fontSize = ''; // Reset for clean measurement.

        let low = MIN_FONT_SIZE;
        let high = MAX_FONT_SIZE;
        let bestFit = low;
        const tolerance = 0.1;
        const maxIterations = 20; // Safety break for the loop.
        let iterations = 0;

        // Heuristic for a better initial guess to narrow the search range.
        // Assumes font size is roughly proportional to sqrt(area / text length).
        const textLength = textSpan.textContent.length || 1;
        const area = container.clientWidth * container.clientHeight;
        const magicRatio = 1.5; // Empirically determined factor.
        let guess = Math.sqrt(area / textLength) * magicRatio;
        guess = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, guess));
        
        // Test the guess to halve the search space.
        textSpan.style.fontSize = `${guess}px`;
        if (Utils.checkOverflow(container, 0.5)) {
            high = guess; // Guess is too high.
        } else {
            low = guess; // Guess fits, it's our new minimum.
            bestFit = guess;
        }

        // Perform binary search on the now-narrower range.
        while (high - low > tolerance && iterations < maxIterations) {
            const mid = (low + high) / 2;
            textSpan.style.fontSize = `${mid}px`;
            
            if (Utils.checkOverflow(container, 0.5)) {
                high = mid; // Too big.
            } else {
                bestFit = mid;
                low = mid; // Fits, try larger.
            }
            iterations++;
        }
        
        // Final reset to ensure styles from measurement don't persist.
        textSpan.style.fontSize = ''; 
        
        return bestFit;
    }
}