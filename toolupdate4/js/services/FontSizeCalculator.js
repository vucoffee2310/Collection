import { CONFIG } from '../config.js';

export class FontSizeCalculator {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 500;
  }
  
  clearCache() { 
    this.cache.clear();
  }
  
  _hash(html, w, minH) {
    return `${w.toFixed(0)}x${minH.toFixed(0)}:${html.length}`;
  }
  
  calculateOptimalSize(overlay) {
    const txt = overlay.querySelector('.overlay-text');
    if (!txt?.innerHTML.trim()) return;
    
    const { clientWidth: w, clientHeight: minH } = overlay;
    
    if (w <= 0) return;
    
    const key = this._hash(txt.innerHTML, w, minH);
    
    if (this.cache.has(key)) {
      this._apply(txt, this.cache.get(key));
      return;
    }
    
    const size = this._findOptimal(txt, overlay);
    
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, size);
    this._apply(txt, size);
  }
  
  // Apply font size directly to text element in pixels
  _apply(txt, px) {
    txt.style.fontSize = `${px}px`;
  }
  
  _findOptimal(txt, cont) {
    const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
    txt.style.fontSize = '';
    
    const len = txt.textContent.length || 1;
    const area = cont.clientWidth * cont.clientHeight;
    
    let guess = Math.max(MIN, Math.min(MAX, Math.sqrt(area / len) * 1.8));
    
    txt.style.fontSize = `${guess}px`;
    
    // Check only width overflow (height is auto)
    if (!this._checkWidthOverflow(cont)) {
      let upperBound = Math.min(MAX, guess * 1.5);
      txt.style.fontSize = `${upperBound}px`;
      if (this._checkWidthOverflow(cont)) {
        return this._binarySearch(txt, cont, guess, upperBound);
      }
      txt.style.fontSize = '';
      return upperBound;
    }
    
    return this._binarySearch(txt, cont, MIN, guess);
  }
  
  _binarySearch(txt, cont, low, high) {
    let best = low;
    const tol = 0.5;
    const maxIter = 10;
    
    for (let i = 0; i < maxIter && high - low > tol; i++) {
      const mid = (low + high) / 2;
      txt.style.fontSize = `${mid}px`;
      
      if (this._checkWidthOverflow(cont)) {
        high = mid;
      } else {
        best = mid;
        low = mid;
      }
    }
    
    txt.style.fontSize = '';
    return best;
  }
  
  // Only check horizontal overflow (height grows naturally)
  _checkWidthOverflow(el) {
    return el.scrollWidth > el.clientWidth + 0.5;
  }
}