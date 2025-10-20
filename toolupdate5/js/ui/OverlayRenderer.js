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
      
      // Queue for font size calculation (all except images)
      if ([CONFIG.CONTENT_TYPES.TEXT, CONFIG.CONTENT_TYPES.LIST, CONFIG.CONTENT_TYPES.CODE, CONFIG.CONTENT_TYPES.TABLE].includes(info.type)) {
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
    
    // Tables need fixed height for overflow scrolling
    const useFixedHeight = type === CONFIG.CONTENT_TYPES.TABLE;
    
    overlay.style.cssText = `
      left: ${toPx(pos.left)};
      top: ${toPx(pos.top)};
      width: ${toPx(pos.width)};
      height: ${useFixedHeight ? toPx(pos.height) : 'fit-content'};
    `.trim();
    
    const txt = this._createTextElement(info, type, pos);
    const del = this._createDeleteButton();
    
    overlay.append(txt, del);
    return overlay;
  }
  
  _createTextElement(info, type, pos) {
    const txt = document.createElement('div');
    txt.className = 'overlay-text';
    txt.contentEditable = type !== CONFIG.CONTENT_TYPES.IMAGE;
    txt.innerHTML = this._formatContent(info, pos);
    
    txt.addEventListener('blur', debounce(e => {
      const overlay = e.target.closest('.overlay');
      if (!overlay) return;
      
      const contentType = overlay.dataset.contentType;
      
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
      
      // Recalculate font size after edit
      if ([CONFIG.CONTENT_TYPES.TEXT, CONFIG.CONTENT_TYPES.LIST, CONFIG.CONTENT_TYPES.CODE, CONFIG.CONTENT_TYPES.TABLE].includes(contentType)) {
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
  
  _formatContent(info, pos) {
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
      
      [CONFIG.CONTENT_TYPES.TABLE]: () => this._formatTable(text, info.tableData, pos),
      
      [CONFIG.CONTENT_TYPES.IMAGE]: () => '<div class="image-placeholder">[Image]</div>',
      
      [CONFIG.CONTENT_TYPES.TEXT]: () => {
        if (text.includes('<div class="merged-text-block">')) return text;
        return escapeHtml(text || '');
      }
    };
    
    return (formatters[type] || formatters[CONFIG.CONTENT_TYPES.TEXT])();
  }
  
  _formatTable(text, tableData, pos) {
    let data = tableData;
    
    if (!data) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Failed to parse table data:', e);
        return text;
      }
    }
    
    if (!Array.isArray(data) || !data.length || !pos) return text;
    
    const numRows = data.length;
    const numCols = Math.max(0, ...data.map(row => (Array.isArray(row) ? row.length : 0)));
    
    if (numRows === 0 || numCols === 0) return text;
    
    const overlayPadding = 4; // As defined in overlays.css for .content-table
    const tableAreaWidth = pos.width - (overlayPadding * 2);
    const tableAreaHeight = pos.height - (overlayPadding * 2);
    
    const cellWidthPx = tableAreaWidth / numCols;
    const cellHeightPx = tableAreaHeight / numRows;
    
    return `<table class="data-table" style="position: relative;"><tbody>
      ${data.map((row, rowIdx) => {
        if (!Array.isArray(row)) return '';
        
        const tag = rowIdx === 0 ? 'th' : 'td';
        const cells = row.map((cell, colIdx) => {
          const escaped = escapeHtml(String(cell || ''));
          const withBreaks = escaped.replace(/\n/g, '<br>');
          
          const topPx = (rowIdx * cellHeightPx).toFixed(3);
          const leftPx = (colIdx * cellWidthPx).toFixed(3);
          
          const style = `style="position: absolute; top: ${topPx}px; left: ${leftPx}px; width: ${cellWidthPx.toFixed(3)}px; height: ${cellHeightPx.toFixed(3)}px;"`;
          
          return `<${tag} ${style}>${withBreaks || '&nbsp;'}</${tag}>`;
        }).join('');
        
        return `<tr>${cells}</tr>`;
      }).join('')}
    </tbody></table>`;
  }
  
  _extractTableToJSON(textElement) {
    const table = textElement.querySelector('.data-table');
    if (!table) return '[]';
    
    const rows = Array.from(table.querySelectorAll('tr'));
    const data = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      return cells.map(cell => {
        const html = cell.innerHTML.trim();
        const withNewlines = html.replace(/<br\s*\/?>/gi, '\n');
        const temp = document.createElement('div');
        temp.innerHTML = withNewlines;
        return temp.textContent || '';
      });
    });
    
    return JSON.stringify(data);
  }
}