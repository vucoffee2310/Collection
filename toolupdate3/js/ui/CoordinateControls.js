import { CONFIG } from '../config.js';

export class CoordinateControls {
  constructor(coordManager) {
    this.coordManager = coordManager;
    this.pageStates = new Map(); // Merged pageStates and previewStates
  }
  
  addPageControls(wrapper, pageNum, stateManager, renderCallback) {
    const state = {
      currentOrder: '',
      appliedOrder: stateManager.getPageCoordinateOrder(pageNum),
      isOverride: stateManager.pageOverrides.has(pageNum),
      orderingIndex: 0,
      previewOrder: null,
      originalOrder: null
    };
    
    this.pageStates.set(pageNum, state);
    
    const controls = document.createElement('div');
    controls.className = 'page-coord-controls';
    controls.innerHTML = this._template(pageNum, state);
    
    this._attachEvents(controls, pageNum, stateManager, renderCallback);
    wrapper.appendChild(controls);
  }
  
  _template(pageNum, state) {
    const displayClass = state.isOverride ? 'coord-display overridden' : 'coord-display';
    
    return `
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
          ${['T', 'L', 'B', 'R'].map(c => 
            `<button class="coord-btn" data-coord="${c}" data-page="${pageNum}">${c}</button>`
          ).join('')}
        </div>
      </div>
    `;
  }
  
  _attachEvents(controls, pageNum, stateManager, renderCallback) {
    // Event delegation for all buttons
    controls.addEventListener('click', e => {
      const target = e.target;
      
      // Manual coordinate buttons
      if (target.classList.contains('coord-btn')) {
        this._handleManual(target.dataset.coord, pageNum, stateManager, renderCallback);
      }
      // Reload (cycle through presets)
      else if (target.classList.contains('coord-reload-btn')) {
        this._handleReload(pageNum, stateManager, renderCallback);
      }
      // Cancel preview
      else if (target.classList.contains('coord-cancel-btn')) {
        this._cancelPreview(pageNum, stateManager, renderCallback);
      }
      // Apply actions
      else if (target.classList.contains('coord-action-btn')) {
        this._handleApply(target.dataset.action, pageNum, stateManager, renderCallback);
      }
    });
  }
  
  _handleReload(pageNum, stateManager, renderCallback) {
    const state = this.pageStates.get(pageNum);
    if (!state) return;
    
    state.orderingIndex = (state.orderingIndex + 1) % CONFIG.COORDINATE_ORDERINGS.length;
    const ordering = CONFIG.COORDINATE_ORDERINGS[state.orderingIndex];
    
    state.previewOrder = ordering.order;
    state.originalOrder = stateManager.getPageCoordinateOrder(pageNum);
    
    const previewText = document.querySelector(`.coord-preview-text[data-page="${pageNum}"]`);
    if (previewText) previewText.textContent = ordering.name;
    
    document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`)?.classList.add('preview-active');
    document.querySelector(`#page-wrapper-${pageNum}`)?.classList.add('preview-mode');
    
    stateManager.setPageCoordinateOrder(pageNum, ordering.order);
    renderCallback();
  }
  
  _cancelPreview(pageNum, stateManager, renderCallback) {
    const state = this.pageStates.get(pageNum);
    if (!state || !state.previewOrder) return;
    
    if (state.originalOrder) {
      stateManager.setPageCoordinateOrder(pageNum, state.originalOrder);
    }
    
    state.previewOrder = null;
    state.originalOrder = null;
    
    this._clearPreviewUI(pageNum);
    renderCallback();
  }
  
  _handleApply(action, pageNum, stateManager, renderCallback) {
    const state = this.pageStates.get(pageNum);
    if (!state || !state.previewOrder) return;
    
    if (action === 'current') {
      this._applyOrder(pageNum, state.previewOrder, stateManager, renderCallback, true);
      this._clearPreviewUI(pageNum);
    } else if (action === 'all') {
      if (confirm(`Apply "${state.previewOrder}" to ALL pages?`)) {
        stateManager.applyCoordinateOrderToAllPages(state.previewOrder);
        stateManager.setGlobalCoordinateOrder(state.previewOrder);
        
        document.getElementById('coord-display').textContent = state.previewOrder;
        
        this.pageStates.forEach((pState, pNum) => {
          pState.appliedOrder = state.previewOrder;
          pState.isOverride = true;
          
          const display = document.querySelector(`.coord-display[data-page="${pNum}"]`);
          if (display) {
            display.textContent = state.previewOrder;
            display.classList.add('overridden');
          }
          
          this._clearPreviewUI(pNum);
        });
        
        document.dispatchEvent(new CustomEvent('reloadAllPages'));
      }
    }
  }
  
  _handleManual(letter, pageNum, stateManager, renderCallback) {
    const state = this.pageStates.get(pageNum);
    if (!state || state.currentOrder.includes(letter)) return;
    
    state.currentOrder += letter;
    
    const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
    if (display) display.textContent = state.currentOrder || '____';
    
    const btn = document.querySelector(`.coord-btn[data-coord="${letter}"][data-page="${pageNum}"]`);
    if (btn) btn.classList.add('used');
    
    if (state.currentOrder.length === 4) {
      setTimeout(() => this._applyOrder(pageNum, state.currentOrder, stateManager, renderCallback, false), 300);
    }
  }
  
  _applyOrder(pageNum, order, stateManager, renderCallback, isFromPreview) {
    const state = this.pageStates.get(pageNum);
    if (!state || order.length !== 4) return;
    
    if (!this.coordManager.validateCoordinateOrder(order)) {
      alert('Invalid coordinate order');
      this._resetManual(pageNum, state);
      return;
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
    this._resetManual(pageNum, state);
  }
  
  _resetManual(pageNum, state) {
    state.currentOrder = '';
    document.querySelectorAll(`.coord-btn[data-page="${pageNum}"]`)
      .forEach(btn => btn.classList.remove('used'));
  }
  
  _clearPreviewUI(pageNum) {
    document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`)?.classList.remove('preview-active');
    document.querySelector(`#page-wrapper-${pageNum}`)?.classList.remove('preview-mode');
    
    const state = this.pageStates.get(pageNum);
    if (state) {
      state.previewOrder = null;
      state.originalOrder = null;
    }
  }
}