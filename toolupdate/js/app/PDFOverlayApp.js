import { StateManager } from '../core/StateManager.js';
import { OverlayMerger } from '../core/OverlayMerger.js';
import { PDFHandler } from '../core/PDFHandler.js';
import { FontSizeCalculator } from '../services/FontSizeCalculator.js';
import { HTMLExporter } from '../services/HTMLExporter.js';
import { PrintExporter } from '../services/PrintExporter.js';
import { PDFExporter } from '../services/PDFExporter.js';
import { OverlayRenderer } from '../ui/OverlayRenderer.js';
import { UIManager } from '../ui/UIManager.js';
import { CONFIG } from '../config.js';
import { readFile, debounce, throttle } from '../utils.js';

export class PDFOverlayApp {
    constructor(defJson) {
        this.defJson = defJson;
        this.pdfName = 'document';
        this.lastPdf = null;

        this.state = new StateManager();
        this.ui = new UIManager();
        this.merger = new OverlayMerger();
        this.fontCalc = new FontSizeCalculator();
        this.pdf = new PDFHandler();
        this.renderer = new OverlayRenderer(this.state, this.fontCalc);
        this.htmlExp = new HTMLExporter(this.pdf);
        this.printExp = new PrintExporter();
        this.pdfExp = new PDFExporter(this.pdf);

        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;
        
        this.el = {
            fileInput: document.getElementById('file-input'),
            jsonInput: document.getElementById('json-input'),
            coordDisplay: document.getElementById('coord-display'),
            coordButtons: document.querySelectorAll('#controls .coord-btn'),
            savePrintBtn: document.getElementById('save-print-btn'),
            saveDirectPdfBtn: document.getElementById('save-direct-pdf-btn'),
            saveHtmlBtn: document.getElementById('save-html-btn'),
            palette: document.getElementById('palette-container'),
            pdfFileName: document.getElementById('pdf-file-name'),
            jsonFileName: document.getElementById('json-file-name'),
            expandAmount: document.getElementById('expand-amount'),
            expandBtn: document.getElementById('expand-all-btn'),
            opacity: document.getElementById('opacity-slider'),
            opacityVal: document.getElementById('opacity-value'),
            brightness: document.getElementById('brightness-slider'),
            brightnessVal: document.getElementById('brightness-value'),
            spacingSlider: document.getElementById('spacing-slider'),
            spacingValue: document.getElementById('spacing-value'),
        };
        
        this.currentGlobalCoordOrder = '';
        
        // Create debounced/throttled versions of frequent operations
        this.debouncedUpdateOpacity = debounce(() => this._updateOpacity(), 150);
        this.debouncedUpdateBrightness = debounce(() => this._updateBrightness(), 150);
        this.debouncedUpdateSpacing = debounce(() => this._updateSpacing(), 200);
        
        this.el.fileInput?.addEventListener('change', e => this.loadPDF(e));
        this.el.jsonInput?.addEventListener('change', e => this.loadJSON(e));
        this.el.coordButtons?.forEach(btn => {
            btn.addEventListener('click', () => this.addGlobalCoordinate(btn.dataset.coord));
        });
        this.el.savePrintBtn?.addEventListener('click', () => this._check(() => this.printExp.save(this.pdf, this.ui)));
        this.el.saveDirectPdfBtn?.addEventListener('click', () => this._check(async () => {
            await this.pdf.renderAllQueuedPages();
            await this.pdfExp.save(this.pdfName, this.ui);
        }));
        this.el.saveHtmlBtn?.addEventListener('click', () => this._check(async () => {
            await this.pdf.renderAllQueuedPages();
            await this.htmlExp.save(this.pdfName, this.ui);
        }));
        this.el.palette?.addEventListener('click', e => this.changePalette(e));
        this.el.expandBtn?.addEventListener('click', () => this.expandAll());
        
        // Slider listeners - Allow manual override after palette selection
        this.el.opacity?.addEventListener('input', () => {
            this.updateOpacity(); // Update display immediately
            this.debouncedUpdateOpacity(); // Apply changes with debounce
        });
        this.el.brightness?.addEventListener('input', () => {
            this.updateBrightness(); // Update display immediately
            this.debouncedUpdateBrightness(); // Apply changes with debounce
        });
        this.el.spacingSlider?.addEventListener('input', () => {
            this.updateSpacing(); // Update display immediately
            this.debouncedUpdateSpacing(); // Apply changes with debounce
        });
        
        // Listen for reload all pages event
        document.addEventListener('reloadAllPages', async () => {
            await this.render();
        });
        
        this.ui.populatePaletteSwatches(this.el.palette, CONFIG.DEFAULT_PALETTE);
        this.state.setActivePalette(CONFIG.DEFAULT_PALETTE);
        
        // Set default global coordinate order
        this.state.setGlobalCoordinateOrder(CONFIG.DEFAULT_COORDINATE_ORDER);
        this.updateGlobalCoordDisplay(CONFIG.DEFAULT_COORDINATE_ORDER);
        
        // Sync initial sliders with default palette
        this.syncOpacityWithPalette(CONFIG.DEFAULT_PALETTE);
        this.syncBrightnessWithPalette(CONFIG.DEFAULT_PALETTE);
        this.updateSpacing();
        this.processAndLoad(defJson);
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
            
            if (this.lastPdf) {
                await this.render();
            }
            
            this.clearGlobalCoordinateOrder();
            this.updateGlobalCoordDisplay(normalized);
            
        } catch (error) {
            alert(`Invalid coordinate order: ${error.message}`);
            this.clearGlobalCoordinateOrder();
        }
    }
    
    async loadPDF(e) {
        const f = e.target.files?.[0];
        if (!f || f.type !== 'application/pdf') return;

        this.ui.updateFileName(this.el.pdfFileName, f.name, 'No file selected');
        this.lastPdf = await readFile(f, 'readAsArrayBuffer');
        this.pdfName = f.name.replace(/\.pdf$/i, '');
        this.el.jsonInput.value = '';
        this.ui.updateFileName(this.el.jsonFileName, null, 'Using default');
        await this.processAndLoad(this.defJson);
    }
    
    async loadJSON(e) {
        const f = e.target.files?.[0];
        if (!f || !f.name.endsWith('.json')) return;

        this.ui.updateFileName(this.el.jsonFileName, f.name, 'Using default');
        try {
            await this.processAndLoad(JSON.parse(await readFile(f, 'readAsText')));
        } catch (e) {
            alert('Error parsing JSON: ' + e.message);
            this.ui.updateFileName(this.el.jsonFileName, 'Load failed. Using default.', 'Using default');
            await this.processAndLoad(this.defJson);
        }
    }

    _check(fn) {
        return this.pdf.isLoaded() ? fn() : alert('Please load a PDF file first.');
    }

    async expandAll() {
        const amt = parseInt(this.el.expandAmount.value, 10);
        if (isNaN(amt)) return alert('Please enter a valid number.');
        this.state.expandAllOverlays(amt);
        await this.render();
    }

    changePalette(e) {
        const sw = e.target.closest('.palette-swatch');
        if (!sw) return;
        this.el.palette.querySelector('.active')?.classList.remove('active');
        sw.classList.add('active');
        this.state.setActivePalette(sw.dataset.paletteKey);
        
        // Auto-sync both sliders with palette defaults
        // User can manually adjust afterwards if not satisfied
        this.syncOpacityWithPalette(sw.dataset.paletteKey);
        this.syncBrightnessWithPalette(sw.dataset.paletteKey);
    }
    
    syncOpacityWithPalette(paletteKey) {
        const palette = CONFIG.COLOR_PALETTES[paletteKey];
        if (!palette || !palette.opacity) return;
        
        // Use palette's recommended opacity (1-100 range, no constraints)
        const opacity = Math.max(1, Math.min(100, palette.opacity));
        
        // Update slider (user can still manually adjust after this)
        if (this.el.opacity) {
            this.el.opacity.value = opacity;
            this.el.opacityVal.textContent = `${opacity}%`;
        }
        
        // Apply the opacity
        this._updateOpacity();
    }
    
    syncBrightnessWithPalette(paletteKey) {
        const palette = CONFIG.COLOR_PALETTES[paletteKey];
        if (!palette) return;
        
        // Calculate brightness from RGB (using perceived luminance formula)
        const [r, g, b] = palette.text;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        
        // Convert to slider value (0-100)
        const sliderValue = Math.round(brightness * 100);
        
        // Update slider (user can still manually adjust after this)
        if (this.el.brightness) {
            this.el.brightness.value = sliderValue;
            this.el.brightnessVal.textContent = `${sliderValue}%`;
        }
        
        // Apply the brightness
        this._updateBrightness();
    }

    // Public methods that immediately update display values
    // These update the display and trigger debounced updates
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
    
    // Private debounced methods for actual updates
    // These apply the actual CSS changes
    _updateOpacity() {
        const v = parseInt(this.el.opacity.value, 10);
        this.ui.updateOverlayOpacity(this.state.activePalette, v);
    }
    
    _updateBrightness() {
        const v = parseInt(this.el.brightness.value, 10);
        this.ui.updateTextBrightness(v);
    }
    
    _updateSpacing() {
        const v = parseInt(this.el.spacingSlider.value, 10) / 100;
        document.body.style.setProperty('--paragraph-spacing', `${v}em`);
        this.fontCalc.clearCache();
        
        // Batch DOM updates for better performance
        requestAnimationFrame(() => {
            const overlays = document.querySelectorAll('.overlay');
            overlays.forEach(o => this.fontCalc.calculateOptimalSize(o));
        });
    }

    async processAndLoad(json) {
        this.state.initialize(json);
        if (this.lastPdf) {
            this.ui.showLoading('Loading PDF...');
            try {
                await this.pdf.loadPDF(this.lastPdf);
                this.ui.updatePageInfo(`Total pages: ${this.pdf.pdfDoc.numPages}`);
                await this.render();
            } catch (e) {
                this.ui.showLoading('Failed to load PDF.');
            }
        }
    }
    
    async render() {
        if (!this.pdf.isLoaded()) return;

        const data = this.merger.mergeAllPages(this.state.overlayData, this.state);
        this.ui.clearContainer();
        this.pdf.resetRenderQueue();
        
        const pages = await Promise.all(
            Array.from({ length: this.pdf.getNumPages() }, (_, i) => this.pdf.getPage(i + 1))
        );
        
        pages.forEach((pg, i) => {
            const n = i + 1;
            const vp = pg.getViewport({ scale: CONFIG.PDF.SCALE });
            const w = this.ui.createPageWrapper(n, vp);
            
            this.pdf.queuePageForRender(w, async () => {
                await this.pdf.renderPageToCanvas(w, n, CONFIG.PDF.SCALE);
                this.ui.addPageCoordControls(w, n, this.state, () => this.renderSinglePage(w, n, data));
                this.renderer.renderPageOverlays(w, n, { width: w.clientWidth, height: w.clientHeight }, data);
            });
        });
        
        this.pdf.startObserving();
    }
    
    renderSinglePage(wrapper, pageNum, data) {
        this.renderer.renderPageOverlays(wrapper, pageNum, { width: wrapper.clientWidth, height: wrapper.clientHeight }, data);
    }
}