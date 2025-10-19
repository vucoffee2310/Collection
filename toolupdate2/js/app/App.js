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
import { readFile, withErrorHandling, ButtonStateManager, forceUIUpdate } from '../utils.js';

export class PDFOverlayApp {
    constructor(defaultJson) {
        this.state = {
            defaultJson,
            pdfName: 'document',
            lastPdfData: null
        };

        this.services = this._initializeServices();
        this.ui = this._initializeUI();
        this.buttonManager = new ButtonStateManager();
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;
        this._setupElements();
        this._setupEventListeners();
        this._setupKeyboardShortcuts();
        this._initialize();
    }
    
    _initializeServices() {
        const stateManager = new StateManager();
        const pdfHandler = new PDFHandler();
        
        return {
            state: stateManager,
            pdf: pdfHandler,
            merger: new OverlayMerger(),
            fontCalc: new FontSizeCalculator(),
            coordManager: new CoordinateManager(stateManager),
            renderer: new OverlayRenderer(stateManager, new FontSizeCalculator()),
            exporters: new Exporters(pdfHandler),
            pdfExporter: new PDFExporter(pdfHandler)
        };
    }
    
    _initializeUI() {
        const { state, fontCalc, coordManager, pdf, pdfExporter } = this.services;
        const pageManager = new PageManager();
        
        return {
            pageManager,
            themeControls: new ThemeControls(state, fontCalc),
            coordControls: new CoordinateControls(coordManager),
            splitModal: new SplitModal(pdfExporter, pdf, pageManager)
        };
    }
    
    _setupElements() {
        this.elements = {
            fileInput: document.getElementById('file-input'),
            jsonInput: document.getElementById('json-input'),
            pdfFileName: document.getElementById('pdf-file-name'),
            jsonFileName: document.getElementById('json-file-name'),
            expandBtn: document.getElementById('expand-all-btn'),
            expandAmount: document.getElementById('expand-amount'),
            splitPdfBtn: document.getElementById('split-pdf-btn'),
            savePrintBtn: document.getElementById('save-print-btn'),
            saveDirectPdfBtn: document.getElementById('save-direct-pdf-btn'),
            saveHtmlBtn: document.getElementById('save-html-btn'),
        };
    }
    
    _setupEventListeners() {
        const { elements } = this;
        
        // File inputs
        elements.fileInput?.addEventListener('change', e => this.handlePDFUpload(e));
        elements.jsonInput?.addEventListener('change', e => this.handleJSONUpload(e));
        
        // Actions with button state management
        elements.expandBtn?.addEventListener('click', () => {
            this.buttonManager.execute(elements.expandBtn, () => this.handleExpandAll());
        });
        
        elements.splitPdfBtn?.addEventListener('click', () => {
            this.buttonManager.execute(elements.splitPdfBtn, () => this.handleSplitPDF());
        });
        
        elements.savePrintBtn?.addEventListener('click', () => {
            this.buttonManager.execute(elements.savePrintBtn, () => this.handlePrint());
        });
        
        elements.saveDirectPdfBtn?.addEventListener('click', () => {
            this.buttonManager.execute(elements.saveDirectPdfBtn, () => this.handleExportPDF());
        });
        
        elements.saveHtmlBtn?.addEventListener('click', () => {
            this.buttonManager.execute(elements.saveHtmlBtn, () => this.handleExportHTML());
        });
        
        this._setupCustomEventListeners();
    }
    
    _setupCustomEventListeners() {
        document.addEventListener('coordinateOrderChanged', () => this.render());
        document.addEventListener('reloadAllPages', () => this.render());
        
        document.addEventListener('exportSinglePage', async (e) => {
            await this._withPDFCheck(async () => {
                const { pageNum } = e.detail;
                
                // Show indicator immediately
                const indicator = this.ui.pageManager.showSavingIndicator(`Preparing page ${pageNum}...`);
                await forceUIUpdate();
                
                try {
                    await this._ensurePageRendered(pageNum);
                    await this.services.pdfExporter.saveSinglePage(
                        pageNum, 
                        this.state.pdfName, 
                        this.ui.pageManager
                    );
                } finally {
                    this.ui.pageManager.removeSavingIndicator(indicator);
                }
            });
        });
    }
    
    _setupKeyboardShortcuts() {
        const shortcuts = {
            'S': { shift: true, action: () => this.elements.splitPdfBtn?.click() },
            'E': { shift: true, action: () => this.elements.saveDirectPdfBtn?.click() },
            'P': { shift: true, action: () => this.elements.savePrintBtn?.click() },
            'H': { shift: true, action: () => this.elements.saveHtmlBtn?.click() },
        };
        
        document.addEventListener('keydown', (e) => {
            const key = e.key.toUpperCase();
            const shortcut = shortcuts[key];
            
            if (shortcut && (e.ctrlKey || e.metaKey) && e.shiftKey) {
                e.preventDefault();
                shortcut.action();
            }
        });
    }
    
    _initialize() {
        this.ui.themeControls.initialize();
        this.services.coordManager.initialize();
        this.processAndLoad(this.state.defaultJson);
    }
    
    async handlePDFUpload(event) {
        const file = event.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        await withErrorHandling(async () => {
            this.ui.pageManager.updateFileName(
                this.elements.pdfFileName, 
                file.name, 
                'No file selected'
            );
            
            this.state.lastPdfData = await readFile(file, 'readAsArrayBuffer');
            this.state.pdfName = file.name.replace(/\.pdf$/i, '');
            
            this.elements.jsonInput.value = '';
            this.ui.pageManager.updateFileName(
                this.elements.jsonFileName, 
                null, 
                'Using default'
            );
            
            await this.processAndLoad(this.state.defaultJson);
        }, 'Failed to load PDF');
    }
    
