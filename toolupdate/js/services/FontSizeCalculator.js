import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    constructor() {
        this.cache = new Map();
    }

    clearCache() { this.cache.clear(); }

    calculateOptimalSize(overlay) {
        const txt = overlay.querySelector('.overlay-text');
        if (!txt?.innerHTML.trim()) return;

        const { clientWidth: w, clientHeight: h } = overlay;
        if (w <= 0 || h <= 0) return;

        const key = `${w.toFixed(1)}x${h.toFixed(1)}:${txt.innerHTML}`;
        if (this.cache.has(key)) {
            this._apply(overlay, this.cache.get(key));
            return;
        }

        const size = this._find(txt, overlay);
        this.cache.set(key, size);
        this._apply(overlay, size);
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