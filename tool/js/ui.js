// js/ui.js
import { colorPalettes } from './config.js';
import { parseCoords } from './utils.js';

export function autoFitFontSizeForElement(overlay) {
    const textSpan = overlay.querySelector('.overlay-text');
    if (!textSpan) return;
    textSpan.style.fontSize = '';
    const doesOverflow = () => textSpan.scrollHeight > textSpan.clientHeight || textSpan.scrollWidth > textSpan.clientWidth;
    const textLength = textSpan.textContent.length;
    const containerWidth = overlay.clientWidth;
    const containerHeight = overlay.clientHeight;
    const sizeFromWidth = (containerWidth / (textLength + 2)) * 1.6;
    const sizeFromHeight = containerHeight * 0.9;

    let fontSize = Math.max(4, Math.min(sizeFromWidth, sizeFromHeight, 80));
    
    textSpan.style.fontSize = `${fontSize}px`;

    while (doesOverflow() && fontSize > 4) {
        fontSize -= 0.5;
        textSpan.style.fontSize = `${fontSize}px`;
    }
    if (!doesOverflow()) {
        while (!doesOverflow() && fontSize < 100) {
            fontSize += 0.5;
            textSpan.style.fontSize = `${fontSize}px`;
        }
        fontSize -= 0.5;
        textSpan.style.fontSize = `${fontSize}px`;
    }
}

export function applyTheme(paletteKey) {
    const palette = colorPalettes[paletteKey];
    if (!palette) return;
    const bg = `rgba(${palette.background.join(',')}, 0.9)`;
    const text = `rgb(${palette.text.join(',')})`;
    const border = `rgb(${palette.border.join(',')})`;
    document.body.style.setProperty('--overlay-bg', bg);
    document.body.style.setProperty('--overlay-text', text);
    document.body.style.setProperty('--overlay-border', border);
}

export function showLoading(message) {
    const pdfContainer = document.getElementById('pdf-container');
    if (pdfContainer) {
        pdfContainer.innerHTML = `<div class="loading">${message}</div>`;
    }
}

export function updatePageInfo(message) {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        pageInfo.textContent = message;
    }
}

export function clearPdfContainer() {
    const pdfContainer = document.getElementById('pdf-container');
    if (pdfContainer) {
        pdfContainer.innerHTML = '';
    }
}

export function createPageWrapper(pageNum, viewport) {
    const pdfContainer = document.getElementById('pdf-container');
    if (!pdfContainer) return null;
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'page-wrapper page-placeholder';
    pageWrapper.id = `page-wrapper-${pageNum}`;
    pageWrapper.dataset.pageNum = pageNum;
    pageWrapper.style.width = `${viewport.width}px`;
    pageWrapper.style.height = `${viewport.height}px`;
    pageWrapper.innerHTML = `<span>Loading page ${pageNum}...</span>`; 
    pdfContainer.appendChild(pageWrapper);
    return pageWrapper;
}

const MIN_OVERLAY_HEIGHT_PX = 25;

export function addOverlaysToPage(pageWrapper, pageNum, viewport, overlayData) {
    const fragment = document.createDocumentFragment();

    pageWrapper.querySelectorAll('.overlay').forEach(el => el.remove());
    const pageKey = `page_${pageNum}`;
    const pageData = overlayData[pageKey];
    if (!pageData) return;

    const scaleFactorWidth = viewport.width / 1000;
    const scaleFactorHeight = viewport.height / 1000;

    for (const [coords, overlayInfo] of Object.entries(pageData)) {
        const coordsArray = parseCoords(coords);
        const [top, left, bottom, right] = coordsArray;

        const x = left * scaleFactorWidth;
        const y = top * scaleFactorHeight;
        const width = (right - left) * scaleFactorWidth;
        
        const originalHeight = (bottom - top) * scaleFactorHeight;
        const height = Math.max(originalHeight, MIN_OVERLAY_HEIGHT_PX);

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        Object.assign(overlay.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
        Object.assign(overlay.dataset, { coords, pageNum });

        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';
        textSpan.textContent = overlayInfo.text;
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

        if (typeof overlayInfo.fontSize === 'number') {
            textSpan.style.fontSize = `${overlayInfo.fontSize}px`;
        } else {
            setTimeout(() => autoFitFontSizeForElement(overlay), 0);
        }
    }
    
    pageWrapper.appendChild(fragment);
}

export function showSavingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'saving-indicator';
    indicator.textContent = 'Saving to PDF... Please wait.';
    document.body.appendChild(indicator);
    return indicator;
}

export function removeSavingIndicator(indicator) {
    if (indicator) document.body.removeChild(indicator);
}