export class PageManager {
    constructor() {
        this.container = document.querySelector('#pdf-container');
    }
    
    showLoading(msg) {
        if (this.container) this.container.innerHTML = `<div class="loading">${msg}</div>`;
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
        w.innerHTML = `<span>Loading page ${n}...</span>`;
        this.container?.appendChild(w);
        return w;
    }
    
    showSavingIndicator(msg = 'Saving... Please wait.') {
        const d = document.createElement('div');
        d.className = 'saving-indicator';
        d.textContent = msg;
        document.body.appendChild(d);
        return d;
    }
    
    removeSavingIndicator(ind) { 
        ind?.remove(); 
    }
}