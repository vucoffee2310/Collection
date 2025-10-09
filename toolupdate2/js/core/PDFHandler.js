import { CONFIG } from '../config.js';
import { readFile } from '../utils.js';

export class PDFHandler {
    constructor() {
        this.pdfDoc = null;
        this.fontBase64 = null;
        this.renderQueue = new Map();
        this.observer = null;
        this.pageCache = new Map();
    }
    
    isLoaded() { return !!this.pdfDoc; }
    getNumPages() { return this.pdfDoc?.numPages || 0; }
    
    async getPage(n) { 
        if (this.pageCache.has(n)) {
            return this.pageCache.get(n);
        }
        const page = await this.pdfDoc.getPage(n);
        this.pageCache.set(n, page);
        return page;
    }
    
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
            this.pageCache.clear();
            return this.pdfDoc = await pdfjsLib.getDocument(data).promise;
        } catch (e) {
            alert('Error loading PDF: ' + e.message);
            throw e;
        }
    }

    async getRenderedPageCanvas(n, scale) {
        const page = await this.getPage(n);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { 
            alpha: false,
            willReadFrequently: false 
        });
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ 
            canvasContext: ctx, 
            viewport: vp,
            intent: 'print'
        }).promise;
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
        this.observer = new IntersectionObserver((entries) => {
            const visible = entries
                .filter(e => e.isIntersecting)
                .map(e => {
                    const rect = e.boundingClientRect;
                    const viewportCenter = window.innerHeight / 2;
                    const elementCenter = rect.top + rect.height / 2;
                    const distance = Math.abs(viewportCenter - elementCenter);
                    return { entry: e, distance };
                })
                .sort((a, b) => a.distance - b.distance);
            
            visible.forEach(({ entry }) => {
                const task = this.renderQueue.get(entry.target);
                if (task) {
                    task();
                    this.renderQueue.delete(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, { 
            rootMargin: '500px 0px',
            threshold: 0
        });
        
        document.querySelectorAll('.page-placeholder').forEach(el => this.observer.observe(el));
    }

    async renderAllQueuedPages() {
        if (!this.renderQueue.size) return;
        this.observer?.disconnect();
        
        const tasks = Array.from(this.renderQueue.values());
        const batchSize = 5;
        
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);
            await Promise.all(batch.map(t => t()));
        }
        
        this.renderQueue.clear();
    }
}