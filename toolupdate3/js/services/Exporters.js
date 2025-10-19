export class Exporters {
    constructor(pdf) {
        this.pdf = pdf;
        this.cache = new Map();
    }

    async _toDataURL(canvas, pageNum) {
        if (this.cache.has(pageNum)) return this.cache.get(pageNum);

        const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.85));
        const reader = new FileReader();
        const url = await new Promise(res => {
            reader.onloadend = () => res(reader.result);
            reader.readAsDataURL(blob);
        });

        this.cache.set(pageNum, url);
        return url;
    }

    _getStyles(overlay, baseVw) {
        const os = getComputedStyle(overlay);
        const ts = getComputedStyle(overlay.querySelector('.overlay-text'));
        const fontSize = parseFloat(overlay.style.fontSize) || 100;

        return {
            left: overlay.style.left,
            top: overlay.style.top,
            width: overlay.style.width,
            height: overlay.style.height,
            'background-color': os.backgroundColor,
            'border-color': os.borderColor,
            color: ts.color,
            'font-size': `${((fontSize / 100) * baseVw / baseVw) * 100}%`
        };
    }

    _overlayToHTML(overlay, baseVw) {
        const textEl = overlay.querySelector('.overlay-text');
        if (!textEl) return '';

        const styles = this._getStyles(overlay, baseVw);
        const styleStr = Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';');
        
        return `<div class="overlay" style="${styleStr}"><div class="overlay-text">${textEl.innerHTML || ''}</div></div>`;
    }

    async _generatePageHTML(wrapper, pageNum) {
        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return '';

        const imageData = await this._toDataURL(canvas, pageNum);
        const baseVw = wrapper.clientWidth / 100;
        const overlays = Array.from(wrapper.querySelectorAll('.overlay'))
            .map(o => this._overlayToHTML(o, baseVw))
            .filter(h => h)
            .join('\n    ');

        return `<div class="page-wrapper" style="aspect-ratio: ${canvas.width / canvas.height};">
    <img src="${imageData}" class="bg-image" alt="PDF Page ${pageNum}" loading="lazy">
    ${overlays}
</div>`;
    }

    async _generateBody(indicator) {
        const wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
        const total = wrappers.length;
        const pages = [];

        for (let i = 0; i < total; i += 3) {
            const batch = wrappers.slice(i, i + 3);
            indicator.textContent = `Processing pages ${i + 1}-${Math.min(i + 3, total)} of ${total}...`;

            const results = await Promise.all(
                batch.map((w, idx) => this._generatePageHTML(w, i + idx + 1))
            );

            pages.push(...results);
            await new Promise(r => setTimeout(r, 0));
        }

        return pages.filter(h => h).join('\n');
    }

    _buildHTML(title, fontBase64, body) {
        const fontFace = fontBase64 
            ? `@font-face{font-family:'Bookerly';src:url(data:font/ttf;base64,${fontBase64}) format('truetype');}`
            : '';

        const spacing = document.querySelector('.merged-text-block')
            ? getComputedStyle(document.querySelector('.merged-text-block')).marginBottom
            : '0.4em';

        const css = `${fontFace}*{box-sizing:border-box}body{margin:0;background:#e9e9e9}main{margin:0 auto;max-width:100%}.page-wrapper{position:relative;width:100%;height:auto;margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:0;font-size:1vw}.bg-image{display:block;width:100%;height:auto}.overlay{position:absolute;border:.1vw solid;font-family:'Bookerly',serif;line-height:1.15;overflow:hidden;display:flex;align-items:center;white-space:pre-wrap;word-wrap:break-word;border-radius:.3vw}.overlay-text{width:100%;text-align:justify}.merged-text-block:not(:last-child){margin-bottom:${spacing}}`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - View</title>
    <style>${css}</style>
</head>
<body>
    <main>${body}</main>
</body>
</html>`;
    }

    async html(name, pageManager) {
        const indicator = pageManager.showSavingIndicator('Initializing...');
        
        try {
            indicator.textContent = 'Loading font...';
            const font = await this.pdf.loadFont();
            
            const body = await this._generateBody(indicator);
            
            indicator.textContent = 'Building document...';
            const html = this._buildHTML(name, font, body);
            
            indicator.textContent = 'Saving...';
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}_view.html`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.cache.clear();
        } catch (e) {
            console.error('HTML Export Error:', e);
            alert(`Error: ${e.message}`);
        } finally {
            pageManager.removeSavingIndicator(indicator);
        }
    }

    async print(pageManager) {
        const indicator = pageManager.showSavingIndicator('Preparing for print...');
        
        try {
            await this.pdf.renderAllQueuedPages();
            await new Promise(r => setTimeout(r, 100));
            
            pageManager.removeSavingIndicator(indicator);
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            
            window.print();
        } catch (e) {
            console.error('Print Error:', e);
            alert('Could not prepare for print. See console.');
        }
    }
}