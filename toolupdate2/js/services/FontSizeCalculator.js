import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    constructor() {
        this.cache = new Map();
        this.pendingCalculations = new Set();
        this.maxCacheSize = 1000;
        this.maximizeMode = false; // New: maximize font to fill space
    }

    clearCache() { 
        this.cache.clear();
        this.pendingCalculations.clear();
    }

    setMaximizeMode(enabled) {
        this.maximizeMode = enabled;
        this.clearCache(); // Clear cache when mode changes
    }
    
    _manageCacheSize() {
        if (this.cache.size > this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    _hashContent(str) {
        const len = str.length;
        if (len === 0) return '0:0';
        
        const hash = str.charCodeAt(0) + 
                     str.charCodeAt(Math.floor(len / 2)) + 
                     str.charCodeAt(len - 1);
        return `${hash}:${len}`;
    }

    calculateOptimalSize(overlay) {
        const txt = overlay.querySelector('.overlay-text');
        if (!txt?.innerHTML.trim()) return;

        const { clientWidth: w, clientHeight: h } = overlay;
        if (w <= 0 || h <= 0) return;

        const contentHash = this._hashContent(txt.innerHTML);
        const key = `${w.toFixed(1)}x${h.toFixed(1)}:${contentHash}:${this.maximizeMode}`;
        
        if (this.cache.has(key)) {
            this._apply(overlay, this.cache.get(key));
            return;
        }

        const overlayId = overlay.dataset.coords + overlay.dataset.pageNum;
        if (this.pendingCalculations.has(overlayId)) return;
        
        this.pendingCalculations.add(overlayId);

        const size = this.maximizeMode 
            ? this._findMaximized(txt, overlay)
            : this._findFast(txt, overlay);
        
        this.cache.set(key, size);
        this._manageCacheSize();
        this._apply(overlay, size);
        
        this.pendingCalculations.delete(overlayId);
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

    _findFast(txt, cont) {
        const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
        txt.style.fontSize = '';

        const len = txt.textContent.length || 1;
        const area = cont.clientWidth * cont.clientHeight;
        
        let guess = Math.max(MIN, Math.min(MAX, Math.sqrt(area / len) * 1.8));
        
        txt.style.fontSize = `${guess}px`;
        
        if (!Utils.checkOverflow(cont, 0.5)) {
            let upperBound = Math.min(MAX, guess * 1.5);
            txt.style.fontSize = `${upperBound}px`;
            if (Utils.checkOverflow(cont, 0.5)) {
                return this._binarySearch(txt, cont, guess, upperBound);
            }
            txt.style.fontSize = '';
            return upperBound;
        }
        
        return this._binarySearch(txt, cont, MIN, guess);
    }

    // NEW: Maximize font size to fill all available space
    _findMaximized(txt, cont) {
        const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
        txt.style.fontSize = '';

        // Start with fast calculation
        const initialSize = this._findFast(txt, cont);
        
        // Try to maximize further
        txt.style.fontSize = `${initialSize}px`;
        
        // Check if there's significant empty space (more than 20% unused)
        const usedSpace = this._calculateUsedSpace(txt, cont);
        const totalSpace = cont.clientHeight;
        const emptySpaceRatio = (totalSpace - usedSpace) / totalSpace;
        
        if (emptySpaceRatio < 0.2) {
            // Already using most of the space
            txt.style.fontSize = '';
            return initialSize;
        }

        // There's wasted space - try to fill it
        const maxSize = Math.min(MAX, initialSize * 2);
        const optimizedSize = this._binarySearchMaximize(txt, cont, initialSize, maxSize);
        
        txt.style.fontSize = '';
        return optimizedSize;
    }

    // Calculate actual space used by text
    _calculateUsedSpace(txt, cont) {
        const style = getComputedStyle(cont);
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        
        // For merged blocks, sum their heights
        const blocks = txt.querySelectorAll('.merged-text-block');
        if (blocks.length > 0) {
            let totalHeight = 0;
            blocks.forEach(block => {
                const blockStyle = getComputedStyle(block);
                const rect = block.getBoundingClientRect();
                totalHeight += rect.height + parseFloat(blockStyle.marginBottom);
            });
            return totalHeight;
        }
        
        // For simple text, use scrollHeight
        return txt.scrollHeight;
    }

    // Binary search to maximize font size while staying within bounds
    _binarySearchMaximize(txt, cont, low, high) {
        let best = low;
        const tol = 0.5;
        const maxIter = 15;
        let iter = 0;

        while (high - low > tol && iter < maxIter) {
            const mid = (low + high) / 2;
            txt.style.fontSize = `${mid}px`;
            
            // Check if it overflows
            if (Utils.checkOverflow(cont, 0.5)) {
                high = mid;
            } else {
                // Check if text is well-centered (not too much empty space at bottom)
                const usedSpace = this._calculateUsedSpace(txt, cont);
                const availableSpace = cont.clientHeight;
                const ratio = usedSpace / availableSpace;
                
                // Ideal ratio is 0.85-0.95 (allows for vertical centering)
                if (ratio > 0.95) {
                    // Too tight, back off
                    high = mid;
                } else {
                    best = mid;
                    low = mid;
                }
            }
            iter++;
        }
        
        return best;
    }

    _binarySearch(txt, cont, low, high) {
        let best = low;
        const tol = 0.5;
        const maxIter = 12;
        let iter = 0;

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