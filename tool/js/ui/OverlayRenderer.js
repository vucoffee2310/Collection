export class OverlayRenderer {
    constructor(stateManager, fontSizeCalculator) {
        this.stateManager = stateManager;
        this.fontSizeCalculator = fontSizeCalculator;
    }
    
    addOverlaysToPage(pageWrapper, pageNum, viewport) {
        const fragment = document.createDocumentFragment();
        pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        
        const state = this.stateManager.getState();
        const pageData = state.overlayData[`page_${pageNum}`];
        if (!pageData) return;
        
        const scaleX = viewport.width / 1000;
        const scaleY = viewport.height / 1000;
        
        Object.entries(pageData).forEach(([coords, info]) => {
            const overlay = this._createOverlay(coords, info, pageNum, scaleX, scaleY);
            fragment.appendChild(overlay);
        });
        
        pageWrapper.appendChild(fragment);
    }
    
    _createOverlay(coords, info, pageNum, scaleX, scaleY) {
        const [top, left, bottom, right] = Utils.parseCoords(coords);
        
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        Object.assign(overlay.style, {
            left: `${left * scaleX}px`,
            top: `${top * scaleY}px`,
            width: `${(right - left) * scaleX}px`,
            height: `${Math.max((bottom - top) * scaleY, CONFIG.OVERLAY.MIN_HEIGHT)}px`
        });
        Object.assign(overlay.dataset, { coords, pageNum });
        
        const textSpan = this._createTextSpan(info.text);
        overlay.appendChild(textSpan);
        
        const controls = this._createControls();
        overlay.appendChild(controls);
        
        if (typeof info.fontSize === 'number') {
            textSpan.style.fontSize = `${info.fontSize}px`;
        } else {
            setTimeout(() => this.fontSizeCalculator.calculateOptimalSize(overlay, textSpan), 0);
        }
        
        return overlay;
    }
    
    _createTextSpan(text) {
        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';
        textSpan.textContent = text;
        textSpan.contentEditable = "true";
        return textSpan;
    }
    
    _createControls() {
        const controls = document.createElement('div');
        controls.className = 'overlay-controls';
        controls.innerHTML = `
            <button class="font-size-btn" data-action="decrease" title="Decrease Font Size">-</button>
            <button class="font-size-btn" data-action="increase" title="Increase Font Size">+</button>
            <button class="font-size-btn" data-action="auto" title="Auto-fit Font Size">A</button>
        `;
        return controls;
    }
}
