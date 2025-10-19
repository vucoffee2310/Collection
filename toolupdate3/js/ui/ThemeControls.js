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
            spacing: document.getElementById('spacing-slider'),
            spacingVal: document.getElementById('spacing-value'),
        };

        // Debounced handlers
        this.updateOpacity = debounce(() => this._applyOpacity(), 150);
        this.updateBrightness = debounce(() => this._applyBrightness(), 150);
        this.updateSpacing = debounce(() => this._applySpacing(), 200);
    }

    initialize() {
        this._populatePalettes();
        
        this.el.palette.onclick = (e) => this._changePalette(e);
        this.el.opacity.oninput = () => {
            this.el.opacityVal.textContent = `${this.el.opacity.value}%`;
            this.updateOpacity();
        };
        this.el.brightness.oninput = () => {
            this.el.brightnessVal.textContent = `${this.el.brightness.value}%`;
            this.updateBrightness();
        };
        this.el.spacing.oninput = () => {
            const v = parseInt(this.el.spacing.value) / 100;
            this.el.spacingVal.textContent = `${v.toFixed(2)}em`;
            this.updateSpacing();
        };

        this.state.setActivePalette(CONFIG.DEFAULT_PALETTE);
        this._syncPalette(CONFIG.DEFAULT_PALETTE);
    }

    _populatePalettes() {
        this.el.palette.innerHTML = Object.entries(CONFIG.COLOR_PALETTES).map(([k, p]) => `
            <div class="palette-swatch ${k === CONFIG.DEFAULT_PALETTE ? 'active' : ''}" 
                 data-palette-key="${k}" title="${p.name}" 
                 style="background:rgb(${p.background});color:rgb(${p.text});">
                <span>Aa</span>
            </div>
        `).join('');
    }

    _changePalette(e) {
        const sw = e.target.closest('.palette-swatch');
        if (!sw) return;
        
        this.el.palette.querySelector('.active')?.classList.remove('active');
        sw.classList.add('active');
        this.state.setActivePalette(sw.dataset.paletteKey);
        this._syncPalette(sw.dataset.paletteKey);
    }

    _syncPalette(key) {
        const p = CONFIG.COLOR_PALETTES[key];
        if (!p) return;

        // Sync opacity
        if (p.opacity) {
            this.el.opacity.value = Math.max(1, Math.min(100, p.opacity));
            this.el.opacityVal.textContent = `${this.el.opacity.value}%`;
            this._applyOpacity();
        }

        // Sync brightness
        const [r, g, b] = p.text;
        const brightness = Math.round((r * 0.299 + g * 0.587 + b * 0.114) / 2.55);
        this.el.brightness.value = brightness;
        this.el.brightnessVal.textContent = `${brightness}%`;
        this._applyBrightness();
    }

    _applyOpacity() {
        const v = parseInt(this.el.opacity.value);
        const p = CONFIG.COLOR_PALETTES[this.state.activePalette];
        if (!p) return;
        
        const r = document.body.style;
        r.setProperty('--overlay-bg', `rgba(${p.background.join(',')}, ${v / 100})`);
        r.setProperty('--overlay-border', `rgb(${p.border.join(',')})`);
    }

    _applyBrightness() {
        const v = Math.round(parseInt(this.el.brightness.value) * 2.55);
        document.body.style.setProperty('--overlay-text', `rgb(${v}, ${v}, ${v})`);
    }

    _applySpacing() {
        const v = parseInt(this.el.spacing.value) / 100;
        document.body.style.setProperty('--paragraph-spacing', `${v}em`);
        this.fontCalc.clearCache();
        
        requestAnimationFrame(() => {
            document.querySelectorAll('.overlay').forEach(o => this.fontCalc.calculateOptimalSize(o));
        });
    }
}