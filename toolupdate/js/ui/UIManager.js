import { CONFIG } from '../config.js';

export class UIManager {
    constructor() {
        this.container = document.querySelector('#pdf-container');
        this.pageCoordStates = new Map(); // Track coordinate input state per page
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
        this.pageCoordStates.clear();
    }
    
    createPageWrapper(n, vp) {
        const w = document.createElement('div');
        w.className = 'page-wrapper page-placeholder';
        w.id = `page-wrapper-${n}`;
        w.dataset.pageNum = n;
        w.style.aspectRatio = `${vp.width} / ${vp.height}`;
        w.innerHTML = `<span>Loading page ${n}...</span>`;
        this.container?.appendChild(w);
        return w;
    }
    
    addPageCoordControls(wrapper, pageNum, stateManager, renderCallback) {
        // Initialize state for this page
        this.pageCoordStates.set(pageNum, {
            currentOrder: '',
            appliedOrder: stateManager.getPageCoordinateOrder(pageNum),
            isOverride: stateManager.hasPageOverride(pageNum)
        });
        
        const state = this.pageCoordStates.get(pageNum);
        const displayClass = state.isOverride ? 'coord-display overridden' : 'coord-display';
        
        const controls = document.createElement('div');
        controls.className = 'page-coord-controls';
        controls.innerHTML = `
            <span class="page-coord-label">P${pageNum}</span>
            <div class="${displayClass}" data-page="${pageNum}" title="${state.isOverride ? 'Page override active' : 'Using global setting'}">${state.appliedOrder}</div>
            <div class="coord-buttons">
                <button class="coord-btn" data-coord="T" data-page="${pageNum}" title="Top">T</button>
                <button class="coord-btn" data-coord="L" data-page="${pageNum}" title="Left">L</button>
                <button class="coord-btn" data-coord="B" data-page="${pageNum}" title="Bottom">B</button>
                <button class="coord-btn" data-coord="R" data-page="${pageNum}" title="Right">R</button>
            </div>
        `;
        
        // Add event listeners to coordinate buttons
        controls.querySelectorAll('.coord-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleCoordButtonClick(btn, pageNum, stateManager, renderCallback);
            });
        });
        
        wrapper.appendChild(controls);
    }
    
    handleCoordButtonClick(btn, pageNum, stateManager, renderCallback) {
        const letter = btn.dataset.coord;
        const state = this.pageCoordStates.get(pageNum);
        
        if (!state) return;
        
        // Check if already used
        if (state.currentOrder.includes(letter)) {
            return;
        }
        
        // Add to current order
        state.currentOrder += letter;
        
        // Update display
        const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
        if (display) {
            display.textContent = state.currentOrder || '____';
            display.style.borderColor = state.currentOrder.length === 4 ? 'var(--blue)' : 'var(--gray-dark)';
        }
        
        // Mark button as used
        btn.classList.add('used');
        
        // If complete (4 letters), auto-apply
        if (state.currentOrder.length === 4) {
            setTimeout(() => {
                this.applyPageCoordinateOrder(pageNum, state.currentOrder, stateManager, renderCallback);
            }, 300);
        }
    }
    
    applyPageCoordinateOrder(pageNum, order, stateManager, renderCallback) {
        const state = this.pageCoordStates.get(pageNum);
        if (!state || order.length !== 4) return;
        
        try {
            // Validate order
            const normalized = order.toUpperCase().trim();
            const chars = normalized.split('');
            const required = ['T', 'L', 'B', 'R'];
            
            for (const req of required) {
                if (!chars.includes(req)) {
                    throw new Error(`Coordinate order must contain ${req}`);
                }
            }
            
            if (new Set(chars).size !== 4) {
                throw new Error('Coordinate order must not have duplicate letters');
            }
            
            // Set the coordinate order override for this page
            stateManager.setPageCoordinateOrder(pageNum, normalized);
            state.appliedOrder = normalized;
            state.isOverride = true;
            
            // Update display to show it's an override
            const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
            if (display) {
                display.textContent = normalized;
                display.classList.add('overridden');
                display.title = 'Page override active (overrides global)';
            }
            
            // Re-render this page
            renderCallback();
            
            // Reset for next change
            state.currentOrder = '';
            
            // Reset buttons
            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            if (wrapper) {
                wrapper.querySelectorAll('.coord-btn').forEach(btn => btn.classList.remove('used'));
            }
            
        } catch (error) {
            alert(`Invalid coordinate order: ${error.message}`);
            state.currentOrder = '';
            const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
            if (display) {
                display.textContent = state.appliedOrder;
            }
            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            if (wrapper) {
                wrapper.querySelectorAll('.coord-btn').forEach(btn => btn.classList.remove('used'));
            }
        }
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