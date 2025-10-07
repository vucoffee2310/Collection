import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayRenderer {
    constructor(stateManager, fontSizeCalculator) {
        this.stateManager = stateManager;
        this.fontSizeCalculator = fontSizeCalculator;
    }
    
    renderPageOverlays(pageWrapper, pageNum, dimensions, overlayData) {
        const fragment = document.createDocumentFragment();
        pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        
        const pageData = overlayData[`page_${pageNum}`];
        if (!pageData) return;
        
        Object.entries(pageData).forEach(([coords, info]) => {
            const overlay = this._createOverlay(coords, info, pageNum, dimensions);
            fragment.appendChild(overlay);
        });
        
        pageWrapper.appendChild(fragment);
    }
    
    _createOverlay(coords, info, pageNum, dimensions) {
        const pos = Utils.calculateOverlayPosition({
            coords: coords,
            containerWidth: dimensions.width,
            containerHeight: dimensions.height,
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
        });

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        
        // --- START OF FIX ---
        // Convert absolute pixel values to relative percentages for responsive scaling.
        const containerW = dimensions.width;
        const containerH = dimensions.height;

        // Prevent division by zero if the container has no dimensions yet.
        if (containerW > 0 && containerH > 0) {
            Object.assign(overlay.style, {
                left: `${(pos.left / containerW) * 100}%`,
                top: `${(pos.top / containerH) * 100}%`,
                width: `${(pos.width / containerW) * 100}%`,
                height: `${(pos.height / containerH) * 100}%`
            });
        }
        // --- END OF FIX ---

        overlay.dataset.coords = coords;
        overlay.dataset.pageNum = pageNum;
        
        const isEditable = false;
        overlay.appendChild(this._createTextSpan(info.text, isEditable));
        
        // This will now work correctly because the element itself scales with the page.
        requestAnimationFrame(() => this.fontSizeCalculator.calculateOptimalSize(overlay));
        
        return overlay;
    }
    
    _createTextSpan(text, isEditable) {
        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';
        textSpan.textContent = text;
        textSpan.contentEditable = isEditable;
        return textSpan;
    }
}