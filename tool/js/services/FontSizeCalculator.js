import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class FontSizeCalculator {
    calculateOptimalSize(overlay) {
        const textSpan = overlay.querySelector('.overlay-text');
        if (!textSpan) return;

        textSpan.style.fontSize = '';
        
        const { clientWidth: w, clientHeight: h } = overlay;
        const { paddingH, paddingV } = Utils.getElementSpacing(overlay);
        const availableWidth = w - paddingH;
        const availableHeight = h - paddingV;
        
        if (textSpan.textContent.length === 0 || availableWidth <= 0 || availableHeight <= 0) {
            textSpan.style.fontSize = `${CONFIG.OVERLAY.MIN_FONT_SIZE}px`;
            return;
        }

        // 1. Start with a reasonable estimate
        let fontSize = this._getInitialEstimate(textSpan, availableWidth, availableHeight);
        textSpan.style.fontSize = `${fontSize}px`;
        
        // 2. Refine with a binary search
        fontSize = this._binarySearchRefine(textSpan, fontSize);
        
        // 3. Incrementally increase to fill remaining space
        fontSize = this._incrementalIncrease(textSpan, fontSize);

        textSpan.style.fontSize = `${fontSize}px`;
    }

    _getInitialEstimate(textSpan, availableWidth, availableHeight) {
        const textLen = textSpan.textContent.length;
        const lineHeightFactor = 1.2;
        const estimatedCharsPerLine = Math.max(1, availableWidth / (availableHeight * 0.55));
        const estimatedLines = Math.ceil(textLen / estimatedCharsPerLine);
        
        let estimatedSize = (availableHeight / estimatedLines) * 0.95 / lineHeightFactor;
        
        return Math.max(CONFIG.OVERLAY.MIN_FONT_SIZE, Math.min(estimatedSize, CONFIG.OVERLAY.MAX_FONT_SIZE));
    }
    
    _binarySearchRefine(textSpan, initialSize) {
        let low = CONFIG.OVERLAY.MIN_FONT_SIZE;
        let high = initialSize * 1.5; // Search a bit higher than the estimate
        let bestSize = low;
        
        while (high - low > 0.1) {
            const mid = (high + low) / 2;
            textSpan.style.fontSize = `${mid}px`;
            
            if (Utils.checkOverflow(textSpan, 0.5)) {
                high = mid;
            } else {
                bestSize = mid;
                low = mid;
            }
        }
        return bestSize;
    }
    
    _incrementalIncrease(textSpan, fontSize) {
        textSpan.style.fontSize = `${fontSize}px`;
        let step = 0.5;
        
        while (step > 0.05) {
            const nextSize = fontSize + step;
            if (nextSize > CONFIG.OVERLAY.MAX_FONT_SIZE) {
                step /= 2;
                continue;
            }
            textSpan.style.fontSize = `${nextSize}px`;
            if (Utils.checkOverflow(textSpan, 0)) {
                step /= 2; // Reduce step size on overflow
            } else {
                fontSize = nextSize; // Accept new size
            }
        }
        textSpan.style.fontSize = `${fontSize}px`;
        return fontSize;
    }
}
