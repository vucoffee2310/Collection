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
    const type = overlay.dataset.contentType;
    
    // Use specialized calculator for tables
    if (type === CONFIG.CONTENT_TYPES.TABLE) {
      return this._calculateTableFontSize(overlay);
    }
    
    // Standard calculator for text, code, list
    const txt = overlay.querySelector('.overlay-text');
    if (!txt?.innerHTML.trim()) return;
    
    const w = overlay.clientWidth;
    const targetHeight = parseFloat(overlay.dataset.targetHeight) || overlay.clientHeight;
    
    if (w <= 0 || targetHeight <= 0) return;
    
    const key = `${w.toFixed(0)}x${targetHeight.toFixed(0)}:${txt.innerHTML.length}`;
    
    if (this.cache.has(key)) {
      overlay.style.fontSize = toPx(this.cache.get(key));
      overlay.offsetHeight;
      return;
    }
    
    const originalHeight = overlay.style.height;
    overlay.style.height = toPx(targetHeight);
    overlay.offsetHeight;
    
    const size = this._findOptimal(txt, overlay, w, targetHeight);
    
    overlay.style.height = originalHeight;
    overlay.offsetHeight;
    
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, size);
    overlay.style.fontSize = toPx(size);
    overlay.offsetHeight;
  }
  
  // Table-specific font size calculation using cell overflow detection
  _calculateTableFontSize(overlay) {
    const table = overlay.querySelector('.data-table');
    const targetHeight = parseFloat(overlay.dataset.targetHeight) || overlay.clientHeight;
    const targetWidth = overlay.clientWidth;
    const padding = 8; // overlay padding (4px × 2)
    
    if (!table || targetHeight <= 0 || targetWidth <= 0) return;
    
    const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
    const availableHeight = targetHeight - padding;
    const availableWidth = targetWidth - padding;
    
    // Cache key
    const rows = table.querySelectorAll('tr').length;
    const cols = table.querySelectorAll('tr:first-child th, tr:first-child td').length;
    const contentLength = table.textContent.length;
    const key = `table:${availableWidth.toFixed(0)}x${availableHeight.toFixed(0)}:${rows}x${cols}:${contentLength}`;
    
    if (this.cache.has(key)) {
      overlay.style.fontSize = toPx(this.cache.get(key));
      return;
    }
    
    // Smart initial estimate based on row count
    const avgRowHeight = availableHeight / rows;
    const cellPadding = 12; // Approximate vertical padding per cell
    const initialGuess = Math.max(MIN, Math.min(MAX, (avgRowHeight - cellPadding) * 0.5));
    
    // Binary search for optimal size
    const optimalSize = this._binarySearchTable(overlay, table, availableHeight, availableWidth, MIN, MAX, initialGuess);
    
    // Cache and apply
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, optimalSize);
    overlay.style.fontSize = toPx(optimalSize);
    overlay.offsetHeight;
  }
  
  // Binary search using table structure and cell overflow detection
  _binarySearchTable(overlay, table, targetHeight, targetWidth, min, max, initialGuess) {
    let best = min;
    let low = min;
    let high = max;
    const tolerance = 0.5;
    const maxIterations = 15;
    
    // Test initial guess first
    if (initialGuess) {
      overlay.style.fontSize = toPx(initialGuess);
      overlay.offsetHeight;
      table.offsetHeight;
      
      if (!this._tableOverflows(table, targetHeight, targetWidth)) {
        best = initialGuess;
        low = initialGuess;
      } else {
        high = initialGuess;
      }
    }
    
    // Binary search
    for (let i = 0; i < maxIterations && high - low > tolerance; i++) {
      const mid = (low + high) / 2;
      
      overlay.style.fontSize = toPx(mid);
      overlay.offsetHeight;
      table.offsetHeight;
      
      if (this._tableOverflows(table, targetHeight, targetWidth)) {
        high = mid;
      } else {
        best = mid;
        low = mid;
      }
    }
    
    // Apply with small safety margin
    return best * 0.98;
  }
  
  // Check overflow using native table/cell properties
  _tableOverflows(table, targetHeight, targetWidth) {
    const tolerance = 2;
    
    // Check table dimensions
    if (table.offsetHeight > targetHeight + tolerance || 
        table.scrollWidth > targetWidth + tolerance) {
      return true;
    }
    
    // Check individual cell overflow
    const cells = table.querySelectorAll('td, th');
    for (const cell of cells) {
      if (cell.scrollHeight > cell.clientHeight + 1 || 
          cell.scrollWidth > cell.clientWidth + 1) {
        return true;
      }
    }
    
    return false;
  }
  
  // Standard text/code/list font calculation
  _findOptimal(txt, cont, w, h) {
    const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
    txt.style.fontSize = '';
    txt.offsetHeight;
    
    const area = w * h;
    const len = txt.textContent.length || 1;
    let guess = Math.max(MIN, Math.min(MAX, Math.sqrt(area / len) * 1.8));
    
    txt.style.fontSize = toPx(guess);
    txt.offsetHeight;
    
    if (!checkOverflow(cont, 0.5)) {
      const upperBound = Math.min(MAX, guess * 1.5);
      txt.style.fontSize = toPx(upperBound);
      txt.offsetHeight;
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
      txt.offsetHeight;
      
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