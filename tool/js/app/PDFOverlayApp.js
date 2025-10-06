export class PDFOverlayApp {
    constructor(defaultJsonData) {
        this.stateManager = new StateManager();
        this.overlayMerger = new OverlayMerger();
        this.fontSizeCalculator = new FontSizeCalculator();
        this.streakManager = new StreakManager();
        this.pdfHandler = new PDFHandler();
        this.uiManager = new UIManager();
        this.overlayRenderer = new OverlayRenderer(this.stateManager, this.fontSizeCalculator);
        
        this.defaultJsonData = defaultJsonData;
        this.lastLoadedPdfFile = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeUI();
    }
    
    initializeElements() {
        this.elements = {
            fileInput: document.getElementById('file-input'),
            jsonInput: document.getElementById('json-input'),
            saveBtn: document.getElementById('save-btn'),
            palette: document.getElementById('palette-container'),
            container: document.getElementById('pdf-container'),
            mergeToggle: document.getElementById('merge-toggle'),
            pdfFileName: document.getElementById('pdf-file-name'),
            jsonFileName: document.getElementById('json-file-name')
        };
    }
    
    initializeUI() {
        this.populatePaletteSwatches();
        this.stateManager.setActivePalette(CONFIG.DEFAULT_PALETTE);
        this.uiManager.applyTheme(CONFIG.DEFAULT_PALETTE);
    }
    
    populatePaletteSwatches() {
        Object.entries(CONFIG.COLOR_PALETTES).forEach(([key, palette]) => {
            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch' + (key === CONFIG.DEFAULT_PALETTE ? ' active' : '');
            swatch.dataset.paletteKey = key;
            swatch.title = palette.name;
            swatch.style.background = `rgb(${palette.background.join(',')})`;
            swatch.style.color = `rgb(${palette.text.join(',')})`;
            swatch.innerHTML = '<span>Aa</span>';
            this.elements.palette.appendChild(swatch);
        });
    }
    
    attachEventListeners() {
        this.elements.fileInput.addEventListener('change', (e) => this.handlePDFUpload(e));
        this.elements.jsonInput.addEventListener('change', (e) => this.handleJSONUpload(e));
        this.elements.mergeToggle.addEventListener('change', (e) => this.handleMergeToggle(e));
        this.elements.saveBtn.addEventListener('click', () => this.handleSave());
        this.elements.palette.addEventListener('click', (e) => this.handlePaletteChange(e));
        this.elements.container.addEventListener('blur', (e) => this.handleTextBlur(e), true);
        this.elements.container.addEventListener('click', (e) => this.handleFontSizeButton(e));
    }
    
    async handlePDFUpload(e) {
        this.streakManager.reset();
        const file = e.target.files[0];
        this.updateFileName(this.elements.fileInput, this.elements.pdfFileName);
        
        if (file?.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async () => {
                this.lastLoadedPdfFile = reader.result.slice(0);
                this.elements.jsonInput.value = '';
                this.updateFileName(this.elements.jsonInput, this.elements.jsonFileName);
                await this.savePDF(fileName, dataToSave, state.activePalette);
    }
    
    handlePaletteChange(e) {
        const swatch = e.target.closest('.palette-swatch');
        if (!swatch) return;
        
        this.elements.palette.querySelector('.active')?.classList.remove('active');
        swatch.classList.add('active');
        this.stateManager.setActivePalette(swatch.dataset.paletteKey);
        this.uiManager.applyTheme(swatch.dataset.paletteKey);
    }
    
    handleTextBlur(e) {
        this.streakManager.reset();
        const textSpan = e.target;
        if (!textSpan.matches('.overlay-text')) return;
        
        const overlay = textSpan.closest('.overlay');
        if (!overlay.dataset.coords.startsWith('[')) return;
        
        const { coords, pageNum } = overlay.dataset;
        const cleanedText = textSpan.textContent.trimEnd();
        this.stateManager.updateOverlay(pageNum, coords, { text: cleanedText });
        
        if (textSpan.textContent !== cleanedText) {
            textSpan.textContent = cleanedText;
        }
        
        const state = this.stateManager.getState();
        if (state.overlayData[`page_${pageNum}`][coords]?.fontSize === 'auto') {
            this.fontSizeCalculator.calculateOptimalSize(overlay, textSpan);
        }
    }
    
    handleFontSizeButton(e) {
        const target = e.target;
        if (!target.matches('.font-size-btn')) {
            this.streakManager.reset();
            return;
        }
        
        const overlay = target.closest('.overlay');
        if (!overlay) return;
        
        const { coords, pageNum } = overlay.dataset;
        const textSpan = overlay.querySelector('.overlay-text');
        const currentSize = parseFloat(getComputedStyle(textSpan).fontSize);
        const action = target.dataset.action;
        
        if (!this.streakManager.matches(pageNum, coords)) {
            this.streakManager.reset();
        }
        this.streakManager.update(pageNum, coords);
        
        switch (action) {
            case 'increase':
                this.handleFontIncrease(overlay, textSpan, pageNum, coords, currentSize);
                break;
            case 'decrease':
                this.handleFontDecrease(textSpan, pageNum, coords, currentSize);
                break;
            case 'auto':
                this.fontSizeCalculator.autoIncreaseWithStreak(overlay, textSpan, this.streakManager);
                break;
        }
    }
    
    handleFontIncrease(overlay, textSpan, pageNum, coords, currentSize) {
        this.streakManager.incrementCount();
        const netChange = 1 - (Math.floor(this.streakManager.getCount() / 2) - 
                              Math.floor((this.streakManager.getCount() - 1) / 2));
        const finalSize = currentSize + netChange;
        
        textSpan.style.fontSize = `${finalSize}px`;
        
        if (Utils.checkOverflow(textSpan, 0)) {
            textSpan.style.fontSize = `${currentSize}px`;
            this.streakManager.reset();
        } else {
            this.stateManager.updateOverlay(pageNum, coords, { fontSize: finalSize });
        }
    }
    
    handleFontDecrease(textSpan, pageNum, coords, currentSize) {
        this.streakManager.reset();
        const newSize = Math.max(CONFIG.OVERLAY.MIN_FONT_SIZE, currentSize - 1);
        this.stateManager.updateOverlay(pageNum, coords, { fontSize: newSize });
        textSpan.style.fontSize = `${newSize}px`;
    }
    
    async processAndLoadData(jsonData) {
        this.stateManager.initialize(jsonData, this.elements.mergeToggle.checked);
        if (this.lastLoadedPdfFile) {
            this.uiManager.showLoading('Loading PDF...');
            await this.pdfHandler.loadPDF(this.lastLoadedPdfFile);
            this.uiManager.updatePageInfo(`Total pages: ${this.pdfHandler.pdfDoc.numPages}`);
            await this.renderUI();
        }
    }
    
    async renderUI() {
        if (!this.pdfHandler.isLoaded()) return;
        
        const state = this.stateManager.getState();
        const overlayData = state.isMergeActive ? 
            this.overlayMerger.mergeAllPages(state.overlayData) : 
            state.overlayData;
        
        this.uiManager.clearContainer();
        this.pdfHandler.pageRenderQueue.clear();
        this.pdfHandler.intersectionObserver?.disconnect();
        
        const pages = await Promise.all(
            Array.from({ length: this.pdfHandler.pdfDoc.numPages }, (_, i) => 
                this.pdfHandler.pdfDoc.getPage(i + 1)
            )
        );
        
        pages.forEach((page, i) => {
            const pageNum = i + 1;
            const viewport = page.getViewport({ scale: CONFIG.PDF.SCALE });
            const wrapper = this.uiManager.createPageWrapper(pageNum, viewport);
            
            if (wrapper) {
                this.pdfHandler.pageRenderQueue.set(wrapper, () => 
                    this.pdfHandler.renderPage(pageNum, wrapper, this.overlayRenderer)
                );
            }
        });
        
        this.pdfHandler.setupIntersectionObserver(this.overlayRenderer);
    }
    
    async savePDF(fileName, overlayData, paletteKey) {
        const palette = CONFIG.COLOR_PALETTES[paletteKey] || CONFIG.COLOR_PALETTES[CONFIG.DEFAULT_PALETTE];
        const indicator = this.uiManager.showSavingIndicator();
        
        try {
            const fontData = await this.pdfHandler.loadFont();
            const { jsPDF } = window.jspdf;
            
            const firstPage = await this.pdfHandler.pdfDoc.getPage(1);
            const viewport = firstPage.getViewport({ scale: 1 });
            const pageHeight = 1000;
            const pageWidth = (viewport.width / viewport.height) * pageHeight;
            
            const pdf = new jsPDF({
                orientation: pageWidth > pageHeight ? 'l' : 'p',
                unit: 'pt',
                format: [pageWidth, pageHeight]
            });
            
            pdf.setLineHeightFactor(1.35);
            
            if (fontData) {
                pdf.addFileToVFS(CONFIG.FONT.FILE, fontData);
                pdf.addFont(CONFIG.FONT.FILE, CONFIG.FONT.NAME, 'normal');
                pdf.setFont(CONFIG.FONT.NAME, 'normal');
            } else {
                pdf.setFont('Helvetica', 'normal');
            }
            
            for (let i = 0; i < this.pdfHandler.pdfDoc.numPages; i++) {
                const pageNum = i + 1;
                if (i > 0) pdf.addPage([pageWidth, pageHeight]);
                
                await this.renderPDFPage(pdf, pageNum, pageWidth, pageHeight, overlayData, palette);
            }
            
            pdf.save(`${fileName}_with_overlays.pdf`);
        } catch (error) {
            console.error('Error saving PDF:', error);
            alert('Error saving PDF: ' + error.message);
        } finally {
            this.uiManager.removeSavingIndicator(indicator);
        }
    }
    
    async renderPDFPage(pdf, pageNum, pageWidth, pageHeight, overlayData, palette) {
        const page = await this.pdfHandler.pdfDoc.getPage(pageNum);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const vp = page.getViewport({ scale: CONFIG.PDF.RENDER_SCALE });
        
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageWidth, pageHeight);
        
        const pageData = overlayData[`page_${pageNum}`];
        if (!pageData) return;
        
        const scaleX = pageWidth / 1000;
        const scaleY = pageHeight / 1000;
        
        Object.entries(pageData).forEach(([coordsStr, info]) => {
            this.renderPDFOverlay(pdf, coordsStr, info, scaleX, scaleY, palette);
        });
    }
    
    renderPDFOverlay(pdf, coordsStr, info, scaleX, scaleY, palette) {
        const [top, left, bottom, right] = JSON.parse(coordsStr);
        const x = left * scaleX;
        const y = top * scaleY;
        const width = (right - left) * scaleX;
        const height = Math.max((bottom - top) * scaleY, CONFIG.OVERLAY.MIN_HEIGHT);
        
        pdf.setDrawColor(...palette.border);
        pdf.setFillColor(...palette.background);
        pdf.rect(x, y, width, height, 'FD');
        pdf.setTextColor(...palette.text);
        
        let fontSize, lines;
        if (typeof info.fontSize === 'number') {
            fontSize = info.fontSize;
            pdf.setFontSize(fontSize);
            lines = pdf.splitTextToSize(info.text, width - CONFIG.OVERLAY.PADDING * 2);
        } else {
            ({ fontSize, lines } = this.pdfHandler.calculatePDFFontSize(pdf, info.text, width, height));
            pdf.setFontSize(fontSize);
        }
        
        pdf.text(lines, x + CONFIG.OVERLAY.PADDING, y + CONFIG.OVERLAY.PADDING, { 
            align: 'justify', 
            baseline: 'top' 
        });
    }
    
    updateFileName(input, span) {
        span.textContent = input.files?.[0]?.name || 
            (span === this.elements.pdfFileName ? 'No file selected' : 'Using default');
    }
}