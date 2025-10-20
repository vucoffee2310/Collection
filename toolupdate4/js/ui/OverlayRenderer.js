import { CONFIG } from '../config.js';
import { calculateOverlayPosition, toPx, debounce, escapeHtml } from '../utils.js';

export class OverlayRenderer {
  constructor(state, fontCalc) {
    this.state = state;
    this.fontCalc = fontCalc;
  }
  
  renderPageOverlays(wrapper, page, dims, data) {
    const pageData = data[`page_${page}`];
    if (!pageData) return;
    
    wrapper.querySelectorAll('.overlay').forEach(el => el.remove());
    
    const coordOrder = this.state.getPageCoordinateOrder(page);
    const frag = document.createDocumentFragment();
    const toCalculate = [];
    
    Object.entries(pageData).forEach(([coords, info]) => {
      const overlay = this._createOverlay(coords, info, page, dims, coordOrder);
      frag.appendChild(overlay);
      
      if ([CONFIG.CONTENT_TYPES.TEXT, CONFIG.CONTENT_TYPES.LIST, CONFIG.CONTENT_TYPES.CODE].includes(info.type)) {
        toCalculate.push(overlay);
      }
    });
    
    wrapper.appendChild(frag);
    requestAnimationFrame(() => toCalculate.forEach(ov => this.fontCalc.calculateOptimalSize(ov)));
  }
  
  _createOverlay(coords, info, page, dims, coordOrder) {
    const overlay = document.createElement('div');
    const pos = calculateOverlayPosition({
      coords,
      containerWidth: dims.width,
      containerHeight: dims.height,
      minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
      coordOrder
    });
    
    const type = info.type || CONFIG.CONTENT_TYPES.TEXT;
    
    const isVertical = type === CONFIG.CONTENT_TYPES.TEXT && 
                       pos.width > 0 && 
                       (pos.height / pos.width) > CONFIG.OVERLAY.VERTICAL_THRESHOLD;
    
    const isSingleLine = type === CONFIG.CONTENT_TYPES.TEXT &&
                         !info.text.includes('<div') && 
                         !info.text.includes('\n');
    
    Object.assign(overlay.dataset, {
      coords,
      pageNum: page,
      targetHeight: pos.height,
      contentType: type
    });
    
    const classes = ['overlay', `content-${type}`];
    if (isVertical) classes.push('vertical-text');
    if (isSingleLine) classes.push('single-line-layout');
    overlay.className = classes.join(' ');
    
    const useFixedHeight = type === CONFIG.CONTENT_TYPES.TABLE;
    
    overlay.style.cssText = `
      left: ${toPx(pos.left)};
      top: ${toPx(pos.top)};
      width: ${toPx(pos.width)};
      height: ${useFixedHeight ? toPx(pos.height) : 'fit-content'};
    `.trim();
    
    const txt = this._createTextElement(info, type);
    const del = this._createDeleteButton();
    
    overlay.append(txt, del);
    return overlay;
  }
  
  _createTextElement(info, type) {
    const txt = document.createElement('div');
    txt.className = 'overlay-text';
    txt.contentEditable = type !== CONFIG.CONTENT_TYPES.IMAGE;
    txt.innerHTML = this._formatContent(info);
    
    txt.addEventListener('blur', debounce(e => {
      const overlay = e.target.closest('.overlay');
      if (!overlay) return;
      
      const contentType = overlay.dataset.contentType;
      
      // ✨ FIXED: For tables, extract back to JSON
      let newText;
      if (contentType === CONFIG.CONTENT_TYPES.TABLE) {
        newText = this._extractTableToJSON(e.target);
      } else if (contentType === CONFIG.CONTENT_TYPES.CODE) {
        newText = e.target.textContent;
      } else if (e.target.querySelector('.merged-text-block')) {
        newText = e.target.innerHTML;
      } else {
        newText = e.target.innerText;
      }
      
      this.state.updateOverlayText(overlay.dataset.pageNum, overlay.dataset.coords, newText);
      
      if ([CONFIG.CONTENT_TYPES.TEXT, CONFIG.CONTENT_TYPES.LIST, CONFIG.CONTENT_TYPES.CODE].includes(contentType)) {
        this.fontCalc.calculateOptimalSize(overlay);
      }
    }, 500));
    
    return txt;
  }
  
  _createDeleteButton() {
    const del = document.createElement('button');
    del.className = 'delete-overlay-btn';
    del.innerHTML = '&times;';
    del.title = 'Delete this overlay';
    
    del.addEventListener('click', e => {
      const overlay = e.target.closest('.overlay');
      if (overlay && confirm('Delete this overlay?')) {
        this.state.deleteOverlay(overlay.dataset.pageNum, overlay.dataset.coords);
        overlay.remove();
      }
    });
    
    return del;
  }
  
  _formatContent(info) {
    const { text, type } = info;
    
    const formatters = {
      [CONFIG.CONTENT_TYPES.CODE]: () => escapeHtml(text || ''),
      
      [CONFIG.CONTENT_TYPES.LIST]: () => {
        if (text.includes('<div class="list-item">')) return text;
        return text.split('\n')
          .filter(line => line.trim())
          .map(line => `<div class="list-item">${escapeHtml(line)}</div>`)
          .join('');
      },
      
      // ✨ FIXED: Parse JSON to get 2D array
      [CONFIG.CONTENT_TYPES.TABLE]: () => this._formatTable(text, info.tableData),
      
      [CONFIG.CONTENT_TYPES.IMAGE]: () => '<div class="image-placeholder">[Image]</div>',
      
      [CONFIG.CONTENT_TYPES.TEXT]: () => {
        if (text.includes('<div class="merged-text-block">')) return text;
        return escapeHtml(text || '');
      }
    };
    
    return (formatters[type] || formatters[CONFIG.CONTENT_TYPES.TEXT])();
  }
  
  // ✨ FIXED: Format table from 2D array
  _formatTable(text, tableData) {
    // Try to use tableData first (original array)
    let data = tableData;
    
    // If not available, try to parse from text (JSON string)
    if (!data) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Failed to parse table data:', e);
        return text;
      }
    }
    
    if (!Array.isArray(data) || !data.length) return text;
    
    // Generate HTML table from 2D array
    return `<table class="data-table">
      ${data.map((row, rowIdx) => {
        if (!Array.isArray(row)) return '';
        
        const tag = rowIdx === 0 ? 'th' : 'td';
        const cells = row.map(cell => {
          // ✨ Convert cell content: escape HTML, then convert \n to <br>
          const escaped = escapeHtml(String(cell || ''));
          const withBreaks = escaped.replace(/\n/g, '<br>');
          return `<${tag}>${withBreaks || '&nbsp;'}</${tag}>`;
        }).join('');
        
        return `<tr>${cells}</tr>`;
      }).join('')}
    </table>`;
  }
  
  // ✨ NEW: Extract HTML table back to 2D array JSON
  _extractTableToJSON(textElement) {
    const table = textElement.querySelector('.data-table');
    if (!table) return '[]';
    
    const rows = Array.from(table.querySelectorAll('tr'));
    const data = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => {
        // Get innerHTML to preserve <br> tags, then convert to \n
        const html = cell.innerHTML.trim();
        const withNewlines = html.replace(/<br\s*\/?>/gi, '\n');
        // Remove HTML tags and decode entities
        const temp = document.createElement('div');
        temp.innerHTML = withNewlines;
        return temp.textContent || '';
      });
    });
    
    return JSON.stringify(data);
  }
}