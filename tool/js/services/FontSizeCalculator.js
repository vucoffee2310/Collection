import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    calculateOptimalSize(overlay) {
        const textSpan = overlay.querySelector('.overlay-text');
        if (!textSpan) return;

        const { clientWidth: w, clientHeight: h } = overlay;
        const style = getComputedStyle(overlay);
        const availableW = w - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const availableH = h - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        
        if (!textSpan.textContent.length || availableW <= 0 || availableH <= 0) {
            textSpan.style.fontSize = `${CONFIG.OVERLAY.MIN_FONT_SIZE}px`;
            return;
        }

        textSpan.style.fontSize = '';
        let size = this._binarySearch(textSpan, availableW, availableH);
        size = this._incrementalFit(textSpan, size);
        textSpan.style.fontSize = `${size}px`;
    }

    _binarySearch(textSpan, maxW, maxH) {
        const textLen = textSpan.textContent.length;
        const charsPerLine = Math.max(1, maxW / (maxH * 0.55));
        const lines = Math.ceil(textLen / charsPerLine);
        let high = Math.min((maxH / lines) * 0.8, CONFIG.OVERLAY.MAX_FONT_SIZE);
        let low = CONFIG.OVERLAY.MIN_FONT_SIZE;
        let best = low;
        
        while (high - low > 0.1) {
            const mid = (high + low) / 2;
            textSpan.style.fontSize = `${mid}px`;
            
            if (Utils.checkOverflow(textSpan, 0.5)) {
                high = mid;
            } else {
                best = mid;
                low = mid;
            }
        }
        return best;
    }
    
    _incrementalFit(textSpan, fontSize) {
        let step = 0.5;
        
        while (step > 0.05) {
            const next = fontSize + step;
            if (next > CONFIG.OVERLAY.MAX_FONT_SIZE) {
                step /= 2;
                continue;
            }
            textSpan.style.fontSize = `${next}px`;
            if (Utils.checkOverflow(textSpan, 0)) {
                step /= 2;
            } else {
                fontSize = next;
            }
        }
        return fontSize;
    }
}