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
        
        // Efficiently remove all existing overlays
        pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        
        const W = dimensions.width;
        const H = dimensions.height;

        // Optimization: Use Object.keys for better iteration performance
        Object.keys(pageData).forEach(coords => {
            const info = pageData[coords];
            fragment.appendChild(this._createOverlay(coords, info, pageNum, W, H));
        });
        
        pageWrapper.appendChild(fragment);
    }
    
    _createOverlay(coords, info, pageNum, W, H) {
        if (W <= 0 || H <= 0) return document.createElement('div');

        const pos = Utils.calculateOverlayPosition({
            coords,
            containerWidth: W,
            containerHeight: H,
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
        });

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.dataset.coords = coords;
        overlay.dataset.pageNum = pageNum;
        
        // Optimization: Assign styles in a single call
        Object.assign(overlay.style, {
            left: Utils.toPercentage(pos.left, W),
            top: Utils.toPercentage(pos.top, H),
            width: Utils.toPercentage(pos.width, W),
            height: Utils.toPercentage(pos.height, H)
        });
        
        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';
        textSpan.textContent = info.text;
        overlay.appendChild(textSpan);
        
        // Crucial optimization: Defer heavy font sizing calculation to next frame
        requestAnimationFrame(() => this.fontSizeCalculator.calculateOptimalSize(overlay));
        
        return overlay;
    }
}