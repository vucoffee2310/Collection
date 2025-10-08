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
import { readFileAs, setAllCoordMappings } from '../utils.js';

export class PDFOverlayApp {
    constructor(defaultJsonData) {
        this.defaultJsonData = defaultJsonData;
        this.originalPdfName = 'document';
        this.lastLoadedJsonData = defaultJsonData;
        this.coordMappings = {
            global: { top: 0, left: 1, bottom: 2, right: 3 }
        };
        this.lastLoadedPdfFile = null;

        this.state = new StateManager();
        this.ui = new UIManager();
        this.merger = new OverlayMerger();
        this.fontCalc = new FontSizeCalculator();
        this.pdf = new PDFHandler();
        this.renderer = new OverlayRenderer(this.state, this.fontCalc);
        this.htmlExporter = new HTMLExporter(this.pdf);
        this.printExporter = new PrintExporter();
        this.pdfExporter = new PDFExporter(this.pdf);

        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;
        
        this.cacheElements();
        this.attachEvents();
        this.initUI();
        this.processAndLoadData(defaultJsonData);
    }
    
    cacheElements() {
        this.el = {
            pdfContainer: document.getElementById('pdf-container'),
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
            globalCoordPosSelects: document.querySelectorAll('#global-coord-group .coord-pos-select'),
            remapCoordsBtn: document.getElementById('remap-coords-btn'),
        };
    }
    
    initUI() {
        this.ui.populatePaletteSwatches(this.el.palette, CONFIG.DEFAULT_PALETTE);
        this.state.setActivePalette(CONFIG.DEFAULT_PALETTE);
        this.updateOpacity();
        this.updateBrightness();
        this.updateParagraphSpacing();
        this.updateGlobalCoordUI();
    }
    
    attachEvents() {
        Object.entries({
            fileInput: ['change', e => this.loadPDF(e)],
            jsonInput: ['change', e => this.loadJSON(e)],
            savePrintBtn: ['click', this.saveWithPrint],
            saveDirectPdfBtn: ['click', this.saveAsDirectPdf],
            saveHtmlBtn: ['click', this.saveAsHtml],
            palette: ['click', e => this.changePalette(e)],
            expandBtn: ['click', this.expandAll],
            opacity: ['input', this.updateOpacity],
            brightness: ['input', this.updateBrightness],
            spacingSlider: ['input', this.updateParagraphSpacing],
            remapCoordsBtn: ['click', this.remapGlobalAndRender],
            pdfContainer: ['click', e => this.handlePerPageRemap(e)]
        }).forEach(([key, [evt, handler]]) => this.el[key]?.addEventListener(evt, handler.bind(this)));
    }
    
    async loadPDF(e) {
        const file = e.target.files?.[0];
        if (!file || file.type !== 'application/pdf') return;

        this.ui.updateFileName(this.el.pdfFileName, file.name, 'No file selected');
        this.lastLoadedPdfFile = await readFileAs(file, 'readAsArrayBuffer');
        this.originalPdfName = file.name.replace(/\.pdf$/i, '');
        this.el.jsonInput.value = '';
        this.ui.updateFileName(this.el.jsonFileName, null, 'Using default');
        this.lastLoadedJsonData = this.defaultJsonData;
        await this.processAndLoadData(this.defaultJsonData);
    }
    
    async loadJSON(e) {
        const file = e.target.files?.[0];
        if (!file || !file.name.endsWith('.json')) return;

        this.ui.updateFileName(this.el.jsonFileName, file.name, 'Using default');
        try {
            const jsonText = await readFileAs(file, 'readAsText');
            const jsonData = JSON.parse(jsonText);
            this.lastLoadedJsonData = jsonData;
            await this.processAndLoadData(jsonData);
        } catch (error) {
            alert('Error parsing JSON: ' + error.message);
            this.ui.updateFileName(this.el.jsonFileName, 'Load failed. Using default.', 'Using default');
            this.lastLoadedJsonData = this.defaultJsonData;
            await this.processAndLoadData(this.defaultJsonData);
        }
    }

