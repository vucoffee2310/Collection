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
  
  calculateOptimalSize(overlay) {
    const txt = overlay.querySelector('.overlay-text');
    if (!txt?.innerHTML.trim()) return;
    
    const w = overlay.clientWidth;
    const targetHeight = parseFloat(overlay.dataset.targetHeight) || overlay.clientHeight;
    
    if (w <= 0 || targetHeight <= 0) return;
    
    const key = `${w.toFixed(0)}x${targetHeight.toFixed(0)}:${txt.innerHTML.length}`;
    
    if (this.cache.has(key)) {
      overlay.style.fontSize = toPx(this.cache.get(key));
      overlay.offsetHeight; // Force reflow
      return;
    }
    
    const originalHeight = overlay.style.height;
    overlay.style.height = toPx(targetHeight);
    overlay.offsetHeight; // Force reflow
    
    const size = this._findOptimal(txt, overlay, w, targetHeight);
    
    overlay.style.height = originalHeight;
    overlay.offsetHeight; // Force reflow
    
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, size);
    overlay.style.fontSize = toPx(size);
    overlay.offsetHeight; // Force reflow
  }
  
  _findOptimal(txt, cont, w, h) {
    const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
    txt.style.fontSize = '';
    txt.offsetHeight; // Force reflow
    
    const area = w * h;
    const len = txt.textContent.length || 1;
    let guess = Math.max(MIN, Math.min(MAX, Math.sqrt(area / len) * 1.8));
    
    txt.style.fontSize = toPx(guess);
    txt.offsetHeight; // Force reflow
    
    if (!checkOverflow(cont, 0.5)) {
      const upperBound = Math.min(MAX, guess * 1.5);
      txt.style.fontSize = toPx(upperBound);
      txt.offsetHeight; // Force reflow
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
      txt.offsetHeight; // Force reflow
      
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