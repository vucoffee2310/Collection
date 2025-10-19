import { CONFIG } from '../config.js';
import { calculateOverlayPosition, toPercent, debounce } from '../utils.js';

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
      const overlay = this._create(coords, info, page, dims.width, dims.height, coordOrder);
      frag.appendChild(overlay);
      toCalculate.push(overlay);
    });
    
    wrapper.appendChild(frag);
    
    requestAnimationFrame(() => {
      toCalculate.forEach(ov => this.fontCalc.calculateOptimalSize(ov));
    });
  }
  
  _create(coords, info, page, w, h, coordOrder) {
    if (w <= 0 || h <= 0) return document.createElement('div');
    
    // IMPROVED: More precise positioning calculation
    const pos = calculateOverlayPosition({
      coords,
      containerWidth: w,
      containerHeight: h,
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
    
    // IMPROVED: More precise positioning with sub-pixel accuracy
    const left = toPercent(pos.left, w);
    const top = toPercent(pos.top, h);
    const width = toPercent(pos.width, w);
    const height = toPercent(pos.height, h);
    
    overlay.style.cssText = `left:${left};top:${top};width:${width};height:${height}`;
    
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