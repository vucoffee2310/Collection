import { CONFIG } from '../config.js';
import { checkOverflow, toPx } from '../utils.js';

export class FontSizeCalculator {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 500;
  }
  
  clearCache() { 
    this.cache.clear();
  }
  
  _hash(html, w, h) {
    return `${w.toFixed(0)}x${h.toFixed(0)}:${html.length}`;
  }
  
  // ✨ Force browser to recalculate layout
  _forceReflow(element) {
    return element.offsetHeight;
  }
  
  calculateOptimalSize(overlay) {
    const txt = overlay.querySelector('.overlay-text');
    if (!txt?.innerHTML.trim()) return;
    
    const w = overlay.clientWidth;
    const targetHeight = parseFloat(overlay.dataset.targetHeight) || overlay.clientHeight;
    
    if (w <= 0 || targetHeight <= 0) return;
    
    const key = this._hash(txt.innerHTML, w, targetHeight);
    
    if (this.cache.has(key)) {
      this._apply(overlay, this.cache.get(key));
      return;
    }
    
    const originalHeight = overlay.style.height;
    overlay.style.height = toPx(targetHeight);
    this._forceReflow(overlay); // ✨ Force layout recalc
    
    const size = this._findOptimal(txt, overlay, w, targetHeight);
    
    overlay.style.height = originalHeight;
    this._forceReflow(overlay); // ✨ Force layout recalc
    
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, size);
    this._apply(overlay, size);
  }
  
  _apply(overlay, px) {
    const txt = overlay.querySelector('.overlay-text');
    if (txt) txt.style.fontSize = '';
    overlay.style.fontSize = toPx(px);
    this._forceReflow(overlay); // ✨ Force layout recalc
  }
  
  _findOptimal(txt, cont, w, h) {
    const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
    txt.style.fontSize = '';
    this._forceReflow(txt); // ✨ Force layout recalc
    
    const len = txt.textContent.length || 1;
    const area = w * h;
    
    let guess = Math.max(MIN, Math.min(MAX, Math.sqrt(area / len) * 1.8));
    
    txt.style.fontSize = toPx(guess);
    this._forceReflow(txt); // ✨ Force layout recalc
    
    if (!checkOverflow(cont, 0.5)) {
      let upperBound = Math.min(MAX, guess * 1.5);
      txt.style.fontSize = toPx(upperBound);
      this._forceReflow(txt); // ✨ Force layout recalc
      if (checkOverflow(cont, 0.5)) {
        txt.style.fontSize = '';
        return this._binarySearch(txt, cont, guess, upperBound);
      }
      txt.style.fontSize = '';
      return upperBound;
    }
    
    txt.style.fontSize = '';
    return this._binarySearch(txt, cont, MIN, guess);
  }
  
  _binarySearch(txt, cont, low, high) {
    let best = low;
    const tol = 0.5;
    const maxIter = 10;
    
    for (let i = 0; i < maxIter && high - low > tol; i++) {
      const mid = (low + high) / 2;
      txt.style.fontSize = toPx(mid);
      this._forceReflow(txt); // ✨ Force layout recalc before measurement
      
      if (checkOverflow(cont, 0.5)) {
        high = mid;
      } else {
        best = mid;
        low = mid;
      }
    }
    
    txt.style.fontSize = '';
    return best;
  }
}