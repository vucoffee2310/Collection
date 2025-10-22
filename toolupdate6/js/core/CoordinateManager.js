import { CONFIG } from '../config.js';

export class CoordinateManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.currentOrder = '';
    this.el = {
      display: document.getElementById('coord-display'),
      buttons: document.querySelectorAll('#controls .coord-btn')
    };
  }
  
  initialize() {
    this.state.setGlobalCoordinateOrder(CONFIG.DEFAULT_COORDINATE_ORDER);
    this._updateDisplay(CONFIG.DEFAULT_COORDINATE_ORDER);
    this.el.buttons?.forEach(btn => 
      btn.addEventListener('click', () => this._addCoordinate(btn.dataset.coord))
    );
  }
  
  _addCoordinate(letter) {
    if (this.currentOrder.includes(letter) || this.currentOrder.length >= 4) return;
    
    this.currentOrder += letter;
    this._updateDisplay(this.currentOrder);
    
    this.el.buttons.forEach(b => {
      if (b.dataset.coord === letter) b.classList.add('used');
    });
    
    if (this.currentOrder.length === 4) {
      setTimeout(() => this._applyOrder(), 300);
    }
  }
  
  _updateDisplay(order) {
    if (!this.el.display) return;
    this.el.display.textContent = order || '____';
    this.el.display.style.borderColor = order.length === 4 ? 'var(--blue)' : 'var(--gray-dark)';
  }
  
  async _applyOrder() {
    const order = this.currentOrder.toUpperCase();
    const chars = new Set(order.split(''));
    const required = new Set(['T', 'L', 'B', 'R']);
    
    if (chars.size !== 4 || ![...required].every(c => chars.has(c))) {
      alert('Invalid coordinate order: must contain T, L, B, R exactly once');
      this._reset();
      return;
    }
    
    try {
      this.state.setGlobalCoordinateOrder(order);
      document.dispatchEvent(new CustomEvent('coordinateOrderChanged'));
      this._reset();
      this._updateDisplay(order);
    } catch (error) {
      alert(`Invalid coordinate order: ${error.message}`);
      this._reset();
    }
  }
  
  _reset() {
    this.currentOrder = '';
    this.el.buttons?.forEach(btn => btn.classList.remove('used'));
  }
  
  validateCoordinateOrder(order) {
    if (order.length !== 4) return false;
    const chars = new Set(order.toUpperCase().split(''));
    return chars.size === 4 && ['T', 'L', 'B', 'R'].every(c => chars.has(c));
  }
  
  normalizeCoordinateOrder(order) {
    return order.toUpperCase().trim();
  }
}