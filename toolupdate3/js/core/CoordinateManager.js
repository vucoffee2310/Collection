import { CONFIG } from '../config.js';

export class CoordinateManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.current = '';
    }
    
    initialize() {
        this.state.setGlobalCoordinateOrder(CONFIG.DEFAULT_COORDINATE_ORDER);
        this._updateDisplay(CONFIG.DEFAULT_COORDINATE_ORDER);
        
        document.querySelectorAll('#controls .coord-btn').forEach(btn =>
            btn.onclick = () => this._addCoord(btn.dataset.coord));
    }
    
    _addCoord(letter) {
        if (this.current.includes(letter)) return;
        
        this.current += letter;
        this._updateDisplay(this.current);
        
        const btn = Array.from(document.querySelectorAll('#controls .coord-btn'))
            .find(b => b.dataset.coord === letter);
        if (btn) btn.classList.add('used');
        
        if (this.current.length === 4) {
            setTimeout(() => this._apply(), 300);
        }
    }
    
    _updateDisplay(order) {
        const display = document.getElementById('coord-display');
        if (display) {
            display.textContent = order || '____';
            display.style.borderColor = order.length === 4 ? 'var(--blue)' : 'var(--gray-dark)';
        }
    }
    
    _clear() {
        this.current = '';
        this._updateDisplay('');
        document.querySelectorAll('#controls .coord-btn').forEach(b => b.classList.remove('used'));
    }
    
    async _apply() {
        const order = this.current.trim();
        if (order.length !== 4) return;
        
        try {
            if (!this.validateCoordinateOrder(order)) {
                throw new Error('Invalid coordinate order');
            }
            
            const normalized = order.toUpperCase();
            this.state.setGlobalCoordinateOrder(normalized);
            document.dispatchEvent(new CustomEvent('coordinateOrderChanged'));
            
            this._clear();
            this._updateDisplay(normalized);
        } catch (e) {
            alert(`Invalid coordinate order: ${e.message}`);
            this._clear();
        }
    }
    
    validateCoordinateOrder(order) {
        if (order.length !== 4) return false;
        const chars = order.toUpperCase().split('');
        return ['T', 'L', 'B', 'R'].every(req => chars.includes(req)) && 
               new Set(chars).size === 4;
    }
    
    normalizeCoordinateOrder(order) {
        return order.toUpperCase().trim();
    }
}