    _withPdfCheck(action) {
        return this.pdf.isLoaded() ? action() : alert('Please load a PDF file first.');
    }

    saveWithPrint() { this._withPdfCheck(() => this.printExporter.save(this.pdf, this.ui)); }
    saveAsDirectPdf() { this._withPdfCheck(async () => { await this.pdf.renderAllQueuedPages(); await this.pdfExporter.save(this.originalPdfName, this.ui); }); }
    saveAsHtml() { this._withPdfCheck(async () => { await this.pdf.renderAllQueuedPages(); await this.htmlExporter.save(this.originalPdfName, this.ui); }); }

    async expandAll() {
        const amount = parseInt(this.el.expandAmount.value, 10);
        if (isNaN(amount)) return alert('Please enter a valid number.');
        this.state.setExpansion(amount);
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
        this.el.brightnessVal.textContent = `${this.el.brightness.value}%`;
        this.ui.updateTextBrightness(parseInt(this.el.brightness.value, 10));
    }
    
    updateParagraphSpacing() {
        const val = parseInt(this.el.spacingSlider.value, 10) / 100;
        this.el.spacingValue.textContent = `${val.toFixed(2)}em`;
        document.body.style.setProperty('--paragraph-spacing', `${val}em`);
        this.fontCalc.clearCache();
        requestAnimationFrame(() => document.querySelectorAll('.overlay').forEach(o => this.fontCalc.calculateOptimalSize(o)));
    }

    updateGlobalCoordUI() {
        const assignments = new Array(4);
        for (const [role, index] of Object.entries(this.coordMappings.global)) {
            assignments[index] = role;
        }
        this.el.globalCoordPosSelects.forEach((select, i) => select.value = assignments[i]);
    }
    
    updatePerPageCoordUI(pageNum) {
        const wrapper = document.getElementById(`page-wrapper-${pageNum}`);
        if (!wrapper) return;
        const pageKey = `page_${pageNum}`;
        const mapping = this.coordMappings[pageKey] || this.coordMappings.global;
        const assignments = new Array(4);
        for (const [role, index] of Object.entries(mapping)) {
            assignments[index] = role;
        }
        wrapper.querySelectorAll('.per-page-pos-select').forEach((select, i) => {
            select.value = assignments[i];
        });
    }

    async remapGlobalAndRender() {
        const assignments = Array.from(this.el.globalCoordPosSelects, select => select.value);
        if (new Set(assignments).size !== 4) {
            return alert('Each position must have a unique role (T, L, B, R).');
        }
        const mapping = {};
        assignments.forEach((role, index) => { mapping[role] = index; });
        
        this.coordMappings.global = mapping;
        Object.keys(this.coordMappings).forEach(key => {
            if (key !== 'global') delete this.coordMappings[key];
        });

        setAllCoordMappings(this.coordMappings);
        await this.render();
    }
    
    async handlePerPageRemap(e) {
        if (!e.target.classList.contains('per-page-remap-btn')) return;
        
        const wrapper = e.target.closest('.page-wrapper');
        const pageNum = wrapper.dataset.pageNum;
        const pageKey = `page_${pageNum}`;
        
        const selects = wrapper.querySelectorAll('.per-page-pos-select');
        const assignments = Array.from(selects, select => select.value);
        if (new Set(assignments).size !== 4) {
            return alert('Each position must have a unique role (T, L, B, R) for this page.');
        }
        const mapping = {};
        assignments.forEach((role, index) => { mapping[role] = index; });
        
        this.coordMappings[pageKey] = mapping;
        setAllCoordMappings(this.coordMappings);
        await this.render();
    }

    async processAndLoadData(jsonData) {
        this.lastLoadedJsonData = jsonData;
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
                const dimensions = { width: wrapper.clientWidth, height: wrapper.clientHeight };
                this.renderer.renderPageOverlays(wrapper, pageNum, dimensions, displayData);
                this.updatePerPageCoordUI(pageNum);
            });
        });
        
        this.pdf.startObserving();
    }
}