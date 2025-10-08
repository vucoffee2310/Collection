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
        if (element) element.textContent = fileName || defaultText;
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
        container.innerHTML = Object.entries(CONFIG.COLOR_PALETTES).map(([key, p]) => `
            <div 
                class="palette-swatch ${key === defaultKey ? 'active' : ''}" 
                data-palette-key="${key}" 
                title="${p.name}" 
                style="background:rgb(${p.background}); color:rgb(${p.text});">
                <span>Aa</span>
            </div>
        `).join('');
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
