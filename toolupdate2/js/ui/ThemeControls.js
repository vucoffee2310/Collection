import { CONFIG } from '../config.js';
import { debounce } from '../utils.js';

export class ThemeControls {
    constructor(stateManager, fontCalc) {
        this.state = stateManager;
        this.fontCalc = fontCalc;
        
        this.el = {
            palette: document.getElementById('palette-container'),
            opacity: document.getElementById('opacity-slider'),
            opacityVal: document.getElementById('opacity-value'),
            brightness: document.getElementById('brightness-slider'),
            brightnessVal: document.getElementById('brightness-value'),
            spacingSlider: document.getElementById('spacing-slider'),
            spacingValue: document.getElementById('spacing-value'),
        };
        
        // Create debounced versions
        this.debouncedUpdateOpacity = debounce(() => this._updateOpacity(), 150);
        this.debouncedUpdateBrightness = debounce(() => this._updateBrightness(), 150);
        this.debouncedUpdateSpacing = debounce(() => this._updateSpacing(), 200);
    }
    
    initialize() {
        this._populatePaletteSwatches();
        this._setupEventListeners();
        
        // Set defaults
        this.state.setActivePalette(CONFIG.DEFAULT_PALETTE);
        this.syncOpacityWithPalette(CONFIG.DEFAULT_PALETTE);
        this.syncBrightnessWithPalette(CONFIG.DEFAULT_PALETTE);
        this.updateSpacing();
    }
    
    _setupEventListeners() {
        this.el.palette?.addEventListener('click', e => this.changePalette(e));
        
        this.el.opacity?.addEventListener('input', () => {
            this.updateOpacity();
            this.debouncedUpdateOpacity();
        });
        
        this.el.brightness?.addEventListener('input', () => {
            this.updateBrightness();
            this.debouncedUpdateBrightness();
        });
        
        this.el.spacingSlider?.addEventListener('input', () => {
            this.updateSpacing();
            this.debouncedUpdateSpacing();
        });
    }
    
    _populatePaletteSwatches() {
        if (!this.el.palette) return;
        
        this.el.palette.innerHTML = Object.entries(CONFIG.COLOR_PALETTES).map(([k, p]) => `
            <div class="palette-swatch ${k === CONFIG.DEFAULT_PALETTE ? 'active' : ''}" 
                 data-palette-key="${k}" 
                 title="${p.name}" 
                 style="background:rgb(${p.background}); color:rgb(${p.text});">
                <span>Aa</span>
            </div>
        `).join('');
    }
    
    changePalette(e) {
        const sw = e.target.closest('.palette-swatch');
        if (!sw) return;
        
        this.el.palette.querySelector('.active')?.classList.remove('active');
        sw.classList.add('active');
        this.state.setActivePalette(sw.dataset.paletteKey);
        
        this.syncOpacityWithPalette(sw.dataset.paletteKey);
        this.syncBrightnessWithPalette(sw.dataset.paletteKey);
    }
    
    syncOpacityWithPalette(paletteKey) {
        const palette = CONFIG.COLOR_PALETTES[paletteKey];
        if (!palette || !palette.opacity) return;
        
        const opacity = Math.max(1, Math.min(100, palette.opacity));
        
        if (this.el.opacity) {
            this.el.opacity.value = opacity;
            this.el.opacityVal.textContent = `${opacity}%`;
        }
        
        this._updateOpacity();
    }
    
    syncBrightnessWithPalette(paletteKey) {
        const palette = CONFIG.COLOR_PALETTES[paletteKey];
        if (!palette) return;
        
        const [r, g, b] = palette.text;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const sliderValue = Math.round(brightness * 100);
        
        if (this.el.brightness) {
            this.el.brightness.value = sliderValue;
            this.el.brightnessVal.textContent = `${sliderValue}%`;
        }
        
        this._updateBrightness();
    }
    
    // Public methods - update display immediately
    updateOpacity() {
        const v = parseInt(this.el.opacity.value, 10);
        this.el.opacityVal.textContent = `${v}%`;
    }
    
    updateBrightness() {
        const v = parseInt(this.el.brightness.value, 10);
        this.el.brightnessVal.textContent = `${v}%`;
    }
    
    updateSpacing() {
        const v = parseInt(this.el.spacingSlider.value, 10) / 100;
        this.el.spacingValue.textContent = `${v.toFixed(2)}em`;
    }
    
    // Private methods - apply actual changes
    _updateOpacity() {
        const v = parseInt(this.el.opacity.value, 10);
        const p = CONFIG.COLOR_PALETTES[this.state.activePalette];
        if (!p) return;
        
        const r = document.body.style;
        r.setProperty('--overlay-bg', `rgba(${p.background.join(',')}, ${v / 100})`);
        r.setProperty('--overlay-border', `rgb(${p.border.join(',')})`);
    }
    
    _updateBrightness() {
        const v = parseInt(this.el.brightness.value, 10);
        const val = Math.round(v * 2.55);
        document.body.style.setProperty('--overlay-text', `rgb(${val}, ${val}, ${val})`);
    }
    
    _updateSpacing() {
        const v = parseInt(this.el.spacingSlider.value, 10) / 100;
        document.body.style.setProperty('--paragraph-spacing', `${v}em`);
        this.fontCalc.clearCache();
        
        requestAnimationFrame(() => {
            const overlays = document.querySelectorAll('.overlay');
            overlays.forEach(o => this.fontCalc.calculateOptimalSize(o));
        });
    }
}