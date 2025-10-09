import { CONFIG } from '../config.js';

export class UIManager {
    constructor() {
        this.container = document.querySelector('#pdf-container');
        this.pageCoordStates = new Map();
        this.previewStates = new Map();
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
        this.previewStates.clear();
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
        this.pageCoordStates.set(pageNum, {
            currentOrder: '',
            appliedOrder: stateManager.getPageCoordinateOrder(pageNum),
            isOverride: stateManager.hasPageOverride(pageNum),
            currentOrderingIndex: 0,
            previewOrder: null
        });
        
        const state = this.pageCoordStates.get(pageNum);
        const displayClass = state.isOverride ? 'coord-display overridden' : 'coord-display';
        
        const controls = document.createElement('div');
        controls.className = 'page-coord-controls';
        controls.innerHTML = `
            <button class="coord-cancel-btn" data-page="${pageNum}">×</button>
            
            <div class="coord-row">
                <span class="coord-row-label">P${pageNum}</span>
                <div class="${displayClass}" data-page="${pageNum}">${state.appliedOrder}</div>
                <button class="coord-reload-btn" data-page="${pageNum}">↻</button>
            </div>
            
            <div class="coord-preview-text" data-page="${pageNum}"></div>
            
            <div class="coord-action-row">
                <button class="coord-action-btn primary" data-page="${pageNum}" data-action="current">Apply</button>
                <button class="coord-action-btn" data-page="${pageNum}" data-action="all">All Pages</button>
            </div>
            
            <div class="coord-row">
                <span class="coord-row-label">Manual</span>
                <div class="coord-buttons">
                    <button class="coord-btn" data-coord="T" data-page="${pageNum}">T</button>
                    <button class="coord-btn" data-coord="L" data-page="${pageNum}">L</button>
                    <button class="coord-btn" data-coord="B" data-page="${pageNum}">B</button>
                    <button class="coord-btn" data-coord="R" data-page="${pageNum}">R</button>
                </div>
            </div>
        `;
        
        controls.querySelectorAll('.coord-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleCoordButtonClick(btn, pageNum, stateManager, renderCallback));
        });
        
        controls.querySelector('.coord-reload-btn')?.addEventListener('click', () => {
            this.handleReloadCoordOrder(pageNum, stateManager, renderCallback);
        });
        
        controls.querySelector('.coord-cancel-btn')?.addEventListener('click', () => {
            this.cancelPreview(pageNum, stateManager, renderCallback);
        });
        
