import { readFileAs } from '../utils.js';
export class HTMLExporter {
    constructor(pdfHandler) {
        this.pdfHandler = pdfHandler;
    }

    async save(fileName, uiManager) {
        const indicator = uiManager.showSavingIndicator('Preparing all pages for export...');
        try {
            const fontBase64 = await this.pdfHandler.loadFont();
            const bodyContent = await this._generateBodyContent(indicator);
            indicator.textContent = 'Generating HTML file...';
            const htmlContent = this._buildFinalHTML(fileName, fontBase64, bodyContent);
            this._download(htmlContent, `${fileName}_view.html`);
        } catch (error) {
            console.error('Error saving HTML:', error);
            alert('Error saving as HTML: ' + error.message);
        } finally {
            uiManager.removeSavingIndicator(indicator);
        }
    }

    async _generateBodyContent(indicator) {
        const pageWrappers = Array.from(document.querySelectorAll('.page-wrapper'));
        return (await Promise.all(pageWrappers.map(async (wrapper, i) => {
            indicator.textContent = `Processing page ${i + 1}/${pageWrappers.length}...`;
            const canvas = wrapper.querySelector('canvas');
            if (!canvas) return '';
            const bgImageSrc = await this._canvasToDataURL(canvas);
            const overlaysHTML = this._generateOverlaysHTML(wrapper);
            const aspectRatio = canvas.width / canvas.height;
            return `<div class="page-wrapper" style="aspect-ratio: ${aspectRatio};">
    <img src="${bgImageSrc}" class="bg-image" alt="PDF Page background">
    ${overlaysHTML}
</div>`;
        }))).join('');
    }

    async _canvasToDataURL(canvas) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.8));
        if (!blob) throw new Error('Canvas to Blob conversion failed.');
        return readFileAs(blob, 'readAsDataURL');
    }

    _generateOverlaysHTML(pageWrapper) {
        const baseVwInPx = pageWrapper.clientWidth / 100;
        return Array.from(pageWrapper.querySelectorAll('.overlay'))
            .map(overlay => this._overlayToHTML(overlay, baseVwInPx))
            .join('');
    }

    _overlayToHTML(overlay, baseVwInPx) {
        const computedStyle = getComputedStyle(overlay);
        const textSpan = overlay.querySelector('.overlay-text');
        if (!textSpan) return ''; 
        const textStyle = getComputedStyle(textSpan);

        const currentOverlayFontSize = parseFloat(overlay.style.fontSize) || 100;
        const currentFontSizePx = (currentOverlayFontSize / 100) * baseVwInPx;
        const fontSizePercent = (currentFontSizePx / baseVwInPx) * 100;

        const styles = {
            left: overlay.style.left, top: overlay.style.top,
            width: overlay.style.width, height: overlay.style.height,
            'background-color': computedStyle.backgroundColor,
            'border-color': computedStyle.borderColor,
            color: textStyle.color,
            'font-size': `${fontSizePercent}%`
        };
        const inlineStyles = Object.entries(styles).map(([k,v]) => `${k}:${v}`).join(';');
        
        // MODIFIED: Use innerHTML to preserve the merged paragraph structure
        const innerHTML = textSpan.innerHTML || '';
        return `<div class="overlay" style="${inlineStyles}">${innerHTML}</div>`;
    }

    _buildFinalHTML(fileName, fontBase64, bodyContent) {
        const fontFace = fontBase64 ? `@font-face{font-family:'Bookerly';src:url(data:font/ttf;base64,${fontBase64}) format('truetype');}` : '';
        
        // MODIFIED: Added styles for .merged-text-block to match the live preview
        const styles = `${fontFace}*{box-sizing:border-box}body{margin:0;background:#555}main{margin:0 auto;max-width:100%}.page-wrapper{position:relative;width:100%;height:auto;margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:0;font-size:1vw}.bg-image{display:block;width:100%;height:auto}.overlay{position:absolute;border:.1vw solid;font-family:'Bookerly',serif;line-height:1.25;overflow:hidden;display:flex;white-space:pre-wrap;word-wrap:break-word;text-align:justify;border-radius:.3vw}.merged-text-block{text-indent:1.5em}.merged-text-block:not(:last-child){margin-bottom:.75em}`;

        return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${fileName} - View</title><style>${styles}</style></head><body><main>${bodyContent}</main></body></html>`;
    }
    
    _download(content, filename) {
        const blob = new Blob([content], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }
}