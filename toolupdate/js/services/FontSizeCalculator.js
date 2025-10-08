import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    constructor() {
        this.cache = new Map();
        this.pendingCalculations = new Set();
        this.maxCacheSize = 500; // Prevent memory leaks
    }

    clearCache() { 
        this.cache.clear();
        this.pendingCalculations.clear();
    }
    
    // Manage cache size to prevent memory issues
    _manageCacheSize() {
        if (this.cache.size > this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    calculateOptimalSize(overlay) {
        const txt = overlay.querySelector('.overlay-text');
        if (!txt?.innerHTML.trim()) return;

        const { clientWidth: w, clientHeight: h } = overlay;
        if (w <= 0 || h <= 0) return;

        // Create more efficient cache key
        const contentHash = this._hashContent(txt.innerHTML);
        const key = `${w.toFixed(1)}x${h.toFixed(1)}:${contentHash}`;
        
        // Use cached result if available
        if (this.cache.has(key)) {
            this._apply(overlay, this.cache.get(key));
            return;
        }

        // Prevent duplicate calculations for the same overlay
        const overlayId = overlay.dataset.coords + overlay.dataset.pageNum;
        if (this.pendingCalculations.has(overlayId)) return;
        
        this.pendingCalculations.add(overlayId);

        // Calculate font size
        const size = this._find(txt, overlay);
        
        // Store in cache
        this.cache.set(key, size);
        this._manageCacheSize();
        
        // Apply the result
        this._apply(overlay, size);
        
        this.pendingCalculations.delete(overlayId);
    }
    
    // Create simple hash for content
    _hashContent(str) {
        let hash = 0;
        const len = Math.min(str.length, 100); // Only hash first 100 chars
        for (let i = 0; i < len; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `${hash}:${str.length}`;
    }

    _apply(overlay, px) {
        const wrapper = overlay.closest('.page-wrapper');
        const txt = overlay.querySelector('.overlay-text');
        
        if (txt) txt.style.fontSize = '';

        if (wrapper) {
            const base = parseFloat(getComputedStyle(wrapper).fontSize);
            if (base > 0) {
                overlay.style.fontSize = `${(px / base) * 100}%`;
                return;
            }
        }
        overlay.style.fontSize = `${px}px`;
    }

    _find(txt, cont) {
        const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
        txt.style.fontSize = '';

        let low = MIN, high = MAX, best = low;
        const tol = 0.1, maxIter = 20;
        let iter = 0;

        // Better initial guess based on content and area
        const len = txt.textContent.length || 1;
        const area = cont.clientWidth * cont.clientHeight;
        let guess = Math.max(MIN, Math.min(MAX, Math.sqrt(area / len) * 1.5));
        
        txt.style.fontSize = `${guess}px`;
        if (Utils.checkOverflow(cont, 0.5)) {
            high = guess;
        } else {
            low = guess;
            best = guess;
        }

        // Binary search for optimal size
        while (high - low > tol && iter < maxIter) {
            const mid = (low + high) / 2;
            txt.style.fontSize = `${mid}px`;
            
            if (Utils.checkOverflow(cont, 0.5)) {
                high = mid;
            } else {
                best = mid;
                low = mid;
            }
            iter++;
        }
        
        txt.style.fontSize = '';
        return best;
    }
}