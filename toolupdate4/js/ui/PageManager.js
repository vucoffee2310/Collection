export class PageManager {
  constructor() {
    this.container = document.getElementById('pdf-container');
  }
  
  showLoading(message = 'Loading...') {
    if (this.container) {
      this.container.innerHTML = `<div class="loading">${message}</div>`;
    }
  }
  
  clearContainer() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
  
  updatePageInfo(text) {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) pageInfo.textContent = text;
  }
  
  updateFileName(element, fileName, defaultText) {
    if (!element) return;
    element.textContent = fileName || defaultText;
  }
  
  createPageWrapper(pageNum, viewport) {
    const wrapper = document.createElement('div');
    wrapper.id = `page-wrapper-${pageNum}`;
    wrapper.className = 'page-wrapper page-placeholder';
    
    // Set aspect ratio to maintain proportions at full width
    const aspectRatio = viewport.width / viewport.height;
    wrapper.style.aspectRatio = aspectRatio.toFixed(4);
    
    wrapper.innerHTML = `<span>Page ${pageNum}</span>`;
    
    this.container?.appendChild(wrapper);
    return wrapper;
  }
  
  showSavingIndicator(message) {
    const indicator = document.createElement('div');
    indicator.className = 'saving-indicator';
    indicator.innerHTML = `
      <div class="saving-content">
        <div class="saving-spinner"></div>
        <div class="saving-message">${message}</div>
      </div>
    `;
    document.body.appendChild(indicator);
    
    requestAnimationFrame(() => {
      indicator.classList.add('active');
    });
    
    return indicator.querySelector('.saving-message');
  }
  
  removeSavingIndicator(messageElement) {
    const indicator = messageElement?.closest('.saving-indicator');
    if (indicator) {
      indicator.classList.remove('active');
      setTimeout(() => indicator.remove(), 200);
    }
  }
}