import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    constructor() {
        this.cache = new Map();
        this.pendingCalculations = new Set();
        this.maxCacheSize = 1000;
    }

    clearCache() { 
        this.cache.clear();
        this.pendingCalculations.clear();
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
        const key = `${w.toFixed(1)}x${h.toFixed(1)}:${contentHash}`;
        
        if (this.cache.has(key)) {
            this._apply(overlay, this.cache.get(key));
            return;
        }

        const overlayId = overlay.dataset.coords + overlay.dataset.pageNum;
        if (this.pendingCalculations.has(overlayId)) return;
        
        this.pendingCalculations.add(overlayId);

        const size = this._findFast(txt, overlay);
        
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