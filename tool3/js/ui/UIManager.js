import { CONFIG } from '../config.js';

export class UIManager {
    constructor() {
        this.container = document.querySelector('#pdf-container');
    }
    
    showLoading(msg) {
        if (this.container) this.container.innerHTML = `<div class="loading">${msg}</div>`;
    }
    
    updatePageInfo(msg) {
        const el = document.getElementById('page-info');
        if (el) el.textContent = msg;
    }
    
    updateFileName(element, fileName, defaultText) {
        // Optimization: Use provided element (which is the input element) to derive the output span ID
        const spanId = element.id.replace('-input', '-file-name');
        const span = document.getElementById(spanId);
        if (span) span.textContent = fileName || defaultText;
    }
    
    clearContainer() {
        if (this.container) this.container.innerHTML = '';
    }
    
    createPageWrapper(pageNum, viewport) {
        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper page-placeholder';
        wrapper.id = `page-wrapper-${pageNum}`;
        wrapper.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
        wrapper.innerHTML = `<span>Loading page ${pageNum}...</span>`;
        this.container?.appendChild(wrapper);
        return wrapper;
    }
    
    populatePaletteSwatches(container, defaultKey) {
        const fragment = document.createDocumentFragment();
        
        Object.entries(CONFIG.COLOR_PALETTES).forEach(([key, p]) => {
            const swatch = document.createElement('div');
            swatch.className = `palette-swatch${key === defaultKey ? ' active' : ''}`;
            swatch.dataset.paletteKey = key;
            swatch.title = p.name;
            swatch.style.cssText = `background:rgb(${p.background});color:rgb(${p.text})`;
            swatch.innerHTML = '<span>Aa</span>';
            fragment.appendChild(swatch);
        });
        
        container.appendChild(fragment);
    }

    updateOverlayOpacity(paletteKey, opacity) {
        const p = CONFIG.COLOR_PALETTES[paletteKey];
        if (!p) return;
        
        const root = document.body.style;
        root.setProperty('--overlay-bg', `rgba(${p.background.join(',')}, ${opacity / 100})`);
        root.setProperty('--overlay-border', `rgb(${p.border.join(',')})`);
    }

    updateTextBrightness(brightness) {
        const v = Math.round(brightness * 2.55);
        document.body.style.setProperty('--overlay-text', `rgb(${v}, ${v}, ${v})`);
    }
    
    showSavingIndicator(message = 'Saving... Please wait.') {
        const div = document.createElement('div');
        div.className = 'saving-indicator';
        div.textContent = message;
        document.body.appendChild(div);
        return div;
    }
    
    removeSavingIndicator(indicator) {
        indicator?.remove();
    }
}