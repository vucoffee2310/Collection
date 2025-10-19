export class PageManager {
    constructor() {
        this.container = document.querySelector('#pdf-container');
        this.currentIndicator = null;
    }
    
    showLoading(msg) {
        if (this.container) {
            this.container.innerHTML = `<div class="loading">${msg}</div>`;
        }
    }
    
    updatePageInfo(msg) {
        const el = document.getElementById('page-info');
        if (el) el.textContent = msg;
    }
    
    updateFileName(el, name, def) {
        if (el) el.textContent = name || def;
    }
    
    clearContainer() {
        if (this.container) this.container.innerHTML = '';
    }
    
    createPageWrapper(n, vp) {
        const w = document.createElement('div');
        w.className = 'page-wrapper page-placeholder';
        w.id = `page-wrapper-${n}`;
        w.dataset.pageNum = n;
        w.style.aspectRatio = `${vp.width} / ${vp.height}`;
        w.innerHTML = `
            <span>Loading page ${n}...</span>
            <div class="page-export-controls">
                <button class="page-export-btn" data-page="${n}" title="Export page ${n} as individual PDF">
                    💾 Save Page ${n}
                </button>
            </div>
        `;
        
        const exportBtn = w.querySelector('.page-export-btn');
        exportBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const pageNum = parseInt(e.target.dataset.page);
            document.dispatchEvent(new CustomEvent('exportSinglePage', { 
                detail: { pageNum } 
            }));
        });
        
        this.container?.appendChild(w);
        return w;
    }
    
    /**
     * Show saving indicator with immediate display
     */
    showSavingIndicator(msg = 'Processing...') {
        // Remove any existing indicator first
        if (this.currentIndicator) {
            this.currentIndicator.remove();
        }
        
        const indicator = document.createElement('div');
        indicator.className = 'saving-indicator';
        indicator.innerHTML = `
            <div class="saving-content">
                <div class="saving-spinner"></div>
                <div class="saving-message">${msg}</div>
            </div>
        `;
        
        document.body.appendChild(indicator);
        this.currentIndicator = indicator;
        
        // Force immediate display with reflow
        indicator.offsetHeight;
        indicator.classList.add('active');
        
        return indicator;
    }
    
    removeSavingIndicator(ind) {
        if (ind) {
            ind.classList.remove('active');
            setTimeout(() => ind.remove(), 200);
        }
        if (ind === this.currentIndicator) {
            this.currentIndicator = null;
        }
    }
}