import { forceUIUpdate } from '../utils.js';

export class Exporters {
  constructor(pdf) {
    this.pdf = pdf;
  }
  
  async _canvasToDataURL(canvas, format = 'image/webp', quality = 0.85) {
    // Use OffscreenCanvas if available for better performance
    if ('OffscreenCanvas' in window && canvas instanceof HTMLCanvasElement) {
      const offscreen = canvas.transferControlToOffscreen?.();
      if (offscreen) canvas = offscreen;
    }
    
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
  
  _extractOverlayHTML(overlay, baseVw) {
    const overlayStyle = getComputedStyle(overlay);
    const textEl = overlay.querySelector('.overlay-text');
    if (!textEl) return '';
    
    const textStyle = getComputedStyle(textEl);
    const fontSize = parseFloat(overlay.style.fontSize) || 100;
    const fontSizePercent = ((fontSize / 100) * baseVw / baseVw) * 100;
    
    const styles = [
      `left:${overlay.style.left}`,
      `top:${overlay.style.top}`,
      `width:${overlay.style.width}`,
      `height:${overlay.style.height}`,
      `background-color:${overlayStyle.backgroundColor}`,
      `border-color:${overlayStyle.borderColor}`,
      `color:${textStyle.color}`,
      `font-size:${fontSizePercent}%`
    ].join(';');
    
    return `<div class="overlay" style="${styles}"><div class="overlay-text">${textEl.innerHTML || ''}</div></div>`;
  }
  
  async _generatePageHTML(wrapper, pageNum) {
    const canvas = wrapper.querySelector('canvas');
    if (!canvas) return '';
    
    const imageData = await this._canvasToDataURL(canvas);
    const baseVw = wrapper.clientWidth / 100;
    
    const overlaysHTML = Array.from(wrapper.querySelectorAll('.overlay'))
      .map(ov => this._extractOverlayHTML(ov, baseVw))
      .filter(html => html)
      .join('\n    ');
    
    const aspectRatio = canvas.width / canvas.height;
    
    return `<div class="page-wrapper" style="aspect-ratio:${aspectRatio}">
    <img src="${imageData}" class="bg-image" alt="PDF Page ${pageNum}" loading="lazy">
    ${overlaysHTML}
</div>`;
  }
  
  async _generateBodyHTML(indicator) {
    const wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
    const total = wrappers.length;
    const batchSize = 10; // Increased from 3
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
  
  _buildHTMLDocument(title, fontBase64, bodyHTML) {
    const fontFace = fontBase64 
      ? `@font-face{font-family:'Bookerly';src:url(data:font/ttf;base64,${fontBase64}) format('truetype')}`
      : '';
    
    const spacing = getComputedStyle(document.body).getPropertyValue('--paragraph-spacing') || '0.4em';
    
    const css = `${fontFace}*{box-sizing:border-box}body{margin:0;background:#e9e9e9}main{margin:0 auto;max-width:100%}.page-wrapper{position:relative;width:100%;height:auto;margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:0;font-size:1vw}.bg-image{display:block;width:100%;height:auto}.overlay{position:absolute;border:.1vw solid;font-family:'Bookerly',serif;line-height:1.15;overflow:hidden;display:flex;align-items:center;white-space:pre-wrap;word-wrap:break-word;border-radius:.3vw}.overlay-text{width:100%;text-align:justify}.merged-text-block:not(:last-child){margin-bottom:${spacing}}`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - View</title>
<style>${css}</style>
</head>
<body><main>${bodyHTML}</main></body>
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