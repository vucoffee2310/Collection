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
import { readFile, withErrorHandling, createButtonHandler, forceUIUpdate } from '../utils.js';

export class PDFOverlayApp {
  constructor(defaultJson) {
    // State
    this.defaultJson = defaultJson;
    this.pdfName = 'document';
    this.lastPdfData = null;
    this.renderedPages = new Set();
    this.isOperationRunning = false;

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
    this.pageManager = new PageManager();
    this.themeControls = new ThemeControls(this.state, this.fontCalc);
    this.coordControls = new CoordinateControls(this.coordManager);
    this.splitModal = new SplitModal(this.pdfExporter, this.pdf, this.pageManager);

    // PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF.WORKER_SRC;

    this._setupElements();
    this._setupEventListeners();
    this._initialize();
  }

  _setupElements() {
    const $ = id => document.getElementById(id);
    this.el = {
      fileInput: $('file-input'),
      jsonInput: $('json-input'),
      pdfFileName: $('pdf-file-name'),
      jsonFileName: $('json-file-name'),
      expandBtn: $('expand-all-btn'),
      expandAmount: $('expand-amount'),
      splitPdfBtn: $('split-pdf-btn'),
      savePrintBtn: $('save-print-btn'),
      saveDirectPdfBtn: $('save-direct-pdf-btn'),
      saveHtmlBtn: $('save-html-btn')
    };
  }

