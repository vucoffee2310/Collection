import { CONFIG } from "../config.js";
import { checkOverflow, toPx } from "../utils.js";
import { TableLayout } from "./TableLayout.js";

export class FontSizeCalculator {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 500;
    this.tableLayout = new TableLayout();
  }

  clearCache() {
    this.cache.clear();
    this.tableLayout.clearCache();
  }

  calculateOptimalSize(overlay) {
    const type = overlay.dataset.contentType;
    if (type === CONFIG.CONTENT_TYPES.TABLE) {
      return this.tableLayout.optimizeTable(overlay);
    }

    const txt = overlay.querySelector(".overlay-text");
    if (!txt?.innerHTML.trim()) return;

    const w = overlay.clientWidth;
    const h = parseFloat(overlay.dataset.targetHeight) || overlay.clientHeight;
    if (w <= 0 || h <= 0) return;

    const key = `${w | 0}x${h | 0}:${txt.innerHTML.length}`;
    if (this.cache.has(key)) {
      overlay.style.fontSize = toPx(this.cache.get(key));
      overlay.offsetHeight;
      return;
    }

    const prev = overlay.style.height;
    overlay.style.height = toPx(h);
    overlay.offsetHeight;
    const size = this._fitBlock(txt, overlay, w, h);
    overlay.style.height = prev;
    overlay.offsetHeight;

    if (this.cache.size >= this.maxCacheSize) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, size);
    overlay.style.fontSize = toPx(size);
    overlay.offsetHeight;
  }

  _fitBlock(txt, cont, w, h) {
    const { MIN_FONT_SIZE: MIN, MAX_FONT_SIZE: MAX } = CONFIG.OVERLAY;
    txt.style.fontSize = "";
    txt.offsetHeight;
    const len = txt.textContent.length || 1;
    let g = Math.max(MIN, Math.min(MAX, Math.sqrt((w * h) / len) * 1.8));
    txt.style.fontSize = toPx(g);
    txt.offsetHeight;
    if (!checkOverflow(cont, 0.5)) {
      const up = Math.min(MAX, g * 1.5);
      txt.style.fontSize = toPx(up);
      txt.offsetHeight;
      return checkOverflow(cont, 0.5) ? this._bin(txt, cont, g, up) : up;
    }
    return this._bin(txt, cont, MIN, g);
  }

  _bin(txt, cont, lo, hi) {
    let best = lo;
    for (let i = 0; i < 10 && hi - lo > 0.5; i++) {
      const mid = (lo + hi) / 2;
      txt.style.fontSize = toPx(mid);
      txt.offsetHeight;
      checkOverflow(cont, 0.5) ? (hi = mid) : (best = lo = mid);
    }
    txt.style.fontSize = "";
    return best;
  }
}