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
        
        const isVertical = pos.width > 0 && (pos.height / pos.width) > CONFIG.OVERLAY.VERTICAL_THRESHOLD;
        if (isVertical) {
            overlay.classList.add('vertical-text');
        }

        // --- CORRECTED LOGIC ---
        // A block is considered single-line if it's not a merged block
        // and doesn't contain explicit newlines.
        const isSingleLine = !info.text.includes('<div') && !info.text.includes('\n');
        if (isSingleLine) {
            // Apply the layout class to the PARENT overlay element
            overlay.classList.add('single-line-layout');
        }
        // --- END CORRECTION ---

        Object.assign(overlay.style, {
            left: Utils.toPercentage(pos.left, W),
            top: Utils.toPercentage(pos.top, H),
            width: Utils.toPercentage(pos.width, W),
            height: Utils.toPercentage(pos.height, H)
        });
        
        const textSpan = this._createTextSpan(info.text);
        const deleteBtn = this._createDeleteButton(overlay);
        
        overlay.append(textSpan, deleteBtn);
        
        requestAnimationFrame(() => this.fontSizeCalculator.calculateOptimalSize(overlay));
        
        return overlay;
    }

    _createTextSpan(text) {
        const textSpan = document.createElement('span');
        textSpan.className = 'overlay-text';
        textSpan.contentEditable = true;
        
        // No special class needed here anymore
        if (text.includes('<div')) {
            textSpan.innerHTML = text;
        } else {
            textSpan.textContent = text;
        }

        textSpan.addEventListener('blur', (e) => this._handleTextUpdate(e));
        
        return textSpan;
    }

    _createDeleteButton(overlayEl) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-overlay-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete this overlay';
        
        deleteBtn.addEventListener('click', (e) => this._handleDelete(e));

        return deleteBtn;
    }

    _handleTextUpdate(e) {
        const textSpan = e.target;
        const overlay = textSpan.closest('.overlay');
        if (!overlay) return;

        const { pageNum, coords } = overlay.dataset;
        const newText = textSpan.querySelector('.merged-text-block') 
            ? textSpan.innerHTML 
            : textSpan.innerText;

        this.stateManager.updateOverlayText(pageNum, coords, newText);
        this.fontSizeCalculator.calculateOptimalSize(overlay);
    }

    _handleDelete(e) {
        const button = e.target;
        const overlay = button.closest('.overlay');
        if (!overlay) return;

        if (confirm('Are you sure you want to delete this overlay?')) {
            const { pageNum, coords } = overlay.dataset;
            this.stateManager.deleteOverlay(pageNum, coords);
            overlay.remove();
        }
    }
}