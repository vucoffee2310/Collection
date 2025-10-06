export class FontSizeCalculator {
    calculateOptimalSize(overlay, textSpan) {
        textSpan.style.fontSize = '';
        
        const { clientWidth: w, clientHeight: h } = overlay;
        const { paddingH, paddingV } = Utils.getElementSpacing(overlay);
        const availableWidth = w - paddingH;
        const availableHeight = h - paddingV;
        const textLen = textSpan.textContent.length;
        
        // Initial estimate with line-height factor
        const lineHeightFactor = 1.35;
        const estimatedCharsPerLine = availableWidth / (availableHeight * 0.55);
        const estimatedLines = Math.ceil(textLen / estimatedCharsPerLine);
        let fontSize = Math.min(
            (availableHeight / estimatedLines) * 0.95 / lineHeightFactor,
            CONFIG.OVERLAY.MAX_FONT_SIZE
        );
        fontSize = Math.max(fontSize, CONFIG.OVERLAY.MIN_FONT_SIZE);
        
        // Test initial aggressive size
        textSpan.style.fontSize = `${fontSize}px`;
        
        if (!Utils.checkOverflow(textSpan, 0.5)) {
            const aggressiveSize = fontSize * 1.2;
            textSpan.style.fontSize = `${aggressiveSize}px`;
            if (!Utils.checkOverflow(textSpan, 0.5)) {
                fontSize = aggressiveSize;
            } else {
                textSpan.style.fontSize = `${fontSize}px`;
            }
        }
        
        // Binary search refinement
        fontSize = this._binarySearchSize(textSpan, fontSize);
        
        // Incremental increase
        fontSize = this._incrementalIncrease(textSpan, fontSize);
        
        // Final optimization
        fontSize = this._finalOptimization(overlay, textSpan, fontSize, paddingV, paddingH);
        
        textSpan.style.fontSize = `${fontSize}px`;
    }
    
    _binarySearchSize(textSpan, initialSize) {
        if (!Utils.checkOverflow(textSpan, 0.5)) return initialSize;
        
        let high = initialSize;
        let low = initialSize * 0.5;
        let bestSize = low;
        
        while (high - low > 0.05) {
            const mid = (high + low) / 2;
            textSpan.style.fontSize = `${mid}px`;
            
            if (Utils.checkOverflow(textSpan, 0.5)) {
                high = mid;
            } else {
                bestSize = mid;
                low = mid;
            }
        }
        
        textSpan.style.fontSize = `${bestSize}px`;
        return bestSize;
    }
    
    _incrementalIncrease(textSpan, fontSize) {
        let stepSize = 0.5;
        let consecutiveFailures = 0;
        
        while (fontSize < CONFIG.OVERLAY.MAX_FONT_SIZE && consecutiveFailures < 3) {
            const testSize = fontSize + stepSize;
            textSpan.style.fontSize = `${testSize}px`;
            
            if (Utils.checkOverflow(textSpan, 0.5)) {
                textSpan.style.fontSize = `${fontSize}px`;
                stepSize *= 0.5;
                consecutiveFailures++;
                
                if (stepSize < 0.02) break;
            } else {
                fontSize = testSize;
                consecutiveFailures = 0;
                if (!Utils.checkOverflow(textSpan, 0)) {
                    stepSize = Math.min(stepSize * 1.2, 1.0);
                }
            }
        }
        
        return fontSize;
    }
    
    _finalOptimization(overlay, textSpan, fontSize, paddingV, paddingH) {
        textSpan.style.fontSize = `${fontSize}px`;
        const textRect = textSpan.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        
        const actualHeightUsage = textRect.height / (overlayRect.height - paddingV);
        const actualWidthUsage = textRect.width / (overlayRect.width - paddingH);
        
        if (actualHeightUsage < 0.9 && actualWidthUsage < 0.98) {
            const heightScale = 0.95 / actualHeightUsage;
            const widthScale = 0.99 / actualWidthUsage;
            const scale = Math.min(heightScale, widthScale, 1.15);
            const targetSize = fontSize * scale;
            
            textSpan.style.fontSize = `${targetSize}px`;
            
            if (!Utils.checkOverflow(textSpan, 0.2)) {
                fontSize = this._microAdjustment(textSpan, targetSize);
            } else {
                const midSize = (fontSize + targetSize) / 2;
                textSpan.style.fontSize = `${midSize}px`;
                fontSize = Utils.checkOverflow(textSpan, 0.5) ? fontSize : midSize;
            }
        }
        
        // Apply 10% bias
        const biasedSize = fontSize * 1.1;
        textSpan.style.fontSize = `${biasedSize}px`;
        return Utils.checkOverflow(textSpan, 0) ? fontSize : biasedSize;
    }
    
    _microAdjustment(textSpan, fontSize) {
        const microStep = 0.01;
        let attempts = 0;
        
        while (!Utils.checkOverflow(textSpan, 0) && 
               attempts < 100 && 
               fontSize < CONFIG.OVERLAY.MAX_FONT_SIZE) {
            fontSize += microStep;
            textSpan.style.fontSize = `${fontSize}px`;
            attempts++;
        }
        
        if (Utils.checkOverflow(textSpan, 0)) {
            fontSize -= microStep;
            textSpan.style.fontSize = `${fontSize}px`;
        }
        
        return fontSize;
    }
    
    autoIncreaseWithStreak(overlay, textSpan, streakManager) {
        let lastGoodSize = parseFloat(getComputedStyle(textSpan).fontSize);
        
        const step = () => {
            const currentSize = parseFloat(getComputedStyle(textSpan).fontSize);
            streakManager.incrementCount();
            const netChange = 1 - (Math.floor(streakManager.getCount() / 2) - 
                                  Math.floor((streakManager.getCount() - 1) / 2));
            const finalSize = currentSize + netChange;
            
            if (finalSize > CONFIG.OVERLAY.MAX_FONT_SIZE) {
                textSpan.style.fontSize = `${lastGoodSize}px`;
                streakManager.reset();
                return lastGoodSize;
            }
            
            textSpan.style.fontSize = `${finalSize}px`;
            
            if (Utils.checkOverflow(textSpan, 0)) {
                textSpan.style.fontSize = `${lastGoodSize}px`;
                streakManager.reset();
                return lastGoodSize;
            } else {
                lastGoodSize = finalSize;
                setTimeout(step, 0);
            }
        };
        
        step();
    }
}
