import { CONFIG } from '../config.js';
import { calculateOverlayPosition, debounce } from '../utils.js';

export class OverlayRenderer {
  constructor(state, fontCalc) {
    this.state = state;
    this.fontCalc = fontCalc;
  }
  
  renderPageOverlays(wrapper, page, dims, data) {
    const pageData = data[`page_${page}`];
    if (!pageData) return;
    
    // Remove old overlays
    wrapper.querySelectorAll('.overlay').forEach(el => el.remove());
    
    const coordOrder = this.state.getPageCoordinateOrder(page);
    const frag = document.createDocumentFragment();
    const toCalculate = [];
    
    Object.entries(pageData).forEach(([coords, info]) => {
      const overlay = this._create(coords, info, page, wrapper, coordOrder);
      if (overlay) {
        frag.appendChild(overlay);
        toCalculate.push(overlay);
      }
    });
    
    wrapper.appendChild(frag);
    
    requestAnimationFrame(() => {
      toCalculate.forEach(ov => this.fontCalc.calculateOptimalSize(ov));
    });
  }
  
  _create(coords, info, page, wrapper, coordOrder) {
    // Get wrapper's CURRENT display dimensions (responsive)
    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    
    if (wrapperWidth <= 0 || wrapperHeight <= 0) return null;
    
    // Calculate position based on current wrapper size
    const pos = calculateOverlayPosition({
      coords,
      containerWidth: wrapperWidth,
      containerHeight: wrapperHeight,
      minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
      coordOrder
    });
    
    const overlay = document.createElement('div');
    overlay.dataset.coords = coords;
    overlay.dataset.pageNum = page;
    
    // Determine layout classes
    const isVertical = pos.width > 0 && (pos.height / pos.width) > CONFIG.OVERLAY.VERTICAL_THRESHOLD;
    const isSingleLine = !info.text.includes('<div') && !info.text.includes('\n');
    
    overlay.className = `overlay${isVertical ? ' vertical-text' : ''}${isSingleLine ? ' single-line-layout' : ''}`;
    
    // Use PERCENTAGES for responsive positioning
    const leftPercent = (pos.left / wrapperWidth) * 100;
    const topPercent = (pos.top / wrapperHeight) * 100;
    const widthPercent = (pos.width / wrapperWidth) * 100;
    const minHeightPercent = (pos.height / wrapperHeight) * 100;
    
    overlay.style.left = `${leftPercent}%`;
    overlay.style.top = `${topPercent}%`;
    overlay.style.width = `${widthPercent}%`;
    overlay.style.minHeight = `${minHeightPercent}%`;
    overlay.style.height = 'auto';
    
    // Create text element
    const txt = document.createElement('span');
    txt.className = 'overlay-text';
    txt.contentEditable = true;
    
    if (info.text.includes('<div')) {
      txt.innerHTML = info.text;
    } else {
      txt.textContent = info.text;
    }
    
    // Debounced text update
    const updateText = debounce(e => {
      const o = e.target.closest('.overlay');
      if (!o) return;
      
      const newText = e.target.querySelector('.merged-text-block') 
        ? e.target.innerHTML 
        : e.target.innerText;
      
      this.state.updateOverlayText(o.dataset.pageNum, o.dataset.coords, newText);
      this.fontCalc.calculateOptimalSize(o);
    }, 500);
    
    txt.addEventListener('blur', updateText);
    
    // Delete button
    const del = document.createElement('button');
    del.className = 'delete-overlay-btn';
    del.innerHTML = '&times;';
    del.title = 'Delete this overlay';
    del.addEventListener('click', e => {
      const o = e.target.closest('.overlay');
      if (o && confirm('Delete this overlay?')) {
        this.state.deleteOverlay(o.dataset.pageNum, o.dataset.coords);
        o.remove();
      }
    });
    
    overlay.append(txt, del);
    return overlay;
  }
}