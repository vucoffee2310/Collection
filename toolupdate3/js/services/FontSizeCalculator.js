import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    constructor() {
        this.cache = new Map();
        this.pending = new Set();
    }

    clearCache() {
        this.cache.clear();
        this.pending.clear();
    }
    
    _hash(str) {
        const len = str.length;
        if (!len) return '0:0';
        return `${str.charCodeAt(0) + str.charCodeAt(len >> 1) + str.charCodeAt(len - 1)}:${len}`;
    }

    calculateOptimalSize(overlay) {
        const txt = overlay.querySelector('.overlay-text');
        if (!txt?.innerHTML.trim()) return;

        const { clientWidth: w, clientHeight: h } = overlay;
        if (w <= 0 || h <= 0) return;

        const key = `${w.toFixed(1)}x${h.toFixed(1)}:${this._hash(txt.innerHTML)}`;
        
        if (this.cache.has(key)) {
            this._apply(overlay, this.cache.get(key));
            return;
        }

        const id = overlay.dataset.coords + overlay.dataset.pageNum;
        if (this.pending.has(id)) return;
        
        this.pending.add(id);

        const size = this._find(txt, overlay);
        
        if (this.cache.size > 1000) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, size);
        this._apply(overlay, size);
        this.pending.delete(id);
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

        const len = txt.textContent.length || 1;
        const area = cont.clientWidth * cont.clientHeight;
        let guess = Math.max(MIN, Math.min(MAX, Math.sqrt(area / len) * 1.8));
        
        txt.style.fontSize = `${guess}px`;
        
        if (!Utils.checkOverflow(cont, 0.5)) {
            let upper = Math.min(MAX, guess * 1.5);
            txt.style.fontSize = `${upper}px`;
            if (Utils.checkOverflow(cont, 0.5)) {
                return this._binarySearch(txt, cont, guess, upper);
            }
            txt.style.fontSize = '';
            return upper;
        }
        
        return this._binarySearch(txt, cont, MIN, guess);
    }

    _binarySearch(txt, cont, low, high) {
        let best = low;
        let iter = 0;

        while (high - low > 0.5 && iter < 12) {
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