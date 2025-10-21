import { forceUIUpdate, toPx } from '../utils.js';
import { CONFIG } from '../config.js';

export class Exporters {
  constructor(pdf){ this.pdf = pdf; }

  async _canvasToDataURL(canvas, format='image/webp', quality=0.85){
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Canvas to Blob failed'));
        const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob);
      }, format, quality);
    });
  }

  _extractOverlayHTML(overlay, wrapper){
    const os = getComputedStyle(overlay), textEl = overlay.querySelector('.overlay-text'); if (!textEl) return '';
    const ts = getComputedStyle(textEl), wr = wrapper.getBoundingClientRect(), or = overlay.getBoundingClientRect();
    const left = or.left - wr.left, top = or.top - wr.top, width = or.width, height = or.height;

    const fs = parseFloat(ts.fontSize), bw = parseFloat(os.borderWidth) || 1, br = parseFloat(os.borderRadius) || 3, pad = parseFloat(os.padding) || 1;
    const overlayStyles = [
      `position:absolute`,`left:${toPx(left)}`,`top:${toPx(top)}`,`width:${toPx(width)}`,`height:${toPx(height)}`,
      `background-color:${os.backgroundColor}`,`border:${toPx(bw)} solid ${os.borderColor}`,`border-radius:${toPx(br)}`,
      `color:${ts.color}`,`font-size:${toPx(fs)}`,`font-family:${ts.fontFamily}`,`font-weight:${ts.fontWeight}`,`font-style:${ts.fontStyle}`,
      `line-height:${ts.lineHeight}`,`padding:${toPx(pad)}`,`opacity:${os.opacity}`,`display:flex`,`flex-direction:column`,`overflow:hidden`,`white-space:pre-wrap`,`word-wrap:break-word`
    ];
    const cls = ['overlay'];
    const add = c => { if (overlay.classList.contains(c)) cls.push(c); };
    ['vertical-text','single-line-layout','content-code','content-list','content-table'].forEach(add);

    const textStyles = [`text-align:${ts.textAlign}`,`letter-spacing:${ts.letterSpacing}`,`word-spacing:${ts.wordSpacing}`];
    if (overlay.classList.contains('content-table')) textStyles.push(`width:100%`,`height:100%`,`overflow:auto`,`text-align:left`);
    else if (overlay.classList.contains('content-code')) textStyles.push(`width:100%`,`text-align:left`,`white-space:pre-wrap`,`font-family:'Courier New',Consolas,Monaco,monospace`,`font-weight:500`,`line-height:1.4`);
    else if (overlay.classList.contains('content-list')) textStyles.push(`width:100%`,`text-align:left`);
    else if (overlay.classList.contains('vertical-text')) textStyles.push(`writing-mode:vertical-rl`,`transform:rotate(180deg)`,`white-space:nowrap`,`text-align:center`,`line-height:1`,`align-self:center`);
    else if (overlay.classList.contains('single-line-layout')) textStyles.push(`width:auto`,`text-align:left`,`align-self:center`);
    else textStyles.push(`width:100%`,`align-self:stretch`);

    return `<div class="${cls.join(' ')}" style="${overlayStyles.join(';')}">
  <div class="overlay-text" style="${textStyles.join(';')}">${textEl.innerHTML || ''}</div>
</div>`;
  }

  async _generatePageHTML(wrapper, pageNum){
    const c = wrapper.querySelector('canvas'); if (!c) return '';
    const img = await this._canvasToDataURL(c);
    const overlaysHTML = Array.from(wrapper.querySelectorAll('.overlay')).map(ov => this._extractOverlayHTML(ov, wrapper)).filter(Boolean).join('\n    ');
    const ar = c.width / c.height, width = wrapper.clientWidth, height = wrapper.clientHeight;

    return `<div class="page-wrapper" style="position:relative;width:${toPx(width)};height:${toPx(height)};aspect-ratio:${ar};margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,0.3);line-height:0">
    <img src="${img}" class="bg-image" alt="PDF Page ${pageNum}" loading="lazy" style="display:block;width:100%;height:auto">
    ${overlaysHTML}
</div>`;
  }

  async _generateBodyHTML(indicator){
    const wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
    const total = wrappers.length, batch = 10, out = [];
    for (let i=0;i<total;i+=batch){
      const seg = wrappers.slice(i, i+batch);
      indicator.textContent = `Processing pages ${i+1}-${Math.min(i+batch,total)} of ${total}...`;
      const htmls = await Promise.all(seg.map((w, idx) => this._generatePageHTML(w, i+idx+1)));
      out.push(...htmls);
      if (i % 30 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return out.filter(Boolean).join('\n');
  }

  _buildCSS(fontBase64){
    const fontFace = fontBase64
      ? `@font-face{font-family:'${CONFIG.FONT.NAME}';src:url(data:font/ttf;base64,${fontBase64}) format('truetype');font-weight:100 900;font-style:normal;font-display:swap;}`
      : `/* Font not embedded */`;
    const spacing = getComputedStyle(document.body).getPropertyValue('--paragraph-spacing') || '0.4em';

    return `${fontFace}
*{box-sizing:border-box;margin:0;padding:0;}
body{margin:0;background:#e9e9e9;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
main{margin:0 auto;max-width:100%;padding:20px 0;}
.page-wrapper{position:relative;margin:0 auto 20px;box-shadow:0 2px 10px rgba(0,0,0,0.3);line-height:0;background:#fff;}
.bg-image{display:block;width:100%;height:auto;}
.overlay{position:absolute;border:1px solid;font-family:'${CONFIG.FONT.NAME}',sans-serif;line-height:1.15;overflow:hidden;display:flex;flex-direction:column;white-space:pre-wrap;word-wrap:break-word;border-radius:3px;padding:1px;transition:all .2s;}
.overlay:hover{box-shadow:0 0 12px rgba(52,152,219,.8);transform:scale(1.01);z-index:200;}
.overlay-text{cursor:text;user-select:text;}
.overlay.single-line-layout{justify-content:center;align-items:center;}
.overlay.single-line-layout .overlay-text{width:auto;text-align:left;align-self:center;}
.overlay.vertical-text{justify-content:center;align-items:center;}
.overlay.vertical-text .overlay-text{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;text-align:center;line-height:1;align-self:center;}
.overlay.content-code{font-family:'Courier New',Consolas,Monaco,monospace;font-weight:500;padding:6px;overflow-y:auto;justify-content:flex-start;align-items:flex-start;}
.overlay.content-code .overlay-text{width:100%;text-align:left;white-space:pre-wrap;font-family:'Courier New',Consolas,Monaco,monospace;font-weight:500;line-height:1.4;}
.overlay.content-list{justify-content:flex-start;align-items:flex-start;}
.overlay.content-list .overlay-text{width:100%;text-align:left;}
.list-item{margin-bottom:.4em;text-align:left;line-height:1.3;}
.list-item:last-child{margin-bottom:0;}
.overlay.content-table{overflow:auto;padding:4px;justify-content:flex-start;align-items:flex-start;}
.overlay.content-table .overlay-text{width:100%;height:100%;overflow:auto;text-align:left;line-height:1.25;}
.table-fit{display:inline-block;transform-origin:top left;}
.cell-fit{display:inline-block;transform-origin:top left;}
.data-table{width:100%;height:100%;border-collapse:collapse;font-size:inherit;line-height:inherit;border:1px solid;border-color:inherit;color:inherit;table-layout:fixed;}
.data-table colgroup col{box-sizing:border-box;}
.data-table th,.data-table td{padding:6px 8px;border:1px solid;border-color:inherit;text-align:left;vertical-align:middle;word-break:break-word;font-size:inherit;overflow:hidden;position:relative;}
.data-table th{font-weight:700;background:rgba(0,0,0,.15);white-space:normal;}
.data-table td{background:rgba(0,0,0,.05);}
.data-table tr:nth-child(even) td{background:rgba(0,0,0,.08);}
.image-placeholder{font-style:italic;opacity:.6;user-select:none;pointer-events:none;}
.merged-text-block:not(:last-child){margin-bottom:${spacing};}
@media print{
  body{background:none;} main{margin:0;padding:0;}
  .page-wrapper{box-shadow:none;margin:0;break-inside:avoid;}
  .page-wrapper+.page-wrapper{break-before:page;}
  .overlay,canvas{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
  .overlay.content-code,.overlay.content-table{overflow:visible;}
  .overlay.content-code .overlay-text{overflow:visible;white-space:pre-wrap;}
  .data-table{page-break-inside:avoid;}
  @page{size:auto;margin:0;}
}
@media (max-width:768px){
  main{padding:10px 0;} .page-wrapper{margin-bottom:15px;}
  .data-table th,.data-table td{padding:3px 4px;}
}`;
  }

  _buildHTMLDocument(title, fontBase64, body){
    const css = this._buildCSS(fontBase64);
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} - View</title><style>${css}</style></head><body><main>${body}</main></body></html>`;
  }

  async html(name, ui){
    const ind = ui.showSavingIndicator('Initializing HTML export...'); await forceUIUpdate();
    try {
      ind.textContent = 'Loading font...';
      const fontBase64 = await this.pdf.loadFont();
      const body = await this._generateBodyHTML(ind);
      ind.textContent = 'Building document...';
      const doc = this._buildHTMLDocument(name, fontBase64, body);
      ind.textContent = 'Saving file...';
      const blob = new Blob([doc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${name}_view.html`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('HTML Export Error:', e);
      alert(`Error saving as HTML: ${e.message}`);
    } finally {
      ui.removeSavingIndicator(ind);
    }
  }

  async print(ui){
    const ind = ui.showSavingIndicator('Preparing for print...'); await forceUIUpdate();
    try { await this.pdf.renderAllQueuedPages(); await new Promise(r=>setTimeout(r,100)); ui.removeSavingIndicator(ind); await forceUIUpdate(); window.print(); }
    catch (e){ console.error('Print Error:', e); alert('Could not prepare for print. See console for details.'); }
  }
}