  _setupEventListeners() {
    // File inputs
    this.el.fileInput?.addEventListener('change', e => this.handlePDFUpload(e));
    this.el.jsonInput?.addEventListener('change', e => this.handleJSONUpload(e));

    // Buttons (with loading state and operation lock)
    const actions = {
      expandBtn: () => this.handleExpandAll(),
      splitPdfBtn: () => this.handleSplitPDF(),
      savePrintBtn: () => this.handlePrint(),
      saveDirectPdfBtn: () => this.handleExportPDF(),
      saveHtmlBtn: () => this.handleExportHTML()
    };
    
    Object.entries(actions).forEach(([key, fn]) => {
      const btn = this.el[key];
      if (btn) {
        btn.addEventListener('click', createButtonHandler(btn, async () => {
          if (this.isOperationRunning) {
            alert('Please wait for the current operation to complete.');
            return;
          }
          this.isOperationRunning = true;
          try {
            await fn();
          } finally {
            this.isOperationRunning = false;
          }
        }));
      }
    });

    // Custom events
    document.addEventListener('coordinateOrderChanged', () => this.render());
    document.addEventListener('reloadAllPages', () => this.render());
    document.addEventListener('exportSinglePage', e => this._handleSinglePageExport(e.detail.pageNum));

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      if ((localStorage.getItem('theme') || 'light') === 'dark') {
        document.body.classList.add('dark-theme');
      }
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme',
          document.body.classList.contains('dark-theme') ? 'dark' : 'light'
        );
      });
    }

    // Keyboard shortcuts (Ctrl/Cmd + Shift + S/E/P/H)
    const shortcuts = {
      S: () => this.el.splitPdfBtn?.click(),
      E: () => this.el.saveDirectPdfBtn?.click(),
      P: () => this.el.savePrintBtn?.click(),
      H: () => this.el.saveHtmlBtn?.click()
    };
    document.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      const fn = shortcuts[e.key.toUpperCase()];
      if (!fn) return;
      const a = document.activeElement;
      const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
      if (typing) return;
      e.preventDefault();
      fn();
    });
  }

  _initialize() {
    this.themeControls.initialize();
    this.coordManager.initialize();
    this.processAndLoad(this.defaultJson);
  }

  async handlePDFUpload(event) {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    await withErrorHandling(async () => {
      this.pageManager.updateFileName(this.el.pdfFileName, file.name, 'No file selected');
      this.lastPdfData = await readFile(file, 'readAsArrayBuffer');
      this.pdfName = file.name.replace(/\.pdf$/i, '');

      this.el.jsonInput.value = '';
      this.pageManager.updateFileName(this.el.jsonFileName, null, 'Using default');

      await this.processAndLoad(this.defaultJson);
    }, 'Failed to load PDF');
  }

  async handleJSONUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.json')) return;

    await withErrorHandling(async () => {
      if (this.pdf.isLoaded()) {
        const proceed = confirm(
          'You are loading new overlay data for the current PDF.\n\n' +
          'Make sure this JSON matches your loaded PDF.\n\nContinue?'
        );
        if (!proceed) return;
      }
      
      this.pageManager.updateFileName(this.el.jsonFileName, file.name, 'Using default');
      const jsonText = await readFile(file, 'readAsText');
      await this.processAndLoad(JSON.parse(jsonText));
    }, 'Failed to load JSON');
  }

  async handleExpandAll() {
    const amount = parseFloat(this.el.expandAmount.value);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive number');
      return;
    }
    if (amount > 100) {
      if (!confirm(`Expand by ${amount}px? This is quite large and may cause overlaps.`)) {
        return;
      }
    }
    this.state.expandAllOverlays(amount);
    await this.render();
  }

  async handleSplitPDF() {
    if (!this.pdf.isLoaded()) {
      alert('Please load a PDF file first.');
      return;
    }
    const indicator = this.pageManager.showSavingIndicator('Preparing pages...');
    await forceUIUpdate();

    try {
      await this.pdf.renderAllQueuedPages();
      this.pageManager.removeSavingIndicator(indicator);
      await forceUIUpdate();
      this.splitModal.show(this.pdfName);
    } catch (e) {
      this.pageManager.removeSavingIndicator(indicator);
      throw e;
    }
  }

  async handlePrint() {
    if (!this.pdf.isLoaded()) {
      alert('Please load a PDF file first.');
      return;
    }
    await this.exporters.print(this.pageManager);
  }

  async handleExportPDF() {
    if (!this.pdf.isLoaded()) {
      alert('Please load a PDF file first.');
      return;
    }
    const indicator = this.pageManager.showSavingIndicator('Starting PDF export...');
    await forceUIUpdate();

    try {
      await this.pdf.renderAllQueuedPages();
      await this.pdfExporter.save(this.pdfName, this.pageManager);
    } finally {
      this.pageManager.removeSavingIndicator(indicator);
    }
  }

  async handleExportHTML() {
    if (!this.pdf.isLoaded()) {
      alert('Please load a PDF file first.');
      return;
    }
    const indicator = this.pageManager.showSavingIndicator('Starting HTML export...');
    await forceUIUpdate();

    try {
      await this.pdf.renderAllQueuedPages();
      await this.exporters.html(this.pdfName, this.pageManager);
    } finally {
      this.pageManager.removeSavingIndicator(indicator);
    }
  }

  async _handleSinglePageExport(pageNum) {
    if (!this.pdf.isLoaded()) {
      alert('Please load a PDF file first.');
      return;
    }
    const indicator = this.pageManager.showSavingIndicator(`Preparing page ${pageNum}...`);
    await forceUIUpdate();

    try {
      if (!this.renderedPages.has(pageNum)) {
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (wrapper) {
          await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
          this.renderedPages.add(pageNum);
        }
      }
      await this.pdfExporter.saveSinglePage(pageNum, this.pdfName, this.pageManager);
    } finally {
      this.pageManager.removeSavingIndicator(indicator);
    }
  }

  async processAndLoad(jsonData) {
    this.state.initialize(jsonData);
    if (!this.lastPdfData) return;

    await withErrorHandling(async () => {
      this.pageManager.showLoading('Loading PDF...');
      await forceUIUpdate();

      await this.pdf.loadPDF(this.lastPdfData);
      this.pageManager.updatePageInfo(`Total pages: ${this.pdf.pdfDoc.numPages}`);

      await this.render();
    }, 'Failed to process PDF');
  }

  async render() {
    if (!this.pdf.isLoaded()) return;

    this.renderedPages.clear();
    const mergedData = this.merger.mergeAllPages(this.state.overlayData, this.state);

    this.pageManager.clearContainer();
    this.pdf.resetRenderQueue();

    const totalPages = this.pdf.getNumPages();
    const pages = await Promise.all(
      Array.from({ length: totalPages }, (_, i) => this.pdf.getPage(i + 1))
    );

    pages.forEach((page, i) => {
      const pageNum = i + 1;
      const viewport = page.getViewport({ scale: CONFIG.PDF.SCALE });
      const wrapper = this.pageManager.createPageWrapper(pageNum, viewport);

      this.pdf.queuePageForRender(wrapper, async () => {
        await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
        this.renderedPages.add(pageNum);

        this.coordControls.addPageControls(wrapper, pageNum, this.state, () => {
          this.renderer.renderPageOverlays(
            wrapper,
            pageNum,
            { width: wrapper.clientWidth, height: wrapper.clientHeight },
            mergedData
          );
        });

        this.renderer.renderPageOverlays(
          wrapper,
          pageNum,
          { width: wrapper.clientWidth, height: wrapper.clientHeight },
          mergedData
        );
      });
    });

    this.pdf.startObserving();
  }
}