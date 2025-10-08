import { CONFIG } from '../config.js';
import { readFileAs } from '../utils.js';

export class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.fontBase64 = null;
        this.pageRenderQueue = new Map();
        this.intersectionObserver = null;
    }
    
    isLoaded() { return this.pdfDoc !== null; }
    getNumPages() { return this.pdfDoc ? this.pdfDoc.numPages : 0; }
    getPage(pageNum) { return this.pdfDoc.getPage(pageNum); }
    
    async loadFont() {
        if (this.fontBase64) return this.fontBase64;
        try {
            const response = await fetch(CONFIG.FONT.URL);
            if (!response.ok) throw new Error(`Font file not found at ${CONFIG.FONT.URL}`);
            const blob = await response.blob();
            const dataUrl = await readFileAs(blob, 'readAsDataURL');
            this.fontBase64 = dataUrl.split(',')[1];
            return this.fontBase64;
        } catch (error) {
            console.error("Failed to load custom font:", error);
            alert(`Error: Could not load "${CONFIG.FONT.FILE}". PDF will use default font.`);
            return null;
        }
    }
    
    async loadPDF(fileData) {
        try {
            const loadingTask = pdfjsLib.getDocument(fileData);
            this.pdfDoc = await loadingTask.promise;
            return this.pdfDoc;
        } catch (error) {
            console.error('Error loading PDF:', error);
            alert('Error loading PDF file: ' + error.message);
            this.pdfDoc = null;
            throw error;
        }
    }

    async getRenderedPageCanvas(pageNum, scale) {
        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        return canvas;
    }

    async renderPageToCanvas(pageWrapper, pageNum, scale) {
        if (!pageWrapper || pageWrapper.dataset.rendered) return;
        try {
            const canvas = await this.getRenderedPageCanvas(pageNum, scale);
            const placeholder = pageWrapper.querySelector('.loading-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            pageWrapper.appendChild(canvas);
            pageWrapper.classList.remove('page-placeholder');
            pageWrapper.dataset.rendered = "true";
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
            pageWrapper.innerHTML = `<span>Error loading page ${pageNum}</span>`;
        }
    }

    resetRenderQueue() {
        this.intersectionObserver?.disconnect();
        this.pageRenderQueue.clear();
    }

    queuePageForRender(pageWrapper, renderTask) {
        this.pageRenderQueue.set(pageWrapper, renderTask);
    }
    
    startObserving() {
        this.intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const renderTask = this.pageRenderQueue.get(entry.target);
                    if (renderTask) {
                        renderTask();
                        this.pageRenderQueue.delete(entry.target);
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, { rootMargin: '200px 0px' });
        
        document.querySelectorAll('.page-placeholder').forEach(el => this.intersectionObserver.observe(el));
    }

    async renderAllQueuedPages() {
        if (this.pageRenderQueue.size === 0) return;

        this.intersectionObserver?.disconnect();

        const renderPromises = Array.from(this.pageRenderQueue.values()).map(task => task());
        await Promise.all(renderPromises);
        
        this.pageRenderQueue.clear();
    }
}