import { readFile } from '../utils.js';

export class Exporters {
    constructor(pdf) {
        this.pdf = pdf;
        this.canvasCache = new Map();
    }

    async html(name, pageManager) {
        const ind = pageManager.showSavingIndicator('Processing...');
        try {
            const font = await this.pdf.loadFont();
            const body = await this._genBody(ind, pageManager);
            ind.textContent = 'Saving...';
            this._download(this._buildHTML(name, font, body), `${name}_view.html`);
            this.canvasCache.clear();
        } catch (e) {
            console.error('HTML Export Error:', e);
            alert('Error saving as HTML: ' + e.message);
        } finally {
            pageManager.removeSavingIndicator(ind);
        }
    }

    async _genBody(ind, pageManager) {
        const wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
        const totalPages = wrappers.length;
        const batchSize = 10;
        const results = [];
        
        for (let i = 0; i < totalPages; i += batchSize) {
            const batch = wrappers.slice(i, i + batchSize);
            
            const batchResults = await Promise.all(
                batch.map(async (w, idx) => {
                    const pageNum = i + idx + 1;
                    ind.textContent = `Page ${pageNum} / ${totalPages}`;
                    
                    const c = w.querySelector('canvas');
                    if (!c) return '';
                    
                    const bg = await this._canvasToUrl(c, pageNum);
                    const ovs = this._genOverlays(w);
                    
                    return `<div class="page-wrapper" style="aspect-ratio: ${c.width / c.height};">
    <img src="${bg}" class="bg-image" alt="PDF Page ${pageNum}" loading="lazy">
    ${ovs}
</div>`;
                })
            );
            
            results.push(...batchResults);
        }
        
        return results.join('');
    }

    async _canvasToUrl(c, pageNum) {
        if (this.canvasCache.has(pageNum)) {
            return this.canvasCache.get(pageNum);
        }

        const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
        if (!blob) throw new Error('Canvas to Blob conversion failed.');
        
        const url = await readFile(blob, 'readAsDataURL');
        this.canvasCache.set(pageNum, url);
        return url;
    }

    _genOverlays(w) {
        const baseVw = w.clientWidth / 100;
        return Array.from(w.querySelectorAll('.overlay'))
            .map(o => this._ovToHTML(o, baseVw))
            .join('\n    ');
    }

    _ovToHTML(o, baseVw) {
        const cs = getComputedStyle(o);
        const txt = o.querySelector('.overlay-text');
        if (!txt) return '';
        const ts = getComputedStyle(txt);

        const curSize = parseFloat(o.style.fontSize) || 100;
        const fsPct = ((curSize / 100) * baseVw / baseVw) * 100;

        const styles = {
            left: o.style.left, 
            top: o.style.top, 
            width: o.style.width, 
            height: o.style.height,
            'background-color': cs.backgroundColor, 
            'border-color': cs.borderColor,
            color: ts.color, 
            'font-size': `${fsPct}%`
        };
        const inline = Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';');
        
        return `<div class="overlay" style="${inline}"><div class="overlay-text">${txt.innerHTML || ''}</div></div>`;
    }

    _buildHTML(name, font, body) {
        const ff = font ? `@font-face{font-family:'Bookerly';src:url(data:font/ttf;base64,${font}) format('truetype');}` : '';
        const live = document.querySelector('.merged-text-block');
        const spacing = live ? getComputedStyle(live).marginBottom : '0.4em';

        const css = `${ff}*{box-sizing:border-box}body{margin:0;background:#e9e9e9}main{margin:0 auto;max-width:100%}.page-wrapper{position:relative;width:100%;height:auto;margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:0;font-size:1vw}.bg-image{display:block;width:100%;height:auto}.overlay{position:absolute;border:.1vw solid;font-family:'Bookerly',serif;line-height:1.15;overflow:hidden;display:flex;align-items:center;white-space:pre-wrap;word-wrap:break-word;border-radius:.3vw}.overlay-text{width:100%;text-align:justify}.merged-text-block:not(:last-child){margin-bottom:${spacing}}`;

        return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${name} - View</title><style>${css}</style></head><body><main>${body}</main></body></html>`;
    }
    
    _download(content, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: 'text/html' }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    async print(pageManager) {
        const ind = pageManager.showSavingIndicator('Processing...');
        try {
            await this.pdf.renderAllQueuedPages();
            await new Promise(r => setTimeout(r, 100));
            window.print();
        } catch (e) {
            console.error('Print Error:', e);
            alert('Could not prepare for print. See console for details.');
        } finally {
            pageManager.removeSavingIndicator(ind);
        }
    }

}
