import { forceUIUpdate, toPx } from '../utils.js';
import { CONFIG } from '../config.js';

export class Exporters {
  constructor(pdf) {
    this.pdf = pdf;
  }
  
  // Canvas to data URL conversion
  async _canvasToDataURL(canvas, format = 'image/webp', quality = 0.85) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('Canvas to Blob failed'));
          
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        format,
        quality
      );
    });
  }
  
  // Extract overlay with all computed styles
  _extractOverlayHTML(overlay, wrapper) {
    const overlayStyle = getComputedStyle(overlay);
    const textEl = overlay.querySelector('.overlay-text');
    if (!textEl) return '';
    
    const textStyle = getComputedStyle(textEl);
    const wrapperRect = wrapper.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    
    // Position relative to wrapper
    const left = overlayRect.left - wrapperRect.left;
    const top = overlayRect.top - wrapperRect.top;
    const width = overlayRect.width;
    const height = overlayRect.height;
    
    // Extract all relevant styles
    const fontSize = parseFloat(textStyle.fontSize);
    const borderWidth = parseFloat(overlayStyle.borderWidth) || 1;
    const borderRadius = parseFloat(overlayStyle.borderRadius) || 3;
    const padding = parseFloat(overlayStyle.padding) || 1;
    
    // Extract spacing properties
    const letterSpacing = textStyle.letterSpacing;
    const wordSpacing = textStyle.wordSpacing;
    const lineHeight = textStyle.lineHeight;
    
    // Detect layout variants
    const isVertical = overlay.classList.contains('vertical-text');
    const isSingleLine = overlay.classList.contains('single-line-layout');
    const isCode = overlay.classList.contains('content-code');
    const isList = overlay.classList.contains('content-list');
    const isTable = overlay.classList.contains('content-table');
    
    // Build overlay styles
    const overlayStyles = [
      `position:absolute`,
      `left:${toPx(left)}`,
      `top:${toPx(top)}`,
      `width:${toPx(width)}`,
      `height:${toPx(height)}`,
      `background-color:${overlayStyle.backgroundColor}`,
      `border:${toPx(borderWidth)} solid ${overlayStyle.borderColor}`,
      `border-radius:${toPx(borderRadius)}`,
      `color:${textStyle.color}`,
      `font-size:${toPx(fontSize)}`,
      `font-family:${textStyle.fontFamily}`,
      `font-weight:${textStyle.fontWeight}`,
      `font-style:${textStyle.fontStyle}`,
      `line-height:${lineHeight}`,
      `padding:${toPx(padding)}`,
      `opacity:${overlayStyle.opacity}`,
      `display:flex`,
      `flex-direction:column`,
      `overflow:hidden`,
      `white-space:pre-wrap`,
      `word-wrap:break-word`
    ];
    
    // Add type-specific styles
    if (isTable) {
      overlayStyles.push(
        `overflow:auto`,
        `padding:4px`,
        `justify-content:flex-start`,
        `align-items:flex-start`
      );
    } else if (isCode) {
      overlayStyles.push(
        `font-family:'Courier New',Consolas,Monaco,monospace`,
        `font-weight:500`,
        `padding:6px`,
        `overflow-y:auto`,
        `justify-content:flex-start`,
        `align-items:flex-start`
      );
    } else if (isList) {
      overlayStyles.push(
        `justify-content:flex-start`,
        `align-items:flex-start`
      );
    } else if (isVertical) {
      overlayStyles.push(
        `justify-content:center`,
        `align-items:center`
      );
    } else if (isSingleLine) {
      overlayStyles.push(
        `justify-content:center`,
        `align-items:center`
      );
    } else {
      overlayStyles.push(
        `justify-content:${overlayStyle.justifyContent || 'flex-start'}`,
        `align-items:${overlayStyle.alignItems || 'center'}`
      );
    }
    
    // Build text styles
    const textStyles = [
      `text-align:${textStyle.textAlign}`,
      `letter-spacing:${letterSpacing}`,
      `word-spacing:${wordSpacing}`
    ];
    
    // Add type-specific text styles
    if (isTable) {
      textStyles.push(
        `width:100%`,
        `height:100%`,
        `overflow:auto`,
        `text-align:left`
      );
    } else if (isCode) {
      textStyles.push(
        `width:100%`,
        `text-align:left`,
        `white-space:pre-wrap`,
        `font-family:'Courier New',Consolas,Monaco,monospace`,
        `font-weight:500`,
        `line-height:1.4`
      );
    } else if (isList) {
      textStyles.push(
        `width:100%`,
        `text-align:left`
      );
    } else if (isVertical) {
      textStyles.push(
        `writing-mode:vertical-rl`,
        `transform:rotate(180deg)`,
        `white-space:nowrap`,
        `text-align:center`,
        `line-height:1`,
        `align-self:center`
      );
    } else if (isSingleLine) {
      textStyles.push(
        `width:auto`,
        `text-align:left`,
        `align-self:center`
      );
    } else {
      textStyles.push(
        `width:100%`,
        `align-self:stretch`
      );
    }
    
    // Build class list
    const overlayClasses = ['overlay'];
    if (isVertical) overlayClasses.push('vertical-text');
    if (isSingleLine) overlayClasses.push('single-line-layout');
    if (isCode) overlayClasses.push('content-code');
    if (isList) overlayClasses.push('content-list');
    if (isTable) overlayClasses.push('content-table');
    
    return `<div class="${overlayClasses.join(' ')}" style="${overlayStyles.join(';')}">
  <div class="overlay-text" style="${textStyles.join(';')}">${textEl.innerHTML || ''}</div>
</div>`;
  }
  
  async _generatePageHTML(wrapper, pageNum) {
    const canvas = wrapper.querySelector('canvas');
    if (!canvas) return '';
    
    const imageData = await this._canvasToDataURL(canvas);
    
    const overlaysHTML = Array.from(wrapper.querySelectorAll('.overlay'))
      .map(ov => this._extractOverlayHTML(ov, wrapper))
      .filter(html => html)
      .join('\n    ');
    
    const aspectRatio = canvas.width / canvas.height;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    
    return `<div class="page-wrapper" style="position:relative;width:${toPx(width)};height:${toPx(height)};aspect-ratio:${aspectRatio};margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,0.3);line-height:0">
    <img src="${imageData}" class="bg-image" alt="PDF Page ${pageNum}" loading="lazy" style="display:block;width:100%;height:auto">
    ${overlaysHTML}
</div>`;
  }
  
  async _generateBodyHTML(indicator) {
    const wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
    const total = wrappers.length;
    const batchSize = 10;
    const pageHTMLs = [];
    
    for (let i = 0; i < total; i += batchSize) {
      const batch = wrappers.slice(i, i + batchSize);
      indicator.textContent = `Processing pages ${i + 1}-${Math.min(i + batchSize, total)} of ${total}...`;
      
      const results = await Promise.all(
        batch.map((wrapper, idx) => this._generatePageHTML(wrapper, i + idx + 1))
      );
      
      pageHTMLs.push(...results);
      
      if (i % 30 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return pageHTMLs.filter(html => html).join('\n');
  }
  
  // Build comprehensive CSS
  _buildCSS(fontBase64) {
    // Font face
    const fontFace = fontBase64 
      ? `@font-face {
  font-family: '${CONFIG.FONT.NAME}';
  src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`
      : `/* Font not embedded - using system fonts */`;
    
    // Get current spacing value
    const spacing = getComputedStyle(document.body).getPropertyValue('--paragraph-spacing') || '0.4em';
    
    return `${fontFace}

/* Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Body */
body {
  margin: 0;
  background: #e9e9e9;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* Main container */
main {
  margin: 0 auto;
  max-width: 100%;
  padding: 20px 0;
}

/* Page wrapper */
.page-wrapper {
  position: relative;
  margin: 0 auto 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  line-height: 0;
  background: white;
}

/* Background image */
.bg-image {
  display: block;
  width: 100%;
  height: auto;
}

/* Overlay base */
.overlay {
  position: absolute;
  border: 1px solid;
  font-family: '${CONFIG.FONT.NAME}', serif;
  line-height: 1.15;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  white-space: pre-wrap;
  word-wrap: break-word;
  border-radius: 3px;
  padding: 1px;
  transition: all 0.2s;
}

.overlay:hover {
  box-shadow: 0 0 12px rgba(52, 152, 219, 0.8);
  transform: scale(1.01);
  z-index: 200;
}

/* Overlay text */
.overlay-text {
  cursor: text;
  user-select: text;
}

/* Single-line layout */
.overlay.single-line-layout {
  justify-content: center;
  align-items: center;
}

.overlay.single-line-layout .overlay-text {
  width: auto;
  text-align: left;
  align-self: center;
}

/* Vertical text */
.overlay.vertical-text {
  justify-content: center;
  align-items: center;
}

.overlay.vertical-text .overlay-text {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  text-align: center;
  line-height: 1;
  align-self: center;
}

/* Code blocks */
.overlay.content-code {
  font-family: 'Courier New', Consolas, Monaco, monospace;
  font-weight: 500;
  padding: 6px;
  overflow-y: auto;
  justify-content: flex-start;
  align-items: flex-start;
}

.overlay.content-code .overlay-text {
  width: 100%;
  text-align: left;
  white-space: pre-wrap;
  font-family: 'Courier New', Consolas, Monaco, monospace;
  font-weight: 500;
  line-height: 1.4;
}

/* Lists */
.overlay.content-list {
  justify-content: flex-start;
  align-items: flex-start;
}

.overlay.content-list .overlay-text {
  width: 100%;
  text-align: left;
}

.list-item {
  margin-bottom: 0.4em;
  text-align: left;
  line-height: 1.3;
}

.list-item:last-child {
  margin-bottom: 0;
}

/* Tables */
.overlay.content-table {
  overflow: auto;
  padding: 4px;
  justify-content: flex-start;
  align-items: flex-start;
}

.overlay.content-table .overlay-text {
  width: 100%;
  height: 100%;
  overflow: auto;
  text-align: left;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
  line-height: 1.4;
  border: 1px solid currentColor;
  table-layout: auto;
}

.data-table th,
.data-table td {
  padding: 4px 6px;
  border: 1px solid currentColor;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
  min-width: 30px;
}

.data-table th {
  font-weight: 700;
  background: rgba(0, 0, 0, 0.15);
  white-space: normal;
  font-size: 10px;
}

.data-table td {
  background: rgba(0, 0, 0, 0.05);
  font-size: 10px;
}

.data-table tr:nth-child(even) td {
  background: rgba(0, 0, 0, 0.08);
}

/* Images */
.overlay.content-image {
  justify-content: center;
  align-items: center;
  background: rgba(100, 100, 100, 0.3);
  border-style: dashed;
}

.image-placeholder {
  font-style: italic;
  opacity: 0.6;
  user-select: none;
  pointer-events: none;
}

/* Merged text blocks */
.merged-text-block:not(:last-child) {
  margin-bottom: ${spacing};
}

/* Print styles */
@media print {
  body {
    background: none;
  }
  
  main {
    margin: 0;
    padding: 0;
  }
  
  .page-wrapper {
    box-shadow: none;
    margin: 0;
    break-inside: avoid;
  }
  
  .page-wrapper + .page-wrapper {
    break-before: page;
  }
  
  .overlay,
  canvas {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  .overlay.content-code,
  .overlay.content-table {
    overflow: visible;
  }
  
  .overlay.content-code .overlay-text {
    overflow: visible;
    white-space: pre-wrap;
  }
  
  .data-table {
    page-break-inside: avoid;
  }
  
  @page {
    size: auto;
    margin: 0;
  }
}

/* Responsive */
@media (max-width: 768px) {
  main {
    padding: 10px 0;
  }
  
  .page-wrapper {
    margin-bottom: 15px;
  }
  
  .data-table {
    font-size: 9px;
  }
  
  .data-table th,
  .data-table td {
    padding: 3px 4px;
  }
}`;
  }
  
  _buildHTMLDocument(title, fontBase64, bodyHTML) {
    const css = this._buildCSS(fontBase64);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - View</title>
  <style>
${css}
  </style>
</head>
<body>
  <main>${bodyHTML}</main>
</body>
</html>`;
  }
  
  async html(name, pageManager) {
    const indicator = pageManager.showSavingIndicator('Initializing HTML export...');
    await forceUIUpdate();
    
    try {
      indicator.textContent = 'Loading font...';
      const fontBase64 = await this.pdf.loadFont();
      
      const bodyHTML = await this._generateBodyHTML(indicator);
      
      indicator.textContent = 'Building document...';
      const htmlDocument = this._buildHTMLDocument(name, fontBase64, bodyHTML);
      
      indicator.textContent = 'Saving file...';
      
      const blob = new Blob([htmlDocument], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_view.html`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('HTML Export Error:', error);
      alert(`Error saving as HTML: ${error.message}`);
    } finally {
      pageManager.removeSavingIndicator(indicator);
    }
  }
  
  async print(pageManager) {
    const indicator = pageManager.showSavingIndicator('Preparing for print...');
    await forceUIUpdate();
    
    try {
      await this.pdf.renderAllQueuedPages();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      pageManager.removeSavingIndicator(indicator);
      await forceUIUpdate();
      
      window.print();
    } catch (error) {
      console.error('Print Error:', error);
      alert('Could not prepare for print. See console for details.');
    }
  }
}