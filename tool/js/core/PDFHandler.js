export class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.fontBase64 = null;
        this.pageRenderQueue = new Map();
        this.intersectionObserver = null;
    }
    
    isLoaded() {
        return this.pdfDoc !== null;
    }
    
    async loadFont() {
        if (this.fontBase64) return this.fontBase64;
        
        try {
            const response = await fetch(CONFIG.FONT.URL);
            if (!response.ok) throw new Error(`Font file not found at ${CONFIG.FONT.URL}`);
            
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    this.fontBase64 = reader.result.split(',')[1];
                    resolve(this.fontBase64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Failed to load custom font:", error);
            alert(`Error: Could not load "${CONFIG.FONT.FILE}". PDF will use default font.`);
            return null;
        }
    }
    
    async loadPDF(fileData) {
        try {
            this.pdfDoc = await pdfjsLib.getDocument(fileData).promise;
            return this.pdfDoc;
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file: ' + error.message);
            this.pdfDoc = null;
            throw error;
        }
    }
    
    async renderPage(pageNum, pageWrapper, overlayRenderer) {
        if (!pageWrapper || pageWrapper.dataset.rendered) return;
        
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: CONFIG.PDF.SCALE });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({ canvasContext: context, viewport }).promise;
            
            pageWrapper.innerHTML = '';
            pageWrapper.classList.remove('page-placeholder');
            pageWrapper.appendChild(canvas);
            pageWrapper.dataset.rendered = "true";
            
            overlayRenderer.addOverlaysToPage(pageWrapper, pageNum, viewport);
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
            pageWrapper.innerHTML = `<span>Error loading page ${pageNum}</span>`;
        }
    }
    
    setupIntersectionObserver(overlayRenderer) {
        this.intersectionObserver?.disconnect();
        this.pageRenderQueue.clear();
        
        this.intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const renderFunc = this.pageRenderQueue.get(entry.target);
                    if (renderFunc) {
                        renderFunc();
                        this.pageRenderQueue.delete(entry.target);
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, { rootMargin: '200px 0px' });
        
        document.querySelectorAll('.page-placeholder').forEach(el => 
            this.intersectionObserver.observe(el)
        );
    }
    
    calculatePDFFontSize(pdf, text, width, height) {
        const availableWidth = width - CONFIG.OVERLAY.PADDING * 2;
        const availableHeight = height - CONFIG.OVERLAY.PADDING * 2;
        
        for (let size = CONFIG.OVERLAY.MAX_FONT_SIZE; size >= CONFIG.OVERLAY.MIN_FONT_SIZE; size--) {
            pdf.setFontSize(size);
            const lines = pdf.splitTextToSize(text, availableWidth);
            if (lines.length * pdf.getLineHeight() <= availableHeight) {
                return { fontSize: size, lines };
            }
        }
        
        pdf.setFontSize(CONFIG.OVERLAY.MIN_FONT_SIZE);
        return { 
            fontSize: CONFIG.OVERLAY.MIN_FONT_SIZE, 
            lines: pdf.splitTextToSize(text, availableWidth) 
        };
    }
}
