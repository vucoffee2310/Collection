import { StateManager } from '../core/StateManager.js';
import { OverlayMerger } from '../core/OverlayMerger.js';
import { PDFHandler } from '../core/PDFHandler.js';
import { FontSizeCalculator } from '../services/FontSizeCalculator.js';
import { PDFExporter } from '../services/PDFExporter.js';
import { OverlayRenderer } from '../ui/OverlayRenderer.js';
import { UIManager } from '../ui/UIManager.js';
import { CONFIG } from '../config.js';

export class PDFOverlayApp {
    constructor(defaultJsonData) {
        this.defaultJsonData = defaultJsonData;
        this.originalPdfName = 'document';
        this.lastLoadedPdfFile = null;

        // Initialize components
        this.stateManager = new StateManager();
        this.uiManager = new UIManager();
        this.overlayMerger = new OverlayMerger();
        this.fontSizeCalculator = new FontSizeCalculator();
        this.pdfHandler = new PDFHandler();
        this.overlayRenderer = new OverlayRenderer(this.stateManager, this.fontSizeCalculator);
        this.pdfExporter = new PDFExporter(this.pdfHandler);

        // Setup PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeUI();

        // Initial load with default data
        this.processAndLoadData(this.defaultJsonData);
    }
    
    initializeElements() {
        this.elements = {
            fileInput: document.getElementById('file-input'),
            jsonInput: document.getElementById('json-input'),
            saveBtn: document.getElementById('save-btn'),
            palette: document.getElementById('palette-container'),
            container: document.getElementById('pdf-container'),
            pdfFileName: document.getElementById('pdf-file-name'),
            jsonFileName: document.getElementById('json-file-name'),
            expandAmountInput: document.getElementById('expand-amount'),
            expandAllBtn: document.getElementById('expand-all-btn'),
            opacitySlider: document.getElementById('opacity-slider'),
            opacityValue: document.getElementById('opacity-value'),
            brightnessSlider: document.getElementById('brightness-slider'),
            brightnessValue: document.getElementById('brightness-value'),
        };
    }
    
    initializeUI() {
        this.uiManager.populatePaletteSwatches(this.elements.palette, CONFIG.DEFAULT_PALETTE);
        this.stateManager.setActivePalette(CONFIG.DEFAULT_PALETTE);
        this.handleOpacityChange();
        this.handleBrightnessChange();
    }
    
    attachEventListeners() {
        this.elements.fileInput.addEventListener('change', (e) => this.handlePDFUpload(e));
        this.elements.jsonInput.addEventListener('change', (e) => this.handleJSONUpload(e));
        this.elements.saveBtn.addEventListener('click', () => this.handleSave());
        this.elements.palette.addEventListener('click', (e) => this.handlePaletteChange(e));
        this.elements.expandAllBtn.addEventListener('click', () => this.handleExpandAll());
        this.elements.opacitySlider.addEventListener('input', () => this.handleOpacityChange());
        this.elements.brightnessSlider.addEventListener('input', () => this.handleBrightnessChange());
    }
    
    async handlePDFUpload(e) {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        this.originalPdfName = file.name.replace(/\.pdf$/i, '');
        this.uiManager.updateFileName(this.elements.pdfFileName, file.name, 'No file selected');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            this.lastLoadedPdfFile = event.target.result;
            this.elements.jsonInput.value = '';
            this.uiManager.updateFileName(this.elements.jsonFileName, null, 'Using default');
            await this.processAndLoadData(this.defaultJsonData);
        };
        reader.readAsArrayBuffer(file);
    }
    
    async handleJSONUpload(e) {
        const file = e.target.files[0];
        if (!file || !file.name.endsWith('.json')) return;

        this.uiManager.updateFileName(this.elements.jsonFileName, file.name, 'Using default');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const customJsonData = JSON.parse(event.target.result);
                await this.processAndLoadData(customJsonData);
            } catch (error) {
                alert('Error parsing JSON file: ' + error.message);
                this.uiManager.updateFileName(this.elements.jsonFileName, 'Load failed. Using default.', 'Using default');
                await this.processAndLoadData(this.defaultJsonData);
            }
        };
        reader.readAsText(file);
    }
    
    async handleSave() {
        if (!this.pdfHandler.isLoaded()) {
            alert('Please load a PDF file first.');
            return;
        }
        
        const state = this.stateManager.getState();
        const dataToSave = this.overlayMerger.mergeAllPages(state.overlayData);
        const brightness = parseInt(this.elements.brightnessSlider.value, 10);
            
        await this.pdfExporter.save(this.originalPdfName, dataToSave, state.activePalette, brightness, this.uiManager);
    }

    async handleExpandAll() {
        const amount = parseInt(this.elements.expandAmountInput.value, 10);
        if (isNaN(amount)) {
            alert('Please enter a valid number to expand by.');
            return;
        }
        this.stateManager.expandAllOverlays(amount);
        await this.renderUI();
    }

    handlePaletteChange(e) {
        const swatch = e.target.closest('.palette-swatch');
        if (!swatch) return;
        
        this.elements.palette.querySelector('.active')?.classList.remove('active');
        swatch.classList.add('active');
        const paletteKey = swatch.dataset.paletteKey;
        this.stateManager.setActivePalette(paletteKey);
        
        // Re-apply visual settings based on the new theme
        this.handleOpacityChange();
        this.handleBrightnessChange();
    }

    handleOpacityChange() {
        const opacity = parseInt(this.elements.opacitySlider.value, 10);
        this.elements.opacityValue.textContent = `${opacity}%`;
        const activePaletteKey = this.stateManager.getState().activePalette;
        this.uiManager.updateOverlayOpacity(activePaletteKey, opacity);
    }
    
    handleBrightnessChange() {
        const brightness = parseInt(this.elements.brightnessSlider.value, 10);
        this.elements.brightnessValue.textContent = `${brightness}%`;
        this.uiManager.updateTextBrightness(brightness);
    }
    
    async processAndLoadData(jsonData) {
        this.stateManager.initialize(jsonData);
        if (this.lastLoadedPdfFile) {
            this.uiManager.showLoading('Loading PDF...');
            try {
                await this.pdfHandler.loadPDF(this.lastLoadedPdfFile);
                this.uiManager.updatePageInfo(`Total pages: ${this.pdfHandler.pdfDoc.numPages}`);
                await this.renderUI();
            } catch (error) {
                this.uiManager.showLoading('Failed to load PDF.');
            }
        }
    }
    
    async renderUI() {
        if (!this.pdfHandler.isLoaded()) return;

        const state = this.stateManager.getState();
        const displayData = this.overlayMerger.mergeAllPages(state.overlayData);

        this.uiManager.clearContainer();
        this.pdfHandler.resetRenderQueue();
        
        const pages = await Promise.all(
            Array.from({ length: this.pdfHandler.getNumPages() }, (_, i) => this.pdfHandler.getPage(i + 1))
        );
        
        pages.forEach((page, i) => {
            const pageNum = i + 1;
            const viewport = page.getViewport({ scale: CONFIG.PDF.SCALE });
            const wrapper = this.uiManager.createPageWrapper(pageNum, viewport);
            
            const renderTask = async () => {
                await this.pdfHandler.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
                this.overlayRenderer.renderPageOverlays(wrapper, pageNum, viewport, displayData);
            };
            this.pdfHandler.queuePageForRender(wrapper, renderTask);
        });
        
        this.pdfHandler.startObserving();
    }
}
