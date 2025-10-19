import { CONFIG } from '../config.js';
import { debounce } from '../utils.js';

export class ThemeControls {
  constructor(stateManager, fontCalc) {
    this.state = stateManager;
    this.fontCalc = fontCalc;
  }
  
  initialize() {
    this._populatePalettes();
    this._setupListeners();
    
    // Set defaults
    this.state.activePalette = CONFIG.DEFAULT_PALETTE;
    this._applyPalette(CONFIG.DEFAULT_PALETTE);
    this._updateSpacing();
  }
  
  _populatePalettes() {
    const container = document.getElementById('palette-container');
    if (!container) return;
    
    container.innerHTML = Object.entries(CONFIG.COLOR_PALETTES).map(([key, [bg, text]]) => {
      const isActive = key === CONFIG.DEFAULT_PALETTE;
      return `<div class="palette-swatch${isActive ? ' active' : ''}" 
                   data-palette="${key}" 
                   title="${key}" 
                   style="background:rgb(${bg});color:rgb(${text})">
                <span>Aa</span>
              </div>`;
    }).join('');
  }
  
  _setupListeners() {
    // Event delegation for palette
    document.getElementById('palette-container')?.addEventListener('click', e => {
      const swatch = e.target.closest('.palette-swatch');
      if (!swatch) return;
      
      document.querySelector('.palette-swatch.active')?.classList.remove('active');
      swatch.classList.add('active');
      
      this.state.activePalette = swatch.dataset.palette;
      this._applyPalette(swatch.dataset.palette);
    });
    
    // Debounced slider handlers
    const sliders = {
      'opacity-slider': debounce(() => this._applyOpacity(), 150),
      'brightness-slider': debounce(() => this._applyBrightness(), 150),
      'spacing-slider': debounce(() => this._updateSpacing(), 200)
    };
    
    Object.entries(sliders).forEach(([id, handler]) => {
      const slider = document.getElementById(id);
      slider?.addEventListener('input', e => {
        // Update display immediately
        const valueId = id.replace('-slider', '-value');
        const valueEl = document.getElementById(valueId);
        
        if (id === 'spacing-slider') {
          const val = (parseInt(e.target.value) / 100).toFixed(2);
          valueEl.textContent = `${val}em`;
        } else {
          valueEl.textContent = `${e.target.value}%`;
        }
        
        // Apply change with debounce
        handler();
      });
    });
  }
  
  _applyPalette(key) {
    const [bg, text, border, opacity] = CONFIG.COLOR_PALETTES[key];
    const r = document.body.style;
    
    // Set opacity slider
    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) {
      opacitySlider.value = opacity;
      document.getElementById('opacity-value').textContent = `${opacity}%`;
    }
    
    // Set brightness slider
    const brightness = (text[0] * 0.299 + text[1] * 0.587 + text[2] * 0.114) / 255;
    const brightnessSlider = document.getElementById('brightness-slider');
    if (brightnessSlider) {
      const val = Math.round(brightness * 100);
      brightnessSlider.value = val;
      document.getElementById('brightness-value').textContent = `${val}%`;
    }
    
    this._applyOpacity();
    this._applyBrightness();
  }
  
  _applyOpacity() {
    const val = parseInt(document.getElementById('opacity-slider')?.value || 97);
    const palette = CONFIG.COLOR_PALETTES[this.state.activePalette];
    if (!palette) return;
    
    const [bg, , border] = palette;
    const r = document.body.style;
    r.setProperty('--overlay-bg', `rgba(${bg[0]},${bg[1]},${bg[2]},${val / 100})`);
    r.setProperty('--overlay-border', `rgb(${border[0]},${border[1]},${border[2]})`);
  }
  
  _applyBrightness() {
    const val = parseInt(document.getElementById('brightness-slider')?.value || 50);
    const adjusted = Math.round(val * 2.55);
    document.body.style.setProperty('--overlay-text', `rgb(${adjusted},${adjusted},${adjusted})`);
  }
  
  _updateSpacing() {
    const val = parseInt(document.getElementById('spacing-slider')?.value || 30) / 100;
    document.body.style.setProperty('--paragraph-spacing', `${val}em`);
    
    this.fontCalc.clearCache();
    requestAnimationFrame(() => {
      document.querySelectorAll('.overlay').forEach(o => this.fontCalc.calculateOptimalSize(o));
    });
  }
}