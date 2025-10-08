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
    
    updateFileName(el, name, def) {
        if (el) el.textContent = name || def;
    }
    
    clearContainer() {
        if (this.container) this.container.innerHTML = '';
    }
    
    createPageWrapper(n, vp) {
        const w = document.createElement('div');
        w.className = 'page-wrapper page-placeholder';
        w.id = `page-wrapper-${n}`;
        w.style.aspectRatio = `${vp.width} / ${vp.height}`;
        w.innerHTML = `<span>Loading page ${n}...</span>`;
        this.container?.appendChild(w);
        return w;
    }
    
    populatePaletteSwatches(cont, defKey) {
        cont.innerHTML = Object.entries(CONFIG.COLOR_PALETTES).map(([k, p]) => `
            <div class="palette-swatch ${k === defKey ? 'active' : ''}" data-palette-key="${k}" title="${p.name}" 
                 style="background:rgb(${p.background}); color:rgb(${p.text});">
                <span>Aa</span>
            </div>
        `).join('');
    }

    updateOverlayOpacity(key, opacity) {
        const p = CONFIG.COLOR_PALETTES[key];
        if (!p) return;
        const r = document.body.style;
        r.setProperty('--overlay-bg', `rgba(${p.background.join(',')}, ${opacity / 100})`);
        r.setProperty('--overlay-border', `rgb(${p.border.join(',')})`);
    }

    updateTextBrightness(b) {
        const v = Math.round(b * 2.55);
        document.body.style.setProperty('--overlay-text', `rgb(${v}, ${v}, ${v})`);
    }
    
    showSavingIndicator(msg = 'Saving... Please wait.') {
        const d = document.createElement('div');
        d.className = 'saving-indicator';
        d.textContent = msg;
        document.body.appendChild(d);
        return d;
    }
    
    removeSavingIndicator(ind) { ind?.remove(); }
}