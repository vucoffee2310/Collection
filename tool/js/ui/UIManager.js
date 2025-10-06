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
        const span = document.getElementById(element.id.replace('-input', '-file-name'));
        if (span) span.textContent = fileName || defaultText;
    }
    
    clearContainer() {
        if (this.container) this.container.innerHTML = '';
    }
    
    createPageWrapper(pageNum, viewport) {
        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper page-placeholder';
        wrapper.id = `page-wrapper-${pageNum}`;
        wrapper.style.cssText = `width:${viewport.width}px;height:${viewport.height}px`;
        wrapper.innerHTML = `<span>Loading page ${pageNum}...</span>`;
        this.container?.appendChild(wrapper);
        return wrapper;
    }
    
    populatePaletteSwatches(container, defaultKey) {
        Object.entries(CONFIG.COLOR_PALETTES).forEach(([key, p]) => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch' + (key === defaultKey ? ' active' : '');
            swatch.dataset.paletteKey = key;
            swatch.title = p.name;
            swatch.style.cssText = `background:rgb(${p.background});color:rgb(${p.text})`;
            swatch.innerHTML = '<span>Aa</span>';
            container.appendChild(swatch);
        });
    }

    updateOverlayOpacity(paletteKey, opacity) {
        const p = CONFIG.COLOR_PALETTES[paletteKey];
        if (!p) return;
        document.body.style.setProperty('--overlay-bg', `rgba(${p.background}, ${opacity / 100})`);
        document.body.style.setProperty('--overlay-border', `rgb(${p.border})`);
    }

    updateTextBrightness(brightness) {
        const v = Math.round(brightness * 2.55);
        document.body.style.setProperty('--overlay-text', `rgb(${v}, ${v}, ${v})`);
    }
    
    showSavingIndicator() {
        const div = document.createElement('div');
        div.className = 'saving-indicator';
        div.textContent = 'Saving to PDF... Please wait.';
        document.body.appendChild(div);
        return div;
    }
    
    removeSavingIndicator(indicator) {
        indicator?.remove();
    }
}