import { CONFIG } from '../config.js';

export class PDFHandler {
  constructor() {
    this.pdfDoc = null;
    this.fontPromise = null;
    this.renderQueue = new Map();
    this.observer = null;
    this.cache = new Map(); // Unified cache for pages and images
  }
  
  isLoaded() { return !!this.pdfDoc; }
  getNumPages() { return this.pdfDoc?.numPages || 0; }
  
  async getPage(n) {
    const key = `page_${n}`;
    if (this.cache.has(key)) return this.cache.get(key);
    
    const page = await this.pdfDoc.getPage(n);
    this.cache.set(key, page);
    return page;
  }
  
  async loadFont() {
    if (this.fontPromise) return this.fontPromise;
    
    this.fontPromise = (async () => {
      try {
        const res = await fetch(CONFIG.FONT.URL);
        if (!res.ok) throw new Error(`Font not found: ${CONFIG.FONT.URL}`);
        
        const blob = await res.blob();
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Font load failed:', e);
        alert(`Error: Could not load "${CONFIG.FONT.FILE}". PDF will use default font.`);
        return null;
      }
    })();
    
    return this.fontPromise;
  }
  
  async loadPDF(data) {
    try {
      this.cache.clear();
      this.pdfDoc = await pdfjsLib.getDocument(data).promise;
      return this.pdfDoc;
    } catch (e) {
      alert('Error loading PDF: ' + e.message);
      throw e;
    }
  }
  
  async renderPageToCanvas(wrapper, pageNum, scale) {
    if (!wrapper || wrapper.dataset.rendered) return;
    
    try {
      const page = await this.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: ctx, viewport, intent: 'print' }).promise;
      
      wrapper.innerHTML = '';
      wrapper.classList.remove('page-placeholder');
      wrapper.appendChild(canvas);
      wrapper.dataset.rendered = 'true';
    } catch (e) {
      wrapper.innerHTML = `<span>Error loading page ${pageNum}</span>`;
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
    this.observer = new IntersectionObserver(
      entries => {
        entries
          .filter(e => e.isIntersecting)
          .map(e => ({
            entry: e,
            distance: Math.abs(
              (e.boundingClientRect.top + e.boundingClientRect.height / 2) - 
              (window.innerHeight / 2)
            )
          }))
          .sort((a, b) => a.distance - b.distance)
          .forEach(({ entry }) => {
            const task = this.renderQueue.get(entry.target);
            if (task) {
              task();
              this.renderQueue.delete(entry.target);
              this.observer.unobserve(entry.target);
            }
          });
      },
      { rootMargin: '500px 0px', threshold: 0 }
    );
    
    document.querySelectorAll('.page-placeholder').forEach(el => this.observer.observe(el));
  }
  
  async renderAllQueuedPages() {
    if (!this.renderQueue.size) return;
    this.observer?.disconnect();
    
    // Batch size 10 instead of 5
    const tasks = Array.from(this.renderQueue.values());
    for (let i = 0; i < tasks.length; i += 10) {
      await Promise.all(tasks.slice(i, i + 10).map(t => t()));
    }
    
    this.renderQueue.clear();
  }
}