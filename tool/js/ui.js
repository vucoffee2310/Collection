import { colorPalettes } from './config.js';
import { parseCoords } from './utils.js';

const MIN_OVERLAY_HEIGHT = 25;

const checkOverflow = (el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;

export function autoFitFontSizeForElement(overlay) {
    const textSpan = overlay.querySelector('.overlay-text');
    if (!textSpan) return;
    
    textSpan.style.fontSize = '';
    const textLen = textSpan.textContent.length;
    const { clientWidth: w, clientHeight: h } = overlay;
    let fontSize = Math.max(4, Math.min((w / (textLen + 2)) * 1.6, h * 0.9, 80));
    
    textSpan.style.fontSize = `${fontSize}px`;
    
    while (checkOverflow(textSpan) && fontSize > 4) {
        textSpan.style.fontSize = `${--fontSize}px`;
    }
    
    if (!checkOverflow(textSpan)) {
        while (!checkOverflow(textSpan) && fontSize < 100) {
            textSpan.style.fontSize = `${++fontSize}px`;
        }
        textSpan.style.fontSize = `${--fontSize}px`;
    }
}

export function applyTheme(paletteKey) {
    const p = colorPalettes[paletteKey];
    if (!p) return;
    const styles = document.body.style;
    styles.setProperty('--overlay-bg', `rgba(${p.background.join(',')}, 0.9)`);
    styles.setProperty('--overlay-text', `rgb(${p.text.join(',')})`);
    styles.setProperty('--overlay-border', `rgb(${p.border.join(',')})`);
}

export const showLoading = (msg) => {
    const c = document.getElementById('pdf-container');
    c && (c.innerHTML = `<div class="loading">${msg}</div>`);
};

export const updatePageInfo = (msg) => {
    const el = document.getElementById('page-info');
    el && (el.textContent = msg);
};

export const clearPdfContainer = () => {
    const c = document.getElementById('pdf-container');
    c && (c.innerHTML = '');
};

export function createPageWrapper(pageNum, viewport) {
    const container = document.getElementById('pdf-container');
    if (!container) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'page-wrapper page-placeholder';
    wrapper.id = `page-wrapper-${pageNum}`;
    wrapper.dataset.pageNum = pageNum;
    wrapper.style.width = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;
    wrapper.innerHTML = `<span>Loading page ${pageNum}...</span>`;
    container.appendChild(wrapper);
    return wrapper;
}

export function addOverlaysToPage(pageWrapper, pageNum, viewport, overlayData) {
    const fragment = document.createDocumentFragment();
    pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
    
    const pageData = overlayData[`page_${pageNum}`];
    if (!pageData) return;
    
    const scaleX = viewport.width / 1000;
    const scaleY = viewport.height / 1000;
    
    Object.entries(pageData).forEach(([coords, info]) => {
        const [top, left, bottom, right] = parseCoords(coords);
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        Object.assign(overlay.style, {
            left: `${left * scaleX}px`,
            top: `${top * scaleY}px`,
            width: `${(right - left) * scaleX}px`,
            height: `${Math.max((bottom - top) * scaleY, MIN_OVERLAY_HEIGHT)}px`
        });
        Object.assign(overlay.dataset, { coords, pageNum });
        
        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';
        textSpan.textContent = info.text;
        textSpan.contentEditable = "true";
        overlay.appendChild(textSpan);
        
        const controls = document.createElement('div');
        controls.className = 'overlay-controls';
        controls.innerHTML = `
            <button class="font-size-btn" data-action="decrease" title="Decrease Font Size">-</button>
            <button class="font-size-btn" data-action="increase" title="Increase Font Size">+</button>
            <button class="font-size-btn" data-action="auto" title="Auto-fit Font Size">A</button>
        `;
        overlay.appendChild(controls);
        fragment.appendChild(overlay);
        
        if (typeof info.fontSize === 'number') {
            textSpan.style.fontSize = `${info.fontSize}px`;
        } else {
            setTimeout(() => autoFitFontSizeForElement(overlay), 0);
        }
    });
    
    pageWrapper.appendChild(fragment);
}

export const showSavingIndicator = () => {
    const div = document.createElement('div');
    div.className = 'saving-indicator';
    div.textContent = 'Saving to PDF... Please wait.';
    document.body.appendChild(div);
    return div;
};

export const removeSavingIndicator = (indicator) => indicator?.remove();