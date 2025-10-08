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
import { readFile } from '../utils.js';

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
        
        this.el.fileInput?.addEventListener('change', e => this.loadPDF(e));
        this.el.jsonInput?.addEventListener('change', e => this.loadJSON(e));
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
        this.el.opacity?.addEventListener('input', () => this.updateOpacity());
        this.el.brightness?.addEventListener('input', () => this.updateBrightness());
        this.el.spacingSlider?.addEventListener('input', () => this.updateSpacing());
        
        this.ui.populatePaletteSwatches(this.el.palette, CONFIG.DEFAULT_PALETTE);
        this.state.setActivePalette(CONFIG.DEFAULT_PALETTE);
        this.updateOpacity();
        this.updateBrightness();
        this.updateSpacing();
        this.processAndLoad(defJson);
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
        this.updateOpacity();
        this.updateBrightness();
    }

    updateOpacity() {
        const v = parseInt(this.el.opacity.value, 10);
        this.el.opacityVal.textContent = `${v}%`;
        this.ui.updateOverlayOpacity(this.state.activePalette, v);
    }
    
    updateBrightness() {
        this.el.brightnessVal.textContent = `${this.el.brightness.value}%`;
        this.ui.updateTextBrightness(parseInt(this.el.brightness.value, 10));
    }
    
    updateSpacing() {
        const v = parseInt(this.el.spacingSlider.value, 10) / 100;
        this.el.spacingValue.textContent = `${v.toFixed(2)}em`;
        document.body.style.setProperty('--paragraph-spacing', `${v}em`);
        this.fontCalc.clearCache();
        requestAnimationFrame(() => {
            document.querySelectorAll('.overlay').forEach(o => this.fontCalc.calculateOptimalSize(o));
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

        const data = this.merger.mergeAllPages(this.state.overlayData);
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
                this.renderer.renderPageOverlays(w, n, { width: w.clientWidth, height: w.clientHeight }, data);
            });
        });
        
        this.pdf.startObserving();
    }
}