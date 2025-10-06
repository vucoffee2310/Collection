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
        this.state = new StateManager();
        this.ui = new UIManager();
        this.merger = new OverlayMerger();
        this.fontCalc = new FontSizeCalculator();
        this.pdf = new PDFHandler();
        this.renderer = new OverlayRenderer(this.state, this.fontCalc);
        this.exporter = new PDFExporter(this.pdf);

        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;
        
        this.cacheElements();
        this.attachEvents();
        this.initUI();
        this.processAndLoadData(defaultJsonData);
    }
    
    cacheElements() {
        this.el = {
            fileInput: document.getElementById('file-input'),
            jsonInput: document.getElementById('json-input'),
            saveBtn: document.getElementById('save-btn'),
            palette: document.getElementById('palette-container'),
            pdfFileName: document.getElementById('pdf-file-name'),
            jsonFileName: document.getElementById('json-file-name'),
            expandAmount: document.getElementById('expand-amount'),
            expandBtn: document.getElementById('expand-all-btn'),
            opacity: document.getElementById('opacity-slider'),
            opacityVal: document.getElementById('opacity-value'),
            brightness: document.getElementById('brightness-slider'),
            brightnessVal: document.getElementById('brightness-value'),
        };
    }
    
    initUI() {
        this.ui.populatePaletteSwatches(this.el.palette, CONFIG.DEFAULT_PALETTE);
        this.state.setActivePalette(CONFIG.DEFAULT_PALETTE);
        this.updateOpacity();
        this.updateBrightness();
    }
    
    attachEvents() {
        this.el.fileInput.onchange = e => this.loadPDF(e);
        this.el.jsonInput.onchange = e => this.loadJSON(e);
        this.el.saveBtn.onclick = () => this.save();
        this.el.palette.onclick = e => this.changePalette(e);
        this.el.expandBtn.onclick = () => this.expandAll();
        this.el.opacity.oninput = () => this.updateOpacity();
        this.el.brightness.oninput = () => this.updateBrightness();
    }
    
    async loadPDF(e) {
        const file = e.target.files[0];
        if (!file || file.type !== 'application/pdf') return;

        this.originalPdfName = file.name.replace(/\.pdf$/i, '');
        this.ui.updateFileName(this.el.pdfFileName, file.name, 'No file selected');
        
        const reader = new FileReader();
        reader.onload = async event => {
            this.lastLoadedPdfFile = event.target.result;
            this.el.jsonInput.value = '';
            this.ui.updateFileName(this.el.jsonFileName, null, 'Using default');
            await this.processAndLoadData(this.defaultJsonData);
        };
        reader.readAsArrayBuffer(file);
    }
    
    async loadJSON(e) {
        const file = e.target.files[0];
        if (!file || !file.name.endsWith('.json')) return;

        this.ui.updateFileName(this.el.jsonFileName, file.name, 'Using default');
        
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                await this.processAndLoadData(JSON.parse(event.target.result));
            } catch (error) {
                alert('Error parsing JSON: ' + error.message);
                this.ui.updateFileName(this.el.jsonFileName, 'Load failed. Using default.', 'Using default');
                await this.processAndLoadData(this.defaultJsonData);
            }
        };
        reader.readAsText(file);
    }
    
    async save() {
        if (!this.pdf.isLoaded()) return alert('Please load a PDF file first.');
        
        const data = this.merger.mergeAllPages(this.state.overlayData);
        const brightness = parseInt(this.el.brightness.value, 10);
            
        await this.exporter.save(this.originalPdfName, data, this.state.activePalette, brightness, this.ui);
    }

    async expandAll() {
        const amount = parseInt(this.el.expandAmount.value, 10);
        if (isNaN(amount)) return alert('Please enter a valid number.');
        
        this.state.expandAllOverlays(amount);
        await this.render();
    }

    changePalette(e) {
        const swatch = e.target.closest('.palette-swatch');
        if (!swatch) return;
        
        this.el.palette.querySelector('.active')?.classList.remove('active');
        swatch.classList.add('active');
        this.state.setActivePalette(swatch.dataset.paletteKey);
        this.updateOpacity();
        this.updateBrightness();
    }

    updateOpacity() {
        const val = parseInt(this.el.opacity.value, 10);
        this.el.opacityVal.textContent = `${val}%`;
        this.ui.updateOverlayOpacity(this.state.activePalette, val);
    }
    
    updateBrightness() {
        const val = parseInt(this.el.brightness.value, 10);
        this.el.brightnessVal.textContent = `${val}%`;
        this.ui.updateTextBrightness(val);
    }
    
    async processAndLoadData(jsonData) {
        this.state.initialize(jsonData);
        if (this.lastLoadedPdfFile) {
            this.ui.showLoading('Loading PDF...');
            try {
                await this.pdf.loadPDF(this.lastLoadedPdfFile);
                this.ui.updatePageInfo(`Total pages: ${this.pdf.pdfDoc.numPages}`);
                await this.render();
            } catch (error) {
                this.ui.showLoading('Failed to load PDF.');
            }
        }
    }
    
    async render() {
        if (!this.pdf.isLoaded()) return;

        const displayData = this.merger.mergeAllPages(this.state.overlayData);
        this.ui.clearContainer();
        this.pdf.resetRenderQueue();
        
        const pages = await Promise.all(
            Array.from({ length: this.pdf.getNumPages() }, (_, i) => this.pdf.getPage(i + 1))
        );
        
        pages.forEach((page, i) => {
            const pageNum = i + 1;
            const viewport = page.getViewport({ scale: CONFIG.PDF.SCALE });
            const wrapper = this.ui.createPageWrapper(pageNum, viewport);
            
            this.pdf.queuePageForRender(wrapper, async () => {
                await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
                this.renderer.renderPageOverlays(wrapper, pageNum, viewport, displayData);
            });
        });
        
        this.pdf.startObserving();
    }
}