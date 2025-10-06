export class UIManager {
    constructor(containerSelector = '#pdf-container') {
        this.container = document.querySelector(containerSelector);
    }
    
    showLoading(message) {
        if (this.container) {
            this.container.innerHTML = `<div class="loading">${message}</div>`;
        }
    }
    
    updatePageInfo(message) {
        const el = document.getElementById('page-info');
        if (el) el.textContent = message;
    }
    
    clearContainer() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    
    createPageWrapper(pageNum, viewport) {
        if (!this.container) return null;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'page-wrapper page-placeholder';
        wrapper.id = `page-wrapper-${pageNum}`;
        wrapper.dataset.pageNum = pageNum;
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.innerHTML = `<span>Loading page ${pageNum}...</span>`;
        this.container.appendChild(wrapper);
        
        return wrapper;
    }
    
    applyTheme(paletteKey) {
        const palette = CONFIG.COLOR_PALETTES[paletteKey];
        if (!palette) return;
        
        const styles = document.body.style;
        styles.setProperty('--overlay-bg', `rgba(${palette.background.join(',')}, 0.9)`);
        styles.setProperty('--overlay-text', `rgb(${palette.text.join(',')})`);
        styles.setProperty('--overlay-border', `rgb(${palette.border.join(',')})`);
    }
    
    showSavingIndicator() {
        const div = document.createElement('div');
        div.className = 'saving-indicator';
        div.textContent = 'Saving to PDF... Please wait.';
        document.body.appendChild(div);
        return div;
    }
    
    removeSavingIndicator(indicator) {
        indicator?.remove();
    }
}
