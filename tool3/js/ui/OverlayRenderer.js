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
        
        pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        
        const W = dimensions.width;
        const H = dimensions.height;

        Object.keys(pageData).forEach(coords => {
            fragment.appendChild(this._createOverlay(coords, pageData[coords], pageNum, W, H));
        });
        
        pageWrapper.appendChild(fragment);
    }
    
    _createOverlay(coords, info, pageNum, W, H) {
        if (W <= 0 || H <= 0) return document.createElement('div');

        const pos = Utils.calculateOverlayPosition({
            coords, containerWidth: W, containerHeight: H,
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
        });

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.dataset.coords = coords;
        overlay.dataset.pageNum = pageNum;
        
        Object.assign(overlay.style, {
            left: Utils.toPercentage(pos.left, W),
            top: Utils.toPercentage(pos.top, H),
            width: Utils.toPercentage(pos.width, W),
            height: Utils.toPercentage(pos.height, H)
        });
        
        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';

        // --- MODIFICATION HERE ---
        // Use innerHTML to render the div structure from the merger.
        // Check if the text contains HTML tags to decide.
        if (info.text.includes('<div')) {
            textSpan.innerHTML = info.text;
        } else {
            textSpan.textContent = info.text;
        }
        
        overlay.appendChild(textSpan);
        
        requestAnimationFrame(() => this.fontSizeCalculator.calculateOptimalSize(overlay));
        
        return overlay;
    }
}