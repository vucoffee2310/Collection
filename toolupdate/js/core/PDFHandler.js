import { CONFIG } from '../config.js';
import { readFile } from '../utils.js';

export class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.fontBase64 = null;
        this.renderQueue = new Map();
        this.observer = null;
    }
    
    isLoaded() { return !!this.pdfDoc; }
    getNumPages() { return this.pdfDoc?.numPages || 0; }
    getPage(n) { return this.pdfDoc.getPage(n); }
    
    async loadFont() {
        if (this.fontBase64) return this.fontBase64;
        try {
            const res = await fetch(CONFIG.FONT.URL);
            if (!res.ok) throw new Error(`Font not found at ${CONFIG.FONT.URL}`);
            const url = await readFile(await res.blob(), 'readAsDataURL');
            return this.fontBase64 = url.split(',')[1];
        } catch (e) {
            console.error("Font load failed:", e);
            alert(`Error: Could not load "${CONFIG.FONT.FILE}". PDF will use default font.`);
            return null;
        }
    }
    
    async loadPDF(data) {
        try {
            return this.pdfDoc = await pdfjsLib.getDocument(data).promise;
        } catch (e) {
            alert('Error loading PDF: ' + e.message);
            throw e;
        }
    }

    async getRenderedPageCanvas(n, scale) {
        const page = await this.pdfDoc.getPage(n);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        return canvas;
    }

    async renderPageToCanvas(wrapper, n, scale) {
        if (!wrapper || wrapper.dataset.rendered) return;
        try {
            wrapper.innerHTML = '';
            wrapper.classList.remove('page-placeholder');
            wrapper.appendChild(await this.getRenderedPageCanvas(n, scale));
            wrapper.dataset.rendered = "true";
        } catch (e) {
            wrapper.innerHTML = `<span>Error loading page ${n}</span>`;
        }
    }

    resetRenderQueue() {
        this.observer?.disconnect();
        this.renderQueue.clear();
    }

    queuePageForRender(wrapper, task) {
        this.renderQueue.set(wrapper, task);
    }
    
    startObserving() {
        this.observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const task = this.renderQueue.get(e.target);
                    if (task) {
                        task();
                        this.renderQueue.delete(e.target);
                        obs.unobserve(e.target);
                    }
                }
            });
        }, { rootMargin: '200px 0px' });
        
        document.querySelectorAll('.page-placeholder').forEach(el => this.observer.observe(el));
    }

    async renderAllQueuedPages() {
        if (!this.renderQueue.size) return;
        this.observer?.disconnect();
        await Promise.all(Array.from(this.renderQueue.values()).map(t => t()));
        this.renderQueue.clear();
    }
}