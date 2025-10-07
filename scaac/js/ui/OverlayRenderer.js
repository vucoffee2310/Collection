import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayRenderer {
    constructor(stateManager, fontSizeCalculator) {
        this.stateManager = stateManager;
        this.fontSizeCalculator = fontSizeCalculator;
    }
    
    renderPageOverlays(pageWrapper, pageNum, dimensions, overlayData) {
        const pageData = overlayData[`page_${pageNum}`];
        if (!pageData) return;

        const fragment = document.createDocumentFragment();
        
        Object.entries(pageData).forEach(([coords, info]) => {
            fragment.appendChild(this._createOverlay(coords, info, pageNum, dimensions));
        });
        
        pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        pageWrapper.appendChild(fragment);
    }
    
    _createOverlay(coords, info, pageNum, dimensions) {
        const { width: w, height: h } = dimensions;
        
        // Early return if no dimensions
        if (w <= 0 || h <= 0) return document.createElement('div');

        const pos = Utils.calculateOverlayPosition({
            coords,
            containerWidth: w,
            containerHeight: h,
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
        });

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.dataset.coords = coords;
        overlay.dataset.pageNum = pageNum;
        
        Object.assign(overlay.style, {
            left: Utils.toPercentage(pos.left, w),
            top: Utils.toPercentage(pos.top, h),
            width: Utils.toPercentage(pos.width, w),
            height: Utils.toPercentage(pos.height, h)
        });
        
        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';
        textSpan.textContent = info.text;
        overlay.appendChild(textSpan);
        
        requestAnimationFrame(() => this.fontSizeCalculator.calculateOptimalSize(overlay));
        
        return overlay;
    }
}