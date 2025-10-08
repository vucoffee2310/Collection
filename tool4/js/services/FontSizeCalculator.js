import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    constructor() {
        this.sizeCache = new Map();
    }

    clearCache() {
        this.sizeCache.clear();
    }

    calculateOptimalSize(overlay) {
        const textSpan = overlay.querySelector('.overlay-text');
        if (!textSpan || !textSpan.innerHTML.trim()) return;

        const { clientWidth: w, clientHeight: h } = overlay;
        if (w <= 0 || h <= 0) return;

        const cacheKey = `${w.toFixed(1)}x${h.toFixed(1)}:${textSpan.innerHTML}`;
        if (this.sizeCache.has(cacheKey)) {
            this._applyFontSize(overlay, this.sizeCache.get(cacheKey));
            return;
        }

        const optimalSizePx = this._findOptimalSize(textSpan, overlay);
        this.sizeCache.set(cacheKey, optimalSizePx);
        this._applyFontSize(overlay, optimalSizePx);
    }

    _applyFontSize(overlay, sizeInPx) {
        const pageWrapper = overlay.closest('.page-wrapper');
        const textSpan = overlay.querySelector('.overlay-text');
        
        if (textSpan) textSpan.style.fontSize = '';

        if (pageWrapper) {
            const baseSizePx = parseFloat(getComputedStyle(pageWrapper).fontSize);
            if (baseSizePx > 0) {
                overlay.style.fontSize = `${(sizeInPx / baseSizePx) * 100}%`;
                return;
            }
        }
        
        overlay.style.fontSize = `${sizeInPx}px`;
    }

    _findOptimalSize(textSpan, container) {
        const { MIN_FONT_SIZE, MAX_FONT_SIZE } = CONFIG.OVERLAY;
        textSpan.style.fontSize = ''; 

        let low = MIN_FONT_SIZE;
        let high = MAX_FONT_SIZE;
        let bestFit = low;
        const tolerance = 0.1;
        const maxIterations = 20;
        let iterations = 0;

        const textLength = textSpan.textContent.length || 1;
        const area = container.clientWidth * container.clientHeight;
        const magicRatio = 1.5;
        let guess = Math.sqrt(area / textLength) * magicRatio;
        guess = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, guess));
        
        textSpan.style.fontSize = `${guess}px`;
        if (Utils.checkOverflow(container, 0.5)) {
            high = guess;
        } else {
            low = guess;
            bestFit = guess;
        }

        while (high - low > tolerance && iterations < maxIterations) {
            const mid = (low + high) / 2;
            textSpan.style.fontSize = `${mid}px`;
            
            if (Utils.checkOverflow(container, 0.5)) {
                high = mid;
            } else {
                bestFit = mid;
                low = mid;
            }
            iterations++;
        }
        
        textSpan.style.fontSize = ''; 
        
        return bestFit;
    }
}