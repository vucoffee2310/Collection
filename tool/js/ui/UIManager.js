import { CONFIG } from '../config.js';

export class UIManager {
    constructor(containerSelector = '#pdf-container') {
        this.container = document.querySelector(containerSelector);
    }
    
    showLoading(message) {
        if (this.container) this.container.innerHTML = `<div class="loading">${message}</div>`;
    }
    
    updatePageInfo(message) {
        const el = document.getElementById('page-info');
        if (el) el.textContent = message;
    }
    
    updateFileName(element, fileName, defaultText) {
        const spanId = element.id.replace('-input', '-file-name');
        const span = document.getElementById(spanId);
        if (span) span.textContent = fileName || defaultText;
    }
    
    clearContainer() {
        if (this.container) this.container.innerHTML = '';
    }
    
    createPageWrapper(pageNum, viewport) {
        if (!this.container) return null;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper page-placeholder';
        wrapper.id = `page-wrapper-${pageNum}`;
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.innerHTML = `<span>Loading page ${pageNum}...</span>`;
        this.container.appendChild(wrapper);
        
        return wrapper;
    }
    
    populatePaletteSwatches(container, defaultKey) {
        Object.entries(CONFIG.COLOR_PALETTES).forEach(([key, palette]) => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch' + (key === defaultKey ? ' active' : '');
            swatch.dataset.paletteKey = key;
            swatch.title = palette.name;
            swatch.style.background = `rgb(${palette.background.join(',')})`;
            swatch.style.color = `rgb(${palette.text.join(',')})`;
            swatch.innerHTML = '<span>Aa</span>';
            container.appendChild(swatch);
        });
    }

    updateOverlayOpacity(paletteKey, opacity) {
        const palette = CONFIG.COLOR_PALETTES[paletteKey];
        if (!palette) return;

        const alpha = opacity / 100;
        const bg = `rgba(${palette.background.join(',')}, ${alpha})`;
        document.body.style.setProperty('--overlay-bg', bg);
        document.body.style.setProperty('--overlay-border', `rgb(${palette.border.join(',')})`);
    }

    updateTextBrightness(brightness) {
        const value = Math.round(brightness * 2.55);
        const color = `rgb(${value}, ${value}, ${value})`;
        document.body.style.setProperty('--overlay-text', color);
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
