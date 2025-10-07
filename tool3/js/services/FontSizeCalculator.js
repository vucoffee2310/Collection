import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    calculateOptimalSize(overlay) {
        const textSpan = overlay.querySelector('.overlay-text');
        if (!textSpan?.textContent?.length) {
            if (textSpan) textSpan.style.fontSize = `${CONFIG.OVERLAY.MIN_FONT_SIZE}px`;
            return;
        }

        const pageWrapper = overlay.closest('.page-wrapper');
        const { clientWidth: w, clientHeight: h } = overlay;
        
        if (w <= 0 || h <= 0) {
            textSpan.style.fontSize = `${CONFIG.OVERLAY.MIN_FONT_SIZE}px`;
            return;
        }

        textSpan.style.fontSize = '';
        const optimalSizePx = this._calculateFontSize(textSpan, w, h);

        // Use percentage-based sizing for responsiveness
        if (pageWrapper) {
            const baseSizePx = parseFloat(getComputedStyle(pageWrapper).fontSize) || 16; 
            
            if (baseSizePx > 0) {
                // Set font size as a percentage relative to the page's 1vw size.
                overlay.style.fontSize = `${(optimalSizePx / baseSizePx) * 100}%`;
                textSpan.style.fontSize = '';
                return;
            }
        }
        
        textSpan.style.fontSize = `${optimalSizePx}px`;
    }

    _calculateFontSize(textSpan, maxW, maxH) {
        const { MIN_FONT_SIZE, MAX_FONT_SIZE } = CONFIG.OVERLAY;
        
        let high = MAX_FONT_SIZE;
        let low = MIN_FONT_SIZE;
        let best = low;
        const tolerance = 0.1; // Increased precision for binary search

        // Binary search
        while (high - low > tolerance) {
            const mid = (high + low) / 2;
            textSpan.style.fontSize = `${mid}px`;
            
            // Checking for overflow (Reflow occurs here, unavoidable)
            if (Utils.checkOverflow(textSpan, 0)) {
                high = mid; // Too big
            } else {
                best = mid;
                low = mid; // Fits or is too small, try larger
            }
        }
        
        return Math.round(best * 100) / 100; // Round to 2 decimal places for clean styling
    }
}