    async handleJSONUpload(event) {
        const file = event.target.files?.[0];
        if (!file || !file.name.endsWith('.json')) return;

        await withErrorHandling(async () => {
            this.ui.pageManager.updateFileName(
                this.elements.jsonFileName, 
                file.name, 
                'Using default'
            );
            
            const jsonText = await readFile(file, 'readAsText');
            const jsonData = JSON.parse(jsonText);
            
            await this.processAndLoad(jsonData);
        }, 'Failed to load JSON');
    }
    
    async handleExpandAll() {
        const amount = parseInt(this.elements.expandAmount.value, 10);
        
        if (isNaN(amount) || amount < 1) {
            alert('Please enter a valid positive number');
            return;
        }
        
        this.services.state.expandAllOverlays(amount);
        await this.render();
    }
    
    async handleSplitPDF() {
        await this._withPDFCheck(async () => {
            // Show loading immediately
            const indicator = this.ui.pageManager.showSavingIndicator('Preparing pages for split...');
            await forceUIUpdate();
            
            try {
                await this.services.pdf.renderAllQueuedPages();
                this.ui.pageManager.removeSavingIndicator(indicator);
                await forceUIUpdate();
                
                // Now show modal
                this.ui.splitModal.show(this.state.pdfName);
            } catch (e) {
                this.ui.pageManager.removeSavingIndicator(indicator);
                throw e;
            }
        });
    }
    
    async handlePrint() {
        await this._withPDFCheck(async () => {
            // Show indicator first
            const indicator = this.ui.pageManager.showSavingIndicator('Preparing for print...');
            await forceUIUpdate();
            
            try {
                await this.services.exporters.print(this.ui.pageManager);
            } finally {
                this.ui.pageManager.removeSavingIndicator(indicator);
            }
        });
    }
    
    async handleExportPDF() {
        await this._withPDFCheck(async () => {
            // Show indicator first
            const indicator = this.ui.pageManager.showSavingIndicator('Starting PDF export...');
            await forceUIUpdate();
            
            try {
                await this.services.pdf.renderAllQueuedPages();
                await this.services.pdfExporter.save(
                    this.state.pdfName, 
                    this.ui.pageManager
                );
            } finally {
                this.ui.pageManager.removeSavingIndicator(indicator);
            }
        });
    }
    
    async handleExportHTML() {
        await this._withPDFCheck(async () => {
            // Show indicator first
            const indicator = this.ui.pageManager.showSavingIndicator('Starting HTML export...');
            await forceUIUpdate();
            
            try {
                await this.services.pdf.renderAllQueuedPages();
                await this.services.exporters.html(
                    this.state.pdfName, 
                    this.ui.pageManager
                );
            } finally {
                this.ui.pageManager.removeSavingIndicator(indicator);
            }
        });
    }
    
    async processAndLoad(jsonData) {
        this.services.state.initialize(jsonData);
        
        if (!this.state.lastPdfData) return;
        
        await withErrorHandling(async () => {
            this.ui.pageManager.showLoading('Loading PDF...');
            await forceUIUpdate();
            
            await this.services.pdf.loadPDF(this.state.lastPdfData);
            
            const totalPages = this.services.pdf.pdfDoc.numPages;
            this.ui.pageManager.updatePageInfo(`Total pages: ${totalPages}`);
            
            await this.render();
        }, 'Failed to process PDF');
    }
    
    async render() {
        if (!this.services.pdf.isLoaded()) return;

        const mergedData = this.services.merger.mergeAllPages(
            this.services.state.overlayData, 
            this.services.state
        );
        
        this.ui.pageManager.clearContainer();
        this.services.pdf.resetRenderQueue();
        
        const pages = await this._getAllPages();
        
        pages.forEach((page, index) => {
            this._renderPage(page, index + 1, mergedData);
        });
        
        this.services.pdf.startObserving();
    }
    
    async _getAllPages() {
        const totalPages = this.services.pdf.getNumPages();
        return Promise.all(
            Array.from({ length: totalPages }, (_, i) => 
                this.services.pdf.getPage(i + 1)
            )
        );
    }
    
    _renderPage(page, pageNum, mergedData) {
        const viewport = page.getViewport({ scale: CONFIG.PDF.SCALE });
        const wrapper = this.ui.pageManager.createPageWrapper(pageNum, viewport);
        
        this.services.pdf.queuePageForRender(wrapper, async () => {
            await this.services.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
            
            this.ui.coordControls.addPageControls(
                wrapper, 
                pageNum, 
                this.services.state,
                () => this._renderSinglePage(wrapper, pageNum, mergedData)
            );
            
            this.services.renderer.renderPageOverlays(
                wrapper, 
                pageNum,
                { width: wrapper.clientWidth, height: wrapper.clientHeight }, 
                mergedData
            );
        });
    }
    
    _renderSinglePage(wrapper, pageNum, mergedData) {
        this.services.renderer.renderPageOverlays(
            wrapper, 
            pageNum,
            { width: wrapper.clientWidth, height: wrapper.clientHeight }, 
            mergedData
        );
    }
    
    async _withPDFCheck(action) {
        if (!this.services.pdf.isLoaded()) {
            alert('Please load a PDF file first.');
            return;
        }
        
        return action();
    }
    
    async _ensurePageRendered(pageNum) {
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper && !wrapper.querySelector('canvas')) {
            await this.services.pdf.renderPageToCanvas(
                wrapper, 
                pageNum, 
                CONFIG.PDF.SCALE
            );
        }
    }
}