import { CONFIG } from '../config.js';

export class CoordinateControls {
    constructor(coordManager) {
        this.coordManager = coordManager;
        this.pageStates = new Map();
        this.previewStates = new Map();
    }
    
    addPageControls(wrapper, pageNum, stateManager, renderCallback) {
        this.pageStates.set(pageNum, {
            currentOrder: '',
            appliedOrder: stateManager.getPageCoordinateOrder(pageNum),
            isOverride: stateManager.hasPageOverride(pageNum),
            currentOrderingIndex: 0,
            previewOrder: null
        });
        
        const state = this.pageStates.get(pageNum);
        const displayClass = state.isOverride ? 'coord-display overridden' : 'coord-display';
        
        const controls = this._createControlsHTML(pageNum, displayClass, state.appliedOrder);
        
        this._setupControlEvents(controls, pageNum, stateManager, renderCallback);
        
        wrapper.appendChild(controls);
    }
    
    _createControlsHTML(pageNum, displayClass, appliedOrder) {
        const controls = document.createElement('div');
        controls.className = 'page-coord-controls';
        controls.innerHTML = `
            <button class="coord-cancel-btn" data-page="${pageNum}">×</button>
            
            <div class="coord-row">
                <span class="coord-row-label">P${pageNum}</span>
                <div class="${displayClass}" data-page="${pageNum}">${appliedOrder}</div>
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
        return controls;
    }
    
    _setupControlEvents(controls, pageNum, stateManager, renderCallback) {
        // Manual coordinate buttons
        controls.querySelectorAll('.coord-btn').forEach(btn => {
            btn.addEventListener('click', () => 
                this.handleManualCoordButton(btn, pageNum, stateManager, renderCallback));
        });
        
        // Reload button - cycle through presets
        controls.querySelector('.coord-reload-btn')?.addEventListener('click', () => {
            this.handleReloadCoordOrder(pageNum, stateManager, renderCallback);
        });
        
        // Cancel preview button
        controls.querySelector('.coord-cancel-btn')?.addEventListener('click', () => {
            this.cancelPreview(pageNum, stateManager, renderCallback);
        });
        
        // Apply action buttons
        controls.querySelectorAll('.coord-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleApplyCoordOrder(btn, pageNum, stateManager, renderCallback);
            });
        });
    }
    
    handleReloadCoordOrder(pageNum, stateManager, renderCallback) {
        const state = this.pageStates.get(pageNum);
        if (!state) return;
        
        // Cycle through available coordinate orderings
        state.currentOrderingIndex = (state.currentOrderingIndex + 1) % CONFIG.COORDINATE_ORDERINGS.length;
        const ordering = CONFIG.COORDINATE_ORDERINGS[state.currentOrderingIndex];
        state.previewOrder = ordering.order;
        
        this.previewStates.set(pageNum, {
            order: ordering.order,
            originalOrder: stateManager.getPageCoordinateOrder(pageNum)
        });
        
        // Update UI to show preview
        const previewText = document.querySelector(`.coord-preview-text[data-page="${pageNum}"]`);
        if (previewText) previewText.textContent = ordering.name;
        
        const controls = document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`);
        if (controls) controls.classList.add('preview-active');
        
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper) wrapper.classList.add('preview-mode');
        
        // Apply temporarily for preview
        stateManager.setPageCoordinateOrder(pageNum, ordering.order);
        renderCallback();
    }
    
    cancelPreview(pageNum, stateManager, renderCallback) {
        const previewState = this.previewStates.get(pageNum);
        const state = this.pageStates.get(pageNum);
        
        if (!previewState || !state) return;
        
        // Restore original order
        if (previewState.originalOrder) {
            stateManager.setPageCoordinateOrder(pageNum, previewState.originalOrder);
        }
        
        state.previewOrder = null;
        this.previewStates.delete(pageNum);
        
        this._clearPreviewUI(pageNum);
        renderCallback();
    }
    
    handleApplyCoordOrder(btn, pageNum, stateManager, renderCallback) {
        const action = btn.dataset.action;
        const state = this.pageStates.get(pageNum);
        const previewState = this.previewStates.get(pageNum);
        
        if (!state || !state.previewOrder || !previewState) return;
        
        if (action === 'current') {
            this.applyPageCoordinateOrder(pageNum, state.previewOrder, stateManager, renderCallback, true);
            this._clearPreviewUI(pageNum);
        } else if (action === 'all') {
            if (confirm(`Apply "${state.previewOrder}" to ALL pages?`)) {
                this._applyToAllPages(state.previewOrder, stateManager);
                this.previewStates.clear();
                document.dispatchEvent(new CustomEvent('reloadAllPages'));
            }
        }
    }
    
    _applyToAllPages(order, stateManager) {
        stateManager.applyCoordinateOrderToAllPages(order);
        stateManager.setGlobalCoordinateOrder(order);
        
        const globalDisplay = document.getElementById('coord-display');
        if (globalDisplay) globalDisplay.textContent = order;
        
        this.pageStates.forEach((pageState, pNum) => {
            pageState.appliedOrder = order;
            pageState.isOverride = true;
            
            const display = document.querySelector(`.coord-display[data-page="${pNum}"]`);
            if (display) {
                display.textContent = order;
                display.classList.add('overridden');
            }
            
            this._clearPreviewUI(pNum);
        });
    }
    
    _clearPreviewUI(pageNum) {
        const controls = document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`);
        if (controls) controls.classList.remove('preview-active');
        
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper) wrapper.classList.remove('preview-mode');
        
        const state = this.pageStates.get(pageNum);
        if (state) state.previewOrder = null;
    }
    
    handleManualCoordButton(btn, pageNum, stateManager, renderCallback) {
        const letter = btn.dataset.coord;
        const state = this.pageStates.get(pageNum);
        
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
        const state = this.pageStates.get(pageNum);
        if (!state || order.length !== 4) return;
        
        try {
            if (!this.coordManager.validateCoordinateOrder(order)) {
                throw new Error('Invalid coordinate order');
            }
            
            const normalized = this.coordManager.normalizeCoordinateOrder(order);
            
            stateManager.setPageCoordinateOrder(pageNum, normalized);
            state.appliedOrder = normalized;
            state.isOverride = true;
            
            const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
            if (display) {
                display.textContent = normalized;
                display.classList.add('overridden');
            }
            
            if (!isFromPreview) renderCallback();
            
            this._resetManualButtons(pageNum, state);
            
        } catch (error) {
            alert(`Invalid: ${error.message}`);
            this._resetManualButtons(pageNum, state);
        }
    }
    
    _resetManualButtons(pageNum, state) {
        state.currentOrder = '';
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        wrapper?.querySelectorAll('.coord-btn').forEach(btn => btn.classList.remove('used'));
        
        const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
        if (display) display.textContent = state.appliedOrder;
    }
}