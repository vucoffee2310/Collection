import { CONFIG } from '../config.js';

export class FontSizeCalculator {
    calculateOptimalSize(overlay) {
        const textSpan = overlay.querySelector('.overlay-text');
        if (!textSpan?.textContent?.length) return;

        const pageWrapper = overlay.closest('.page-wrapper');
        const { clientWidth: w, clientHeight: h } = overlay;
        if (w <= 0 || h <= 0) return;

        const optimalSizePx = this._calculateFontSize(textSpan, overlay, w, h);

        if (pageWrapper) {
            const baseSizePx = parseFloat(getComputedStyle(pageWrapper).fontSize) || 16;
            if (baseSizePx > 0) {
                // Set font size as a percentage relative to the page's 1vw base size.
                overlay.style.fontSize = `${(optimalSizePx / baseSizePx) * 100}%`;
                textSpan.style.fontSize = ''; // Let overlay's font size control the text
                return;
            }
        }
        
        textSpan.style.fontSize = `${optimalSizePx}px`;
    }

    _calculateFontSize(textSpan, container, maxW, maxH) {
        const { MIN_FONT_SIZE, MAX_FONT_SIZE } = CONFIG.OVERLAY;
        textSpan.style.fontSize = ''; // Reset for measurement

        let high = MAX_FONT_SIZE;
        let low = MIN_FONT_SIZE;
        let best = low;
        // Use a small pixel tolerance for both search precision and overflow checking.
        const tolerance = 0.5;

        // Binary search for the optimal font size
        while (high - low > tolerance) {
            const mid = (high + low) / 2;
            textSpan.style.fontSize = `${mid}px`;

            // Directly measure the text span's content size against the container's available space.
            // This is more robust than checking the container's own scroll properties, as it's
            // not affected by flexbox alignment properties like 'align-items: center'.
            if (textSpan.scrollHeight > container.clientHeight + tolerance ||
                textSpan.scrollWidth > container.clientWidth + tolerance) {
                high = mid; // Too big
            } else {
                best = mid; // Fits, try larger
                low = mid;
            }
        }
        return best;
    }
}