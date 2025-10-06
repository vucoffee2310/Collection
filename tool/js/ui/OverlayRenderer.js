import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayRenderer {
    constructor(stateManager, fontSizeCalculator) {
        this.stateManager = stateManager;
        this.fontSizeCalculator = fontSizeCalculator;
    }
    
    renderPageOverlays(pageWrapper, pageNum, viewport, overlayData) {
        const fragment = document.createDocumentFragment();
        pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        
        const pageData = overlayData[`page_${pageNum}`];
        if (!pageData) return;
        
        Object.entries(pageData).forEach(([coords, info]) => {
            const overlay = this._createOverlay(coords, info, pageNum, viewport);
            fragment.appendChild(overlay);
        });
        
        pageWrapper.appendChild(fragment);
    }
    
    _createOverlay(coords, info, pageNum, viewport) {
        const pos = Utils.calculateOverlayPosition({
            coords: coords,
            containerWidth: viewport.width,
            containerHeight: viewport.height,
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
        });

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        Object.assign(overlay.style, {
            left: `${pos.left}px`,
            top: `${pos.top}px`,
            width: `${pos.width}px`,
            height: `${pos.height}px`
        });
        overlay.dataset.coords = coords;
        overlay.dataset.pageNum = pageNum;
        
        // Merging is always active, so overlays are never editable.
        const isEditable = false;
        overlay.appendChild(this._createTextSpan(info.text, isEditable));
        
        // Auto-calculate font size after the element is in the DOM
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
