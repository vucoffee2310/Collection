import { CONFIG } from '../config.js';

export class CoordinateManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.currentGlobalCoordOrder = '';
        this.el = {
            coordDisplay: document.getElementById('coord-display'),
            coordButtons: document.querySelectorAll('#controls .coord-btn')
        };
    }
    
    initialize() {
        this.state.setGlobalCoordinateOrder(CONFIG.DEFAULT_COORDINATE_ORDER);
        this.updateGlobalCoordDisplay(CONFIG.DEFAULT_COORDINATE_ORDER);
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        this.el.coordButtons?.forEach(btn => {
            btn.addEventListener('click', () => this.addGlobalCoordinate(btn.dataset.coord));
        });
    }
    
    addGlobalCoordinate(letter) {
        if (this.currentGlobalCoordOrder.includes(letter)) {
            return;
        }
        
        this.currentGlobalCoordOrder += letter;
        this.updateGlobalCoordDisplay(this.currentGlobalCoordOrder);
        
        const btn = Array.from(this.el.coordButtons).find(b => b.dataset.coord === letter);
        if (btn) btn.classList.add('used');
        
        if (this.currentGlobalCoordOrder.length === 4) {
            setTimeout(() => this.applyGlobalCoordinateOrder(), 300);
        }
    }
    
    clearGlobalCoordinateOrder() {
        this.currentGlobalCoordOrder = '';
        this.updateGlobalCoordDisplay('');
        this.el.coordButtons?.forEach(btn => btn.classList.remove('used'));
    }
    
    updateGlobalCoordDisplay(order) {
        if (this.el.coordDisplay) {
            this.el.coordDisplay.textContent = order || '____';
            this.el.coordDisplay.style.borderColor = order.length === 4 ? 'var(--blue)' : 'var(--gray-dark)';
        }
    }
    
    async applyGlobalCoordinateOrder() {
        const order = this.currentGlobalCoordOrder.trim();
        if (order.length !== 4) {
            return;
        }
        
        try {
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
            
            this.state.setGlobalCoordinateOrder(normalized);
            
            // Trigger re-render
            document.dispatchEvent(new CustomEvent('coordinateOrderChanged'));
            
            this.clearGlobalCoordinateOrder();
            this.updateGlobalCoordDisplay(normalized);
            
        } catch (error) {
            alert(`Invalid coordinate order: ${error.message}`);
            this.clearGlobalCoordinateOrder();
        }
    }
    
    // Methods for page-specific coordinate handling
    validateCoordinateOrder(order) {
        if (order.length !== 4) return false;
        
        const normalized = order.toUpperCase().trim();
        const chars = normalized.split('');
        const required = ['T', 'L', 'B', 'R'];
        
        for (const req of required) {
            if (!chars.includes(req)) return false;
        }
        
        return new Set(chars).size === 4;
    }
    
    normalizeCoordinateOrder(order) {
        return order.toUpperCase().trim();
    }
}