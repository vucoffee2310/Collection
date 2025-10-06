import { colorPalettes } from './config.js';
import { parseCoords } from './utils.js';

const MIN_OVERLAY_HEIGHT = 25;

// More lenient overflow check - allows for sub-pixel differences
const checkOverflow = (el, tolerance = 1) => {
    return el.scrollHeight > el.clientHeight + tolerance || 
           el.scrollWidth > el.clientWidth + tolerance;
};

export function autoFitFontSizeForElement(overlay) {
    const textSpan = overlay.querySelector('.overlay-text');
    if (!textSpan) return;
    
    // Clear any existing font size
    textSpan.style.fontSize = '';
    
    const { clientWidth: w, clientHeight: h } = overlay;
    const textContent = textSpan.textContent;
    const textLen = textContent.length;
    
    // Get computed styles to account for padding and line-height
    const overlayStyle = getComputedStyle(overlay);
    const paddingH = parseFloat(overlayStyle.paddingLeft) + parseFloat(overlayStyle.paddingRight);
    const paddingV = parseFloat(overlayStyle.paddingTop) + parseFloat(overlayStyle.paddingBottom);
    const availableWidth = w - paddingH;
    const availableHeight = h - paddingV;
    
    // Start with an aggressive estimate
    // Increase the initial multiplier for better starting point
    const estimatedCharsPerLine = availableWidth / (availableHeight * 0.55); // Was 0.6
    const estimatedLines = Math.ceil(textLen / estimatedCharsPerLine);
    let fontSize = (availableHeight / estimatedLines) * 0.95; // Start at 95% instead of 90%
    
    // Account for line-height (1.35 from CSS)
    const lineHeightFactor = 1.35;
    fontSize = fontSize / lineHeightFactor;
    
    // Ensure initial size is reasonable
    fontSize = Math.min(fontSize, 150);
    fontSize = Math.max(fontSize, 6);
    
    // First attempt with aggressive size
    textSpan.style.fontSize = `${fontSize}px`;
    
    // If initial size doesn't overflow, try to go bigger immediately
    if (!checkOverflow(textSpan, 0.5)) {
        // Try 20% bigger right away
        const aggressiveSize = fontSize * 1.2;
        textSpan.style.fontSize = `${aggressiveSize}px`;
        if (!checkOverflow(textSpan, 0.5)) {
            fontSize = aggressiveSize;
        } else {
            textSpan.style.fontSize = `${fontSize}px`;
        }
    }
    
    // Binary search with more aggressive bounds
    if (checkOverflow(textSpan, 0.5)) {
        let high = fontSize;
        let low = fontSize * 0.5;
        let bestSize = low;
        
        while (high - low > 0.05) {
            const mid = (high + low) / 2;
            textSpan.style.fontSize = `${mid}px`;
            
            if (checkOverflow(textSpan, 0.5)) {
                high = mid;
            } else {
                bestSize = mid;
                low = mid;
            }
        }
        fontSize = bestSize;
    }
    
    // Aggressive incremental increase phase
    textSpan.style.fontSize = `${fontSize}px`;
    
    // Start with larger steps
    let stepSize = 0.5;
    let consecutiveFailures = 0;
    
    while (fontSize < 150 && consecutiveFailures < 3) {
        const testSize = fontSize + stepSize;
        textSpan.style.fontSize = `${testSize}px`;
        
        if (checkOverflow(textSpan, 0.5)) {
            textSpan.style.fontSize = `${fontSize}px`;
            stepSize = stepSize * 0.5;
            consecutiveFailures++;
            
            if (stepSize < 0.02) {
                break;
            }
        } else {
            fontSize = testSize;
            consecutiveFailures = 0;
            // Try to accelerate if we have room
            if (!checkOverflow(textSpan, 0)) {
                stepSize = Math.min(stepSize * 1.2, 1.0);
            }
        }
    }
    
    // Final push - be more aggressive
    // Check actual space usage
    textSpan.style.fontSize = `${fontSize}px`;
    const textRect = textSpan.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    
    // Calculate actual usage ratios
    const actualHeightUsage = textRect.height / (overlayRect.height - paddingV);
    const actualWidthUsage = textRect.width / (overlayRect.width - paddingH);
    
    // If we're using less than 90% of space, push harder
    if (actualHeightUsage < 0.9 && actualWidthUsage < 0.98) {
        // Calculate how much we can theoretically increase
        const heightScale = 0.95 / actualHeightUsage;
        const widthScale = 0.99 / actualWidthUsage;
        const scale = Math.min(heightScale, widthScale, 1.15); // Up to 15% increase
        
        const targetSize = fontSize * scale;
        textSpan.style.fontSize = `${targetSize}px`;
        
        // Verify it still fits with lenient check
        if (!checkOverflow(textSpan, 0.2)) {
            fontSize = targetSize;
            
            // Try tiny increments from here
            while (!checkOverflow(textSpan, 0) && fontSize < 150) {
                fontSize += 0.01;
                textSpan.style.fontSize = `${fontSize}px`;
            }
            
            if (checkOverflow(textSpan, 0)) {
                fontSize -= 0.01;
            }
        } else {
            // If aggressive push failed, try halfway
            const midSize = (fontSize + targetSize) / 2;
            textSpan.style.fontSize = `${midSize}px`;
            if (!checkOverflow(textSpan, 0.5)) {
                fontSize = midSize;
            } else {
                textSpan.style.fontSize = `${fontSize}px`;
            }
        }
    }
    
    // One final micro-adjustment pass
    textSpan.style.fontSize = `${fontSize}px`;
    const microStep = 0.01;
    let finalPushAttempts = 0;
    
    while (!checkOverflow(textSpan, 0) && finalPushAttempts < 100 && fontSize < 150) {
        fontSize += microStep;
        textSpan.style.fontSize = `${fontSize}px`;
        finalPushAttempts++;
    }
    
    // Back off if we went too far
    if (checkOverflow(textSpan, 0)) {
        fontSize -= microStep;
        textSpan.style.fontSize = `${fontSize}px`;
    }
    
    // Add 10% bias to match your manual adjustments
    const biasedSize = fontSize * 1.1;
    textSpan.style.fontSize = `${biasedSize}px`;
    if (checkOverflow(textSpan, 0)) {
        textSpan.style.fontSize = `${fontSize}px`;
    } else {
        fontSize = biasedSize;
    }
    
    // Ensure final size is set
    textSpan.style.fontSize = `${fontSize}px`;
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