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
import { SplitModal } from '../ui/SplitModal.js';
import { CONFIG } from '../config.js';
import { readFile, withErrorHandling, forceUIUpdate } from '../utils.js';

export class PDFOverlayApp {
    constructor(defaultJson) {
        this.defaultJson = defaultJson;
        this.pdfName = 'document';
        this.lastPdfData = null;

        // Services
        this.state = new StateManager();
        this.pdf = new PDFHandler();
        this.merger = new OverlayMerger();
        this.fontCalc = new FontSizeCalculator();
        this.coordManager = new CoordinateManager(this.state);
        this.renderer = new OverlayRenderer(this.state, this.fontCalc);
        this.exporters = new Exporters(this.pdf);
        this.pdfExporter = new PDFExporter(this.pdf);

        // UI
        this.ui = new PageManager();
        this.themeControls = new ThemeControls(this.state, this.fontCalc);
        this.coordControls = new CoordinateControls(this.coordManager);
        this.splitModal = new SplitModal(this.pdfExporter, this.pdf, this.ui);

        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;
        this._init();
    }

    _init() {
        // File inputs
        document.getElementById('file-input').onchange = (e) => this._handlePDF(e);
        document.getElementById('json-input').onchange = (e) => this._handleJSON(e);

        // Actions
        document.getElementById('expand-all-btn').onclick = () => this._expandAll();
        document.getElementById('split-pdf-btn').onclick = () => this._split();
        document.getElementById('save-print-btn').onclick = () => this._print();
        document.getElementById('save-direct-pdf-btn').onclick = () => this._exportPDF();
        document.getElementById('save-html-btn').onclick = () => this._exportHTML();

        // Custom events
        document.addEventListener('coordinateOrderChanged', () => this.render());
        document.addEventListener('reloadAllPages', () => this.render());
        document.addEventListener('exportSinglePage', async (e) => {
            if (!this.pdf.isLoaded()) return;
            const { pageNum } = e.detail;
            const indicator = this.ui.showSavingIndicator(`Preparing page ${pageNum}...`);
            await forceUIUpdate();
            try {
                await this._ensureRendered(pageNum);
                await this.pdfExporter.saveSinglePage(pageNum, this.pdfName, this.ui);
            } finally {
                this.ui.removeSavingIndicator(indicator);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
            const shortcuts = { S: 'split-pdf-btn', E: 'save-direct-pdf-btn', 
                               P: 'save-print-btn', H: 'save-html-btn' };
            const btn = shortcuts[e.key.toUpperCase()];
            if (btn) {
                e.preventDefault();
                document.getElementById(btn).click();
            }
        });

        this.themeControls.initialize();
        this.coordManager.initialize();
        this.processAndLoad(this.defaultJson);
    }

    async _handlePDF(e) {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        await withErrorHandling(async () => {
            document.getElementById('pdf-file-name').textContent = file.name;
            this.lastPdfData = await readFile(file, 'readAsArrayBuffer');
            this.pdfName = file.name.replace(/\.pdf$/i, '');
            
            document.getElementById('json-input').value = '';
            document.getElementById('json-file-name').textContent = 'Using default';
            
            await this.processAndLoad(this.defaultJson);
        }, 'Failed to load PDF');
    }

    async _handleJSON(e) {
        const file = e.target.files?.[0];
        if (!file || !file.name.endsWith('.json')) return;

        await withErrorHandling(async () => {
            document.getElementById('json-file-name').textContent = file.name;
            const text = await readFile(file, 'readAsText');
            await this.processAndLoad(JSON.parse(text));
        }, 'Failed to load JSON');
    }

    async _expandAll() {
        const amount = parseInt(document.getElementById('expand-amount').value, 10);
        if (isNaN(amount) || amount < 1) return alert('Please enter a valid positive number');
        
        this.state.expandAllOverlays(amount);
        await this.render();
    }

    async _split() {
        if (!this.pdf.isLoaded()) return alert('Please load a PDF file first.');
        
        const indicator = this.ui.showSavingIndicator('Preparing pages...');
        await forceUIUpdate();
        
        try {
            await this.pdf.renderAllQueuedPages();
            this.ui.removeSavingIndicator(indicator);
            await forceUIUpdate();
            this.splitModal.show(this.pdfName);
        } catch (e) {
            this.ui.removeSavingIndicator(indicator);
            throw e;
        }
    }

    async _print() {
        if (!this.pdf.isLoaded()) return alert('Please load a PDF file first.');
        
        const indicator = this.ui.showSavingIndicator('Preparing for print...');
        await forceUIUpdate();
        
        try {
            await this.exporters.print(this.ui);
        } finally {
            this.ui.removeSavingIndicator(indicator);
        }
    }

    async _exportPDF() {
        if (!this.pdf.isLoaded()) return alert('Please load a PDF file first.');
        
        const indicator = this.ui.showSavingIndicator('Starting PDF export...');
        await forceUIUpdate();
        
        try {
            await this.pdf.renderAllQueuedPages();
            await this.pdfExporter.save(this.pdfName, this.ui);
        } finally {
            this.ui.removeSavingIndicator(indicator);
        }
    }

    async _exportHTML() {
        if (!this.pdf.isLoaded()) return alert('Please load a PDF file first.');
        
        const indicator = this.ui.showSavingIndicator('Starting HTML export...');
        await forceUIUpdate();
        
        try {
            await this.pdf.renderAllQueuedPages();
            await this.exporters.html(this.pdfName, this.ui);
        } finally {
            this.ui.removeSavingIndicator(indicator);
        }
    }

    async processAndLoad(jsonData) {
        this.state.initialize(jsonData);
        if (!this.lastPdfData) return;

        await withErrorHandling(async () => {
            this.ui.showLoading('Loading PDF...');
            await forceUIUpdate();
            
            await this.pdf.loadPDF(this.lastPdfData);
            this.ui.updatePageInfo(`Total pages: ${this.pdf.pdfDoc.numPages}`);
            await this.render();
        }, 'Failed to process PDF');
    }

    async render() {
        if (!this.pdf.isLoaded()) return;

        const mergedData = this.merger.mergeAllPages(this.state.overlayData, this.state);
        this.ui.clearContainer();
        this.pdf.resetRenderQueue();

        const totalPages = this.pdf.getNumPages();
        const pages = await Promise.all(
            Array.from({ length: totalPages }, (_, i) => this.pdf.getPage(i + 1))
        );

        pages.forEach((page, i) => {
            const pageNum = i + 1;
            const vp = page.getViewport({ scale: CONFIG.PDF.SCALE });
            const wrapper = this.ui.createPageWrapper(pageNum, vp);

            this.pdf.queuePageForRender(wrapper, async () => {
                await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
                
                this.coordControls.addPageControls(wrapper, pageNum, this.state, () => 
                    this.renderer.renderPageOverlays(wrapper, pageNum, 
                        { width: wrapper.clientWidth, height: wrapper.clientHeight }, mergedData)
                );
                
                this.renderer.renderPageOverlays(wrapper, pageNum,
                    { width: wrapper.clientWidth, height: wrapper.clientHeight }, mergedData);
            });
        });

        this.pdf.startObserving();
    }

    async _ensureRendered(pageNum) {
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper && !wrapper.querySelector('canvas')) {
            await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
        }
    }
}