import { StateManager } from '../core/StateManager.js';
import { OverlayMerger } from '../core/OverlayMerger.js';
import { PDFHandler } from '../core/PDFHandler.js';
import { CoordinateManager } from '../core/CoordinateManager.js';
import { FontSizeCalculator } from '../services/FontSizeCalculator.js';
import { Exporters } from '../services/Exporters.js';
import { PDFExporter } from '../services/PDFExporter.js';
import { OverlayRenderer } from '../ui/OverlayRenderer.js';
import { PageManager } from '../ui/PageManager.js';
import { ThemeControls } from '../ui/ThemeControls.js';
import { CoordinateControls } from '../ui/CoordinateControls.js';
import { CONFIG } from '../config.js';
import { readFile } from '../utils.js';

export class PDFOverlayApp {
    constructor(defJson) {
        this.defJson = defJson;
        this.pdfName = 'document';
        this.lastPdf = null;

        // Core services
        this.state = new StateManager();
        this.pdf = new PDFHandler();
        this.merger = new OverlayMerger();
        this.fontCalc = new FontSizeCalculator();
        
        // UI managers
        this.pageManager = new PageManager();
        this.themeControls = new ThemeControls(this.state, this.fontCalc);
        this.coordManager = new CoordinateManager(this.state);
        this.coordControls = new CoordinateControls(this.coordManager);
        
        // Services
        this.renderer = new OverlayRenderer(this.state, this.fontCalc);
        this.exporters = new Exporters(this.pdf);
        this.pdfExp = new PDFExporter(this.pdf);

        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;
        
        this._setupElements();
        this._setupEventListeners();
        this._initialize();
    }
    
    _setupElements() {
        this.el = {
            fileInput: document.getElementById('file-input'),
            jsonInput: document.getElementById('json-input'),
            savePrintBtn: document.getElementById('save-print-btn'),
            saveDirectPdfBtn: document.getElementById('save-direct-pdf-btn'),
            saveHtmlBtn: document.getElementById('save-html-btn'),
            pdfFileName: document.getElementById('pdf-file-name'),
            jsonFileName: document.getElementById('json-file-name'),
            expandAmount: document.getElementById('expand-amount'),
            expandBtn: document.getElementById('expand-all-btn'),
        };
    }
    
    _setupEventListeners() {
        this.el.fileInput?.addEventListener('change', e => this.loadPDF(e));
        this.el.jsonInput?.addEventListener('change', e => this.loadJSON(e));
        this.el.expandBtn?.addEventListener('click', () => this.expandAll());
        
        this.el.savePrintBtn?.addEventListener('click', () => 
            this._check(() => this.exporters.print(this.pageManager)));
        
        this.el.saveDirectPdfBtn?.addEventListener('click', () => 
            this._check(async () => {
                await this.pdf.renderAllQueuedPages();
                await this.pdfExp.save(this.pdfName, this.pageManager);
            }));
        
        this.el.saveHtmlBtn?.addEventListener('click', () => 
            this._check(async () => {
                await this.pdf.renderAllQueuedPages();
                await this.exporters.html(this.pdfName, this.pageManager);
            }));
        
        // Listen for coordinate changes that require re-render
        document.addEventListener('coordinateOrderChanged', async () => {
            await this.render();
        });
        
        document.addEventListener('reloadAllPages', async () => {
            await this.render();
        });
    }
    
    _initialize() {
        this.themeControls.initialize();
        this.coordManager.initialize();
        this.processAndLoad(this.defJson);
    }
    
    async loadPDF(e) {
        const f = e.target.files?.[0];
        if (!f || f.type !== 'application/pdf') return;

        this.pageManager.updateFileName(this.el.pdfFileName, f.name, 'No file selected');
        this.lastPdf = await readFile(f, 'readAsArrayBuffer');
        this.pdfName = f.name.replace(/\.pdf$/i, '');
        this.el.jsonInput.value = '';
        this.pageManager.updateFileName(this.el.jsonFileName, null, 'Using default');
        await this.processAndLoad(this.defJson);
    }
    
    async loadJSON(e) {
        const f = e.target.files?.[0];
        if (!f || !f.name.endsWith('.json')) return;

        this.pageManager.updateFileName(this.el.jsonFileName, f.name, 'Using default');
        try {
            await this.processAndLoad(JSON.parse(await readFile(f, 'readAsText')));
        } catch (e) {
            alert('Error parsing JSON: ' + e.message);
            this.pageManager.updateFileName(this.el.jsonFileName, 'Load failed. Using default.', 'Using default');
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

    async processAndLoad(json) {
        this.state.initialize(json);
        if (this.lastPdf) {
            this.pageManager.showLoading('Loading PDF...');
            try {
                await this.pdf.loadPDF(this.lastPdf);
                this.pageManager.updatePageInfo(`Total pages: ${this.pdf.pdfDoc.numPages}`);
                await this.render();
            } catch (e) {
                this.pageManager.showLoading('Failed to load PDF.');
            }
        }
    }
    
    async render() {
        if (!this.pdf.isLoaded()) return;

        const data = this.merger.mergeAllPages(this.state.overlayData, this.state);
        this.pageManager.clearContainer();
        this.pdf.resetRenderQueue();
        
        const pages = await Promise.all(
            Array.from({ length: this.pdf.getNumPages() }, (_, i) => this.pdf.getPage(i + 1))
        );
        
        pages.forEach((pg, i) => {
            const n = i + 1;
            const vp = pg.getViewport({ scale: CONFIG.PDF.SCALE });
            const w = this.pageManager.createPageWrapper(n, vp);
            
            this.pdf.queuePageForRender(w, async () => {
                await this.pdf.renderPageToCanvas(w, n, CONFIG.PDF.SCALE);
                this.coordControls.addPageControls(w, n, this.state, 
                    () => this.renderSinglePage(w, n, data));
                this.renderer.renderPageOverlays(w, n, 
                    { width: w.clientWidth, height: w.clientHeight }, data);
            });
        });
        
        this.pdf.startObserving();
    }
    
    renderSinglePage(wrapper, pageNum, data) {
        this.renderer.renderPageOverlays(wrapper, pageNum, 
            { width: wrapper.clientWidth, height: wrapper.clientHeight }, data);
    }
}