        controls.querySelectorAll('.coord-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleApplyCoordOrder(btn, pageNum, stateManager, renderCallback);
            });
        });
        
        wrapper.appendChild(controls);
    }
    
    handleReloadCoordOrder(pageNum, stateManager, renderCallback) {
        const state = this.pageCoordStates.get(pageNum);
        if (!state) return;
        
        state.currentOrderingIndex = (state.currentOrderingIndex + 1) % CONFIG.COORDINATE_ORDERINGS.length;
        const ordering = CONFIG.COORDINATE_ORDERINGS[state.currentOrderingIndex];
        state.previewOrder = ordering.order;
        
        this.previewStates.set(pageNum, {
            order: ordering.order,
            originalOrder: stateManager.getPageCoordinateOrder(pageNum)
        });
        
        const previewText = document.querySelector(`.coord-preview-text[data-page="${pageNum}"]`);
        if (previewText) previewText.textContent = ordering.name;
        
        const controls = document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`);
        if (controls) controls.classList.add('preview-active');
        
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper) wrapper.classList.add('preview-mode');
        
        stateManager.setPageCoordinateOrder(pageNum, ordering.order);
        renderCallback();
    }
    
    cancelPreview(pageNum, stateManager, renderCallback) {
        const previewState = this.previewStates.get(pageNum);
        const state = this.pageCoordStates.get(pageNum);
        
        if (!previewState || !state) return;
        
        if (previewState.originalOrder) {
            stateManager.setPageCoordinateOrder(pageNum, previewState.originalOrder);
        }
        
        state.previewOrder = null;
        this.previewStates.delete(pageNum);
        
        const controls = document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`);
        if (controls) controls.classList.remove('preview-active');
        
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper) wrapper.classList.remove('preview-mode');
        
        renderCallback();
    }
    
    handleApplyCoordOrder(btn, pageNum, stateManager, renderCallback) {
        const action = btn.dataset.action;
        const state = this.pageCoordStates.get(pageNum);
        const previewState = this.previewStates.get(pageNum);
        
        if (!state || !state.previewOrder || !previewState) return;
        
        if (action === 'current') {
            this.applyPageCoordinateOrder(pageNum, state.previewOrder, stateManager, renderCallback, true);
            this.clearPreviewUI(pageNum);
        } else if (action === 'all') {
            if (confirm(`Apply "${state.previewOrder}" to ALL pages?`)) {
                stateManager.applyCoordinateOrderToAllPages(state.previewOrder);
                stateManager.setGlobalCoordinateOrder(state.previewOrder);
                
                const globalDisplay = document.getElementById('coord-display');
                if (globalDisplay) globalDisplay.textContent = state.previewOrder;
                
                this.pageCoordStates.forEach((pageState, pNum) => {
                    pageState.appliedOrder = state.previewOrder;
                    pageState.isOverride = true;
                    
                    const display = document.querySelector(`.coord-display[data-page="${pNum}"]`);
                    if (display) {
                        display.textContent = state.previewOrder;
                        display.classList.add('overridden');
                    }
                    
                    this.clearPreviewUI(pNum);
                });
                
                this.previewStates.clear();
                document.dispatchEvent(new CustomEvent('reloadAllPages'));
            }
        }
    }
    
    clearPreviewUI(pageNum) {
        const controls = document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`);
        if (controls) controls.classList.remove('preview-active');
        
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper) wrapper.classList.remove('preview-mode');
        
        const state = this.pageCoordStates.get(pageNum);
        if (state) state.previewOrder = null;
    }
    
    handleCoordButtonClick(btn, pageNum, stateManager, renderCallback) {
        const letter = btn.dataset.coord;
        const state = this.pageCoordStates.get(pageNum);
        
        if (!state || state.currentOrder.includes(letter)) return;
        
        state.currentOrder += letter;
        
        const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
        if (display) {
            display.textContent = state.currentOrder || '____';
        }
        
        btn.classList.add('used');
        
        if (state.currentOrder.length === 4) {
            setTimeout(() => {
                this.applyPageCoordinateOrder(pageNum, state.currentOrder, stateManager, renderCallback, false);
            }, 300);
        }
    }
    
    applyPageCoordinateOrder(pageNum, order, stateManager, renderCallback, isFromPreview = false) {
        const state = this.pageCoordStates.get(pageNum);
        if (!state || order.length !== 4) return;
        
        try {
            const normalized = order.toUpperCase().trim();
            const chars = normalized.split('');
            const required = ['T', 'L', 'B', 'R'];
            
            for (const req of required) {
                if (!chars.includes(req)) throw new Error(`Must contain ${req}`);
            }
            
            if (new Set(chars).size !== 4) throw new Error('No duplicates');
            
            stateManager.setPageCoordinateOrder(pageNum, normalized);
            state.appliedOrder = normalized;
            state.isOverride = true;
            
            const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
            if (display) {
                display.textContent = normalized;
                display.classList.add('overridden');
            }
            
            if (!isFromPreview) renderCallback();
            
            state.currentOrder = '';
            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            wrapper?.querySelectorAll('.coord-btn').forEach(btn => btn.classList.remove('used'));
            
        } catch (error) {
            alert(`Invalid: ${error.message}`);
            state.currentOrder = '';
            const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
            if (display) display.textContent = state.appliedOrder;
            
            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            wrapper?.querySelectorAll('.coord-btn').forEach(btn => btn.classList.remove('used'));
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