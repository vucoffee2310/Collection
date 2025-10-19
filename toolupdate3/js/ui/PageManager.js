export class PageManager {
    constructor() {
        this.container = document.querySelector('#pdf-container');
        this.indicator = null;
    }

    showLoading(msg) {
        this.container.innerHTML = `<div class="loading">${msg}</div>`;
    }

    updatePageInfo(msg) {
        const el = document.getElementById('page-info');
        if (el) el.textContent = msg;
    }

    updateFileName(el, name, def) {
        if (el) el.textContent = name || def;
    }

    clearContainer() {
        this.container.innerHTML = '';
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
                <button class="page-export-btn" data-page="${n}" title="Export page ${n}">
                    💾 Save Page ${n}
                </button>
            </div>
        `;
        
        w.querySelector('.page-export-btn').onclick = (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('exportSinglePage', { 
                detail: { pageNum: parseInt(e.target.dataset.page) } 
            }));
        };
        
        this.container.appendChild(w);
        return w;
    }

    showSavingIndicator(msg = 'Processing...') {
        if (this.indicator) this.indicator.remove();
        
        this.indicator = document.createElement('div');
        this.indicator.className = 'saving-indicator';
        this.indicator.innerHTML = `
            <div class="saving-content">
                <div class="saving-spinner"></div>
                <div class="saving-message">${msg}</div>
            </div>
        `;
        
        document.body.appendChild(this.indicator);
        this.indicator.offsetHeight; // Force reflow
        this.indicator.classList.add('active');
        return this.indicator;
    }

    removeSavingIndicator(ind) {
        if (ind) {
            ind.classList.remove('active');
            setTimeout(() => ind.remove(), 200);
            if (ind === this.indicator) this.indicator = null;
        }
    }
}