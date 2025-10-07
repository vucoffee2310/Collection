export class HTMLExporter {
    constructor(pdfHandler) {
        this.pdfHandler = pdfHandler;
    }

    async save(fileName, uiManager) {
        const indicator = uiManager.showSavingIndicator('Processing pages for responsive export...');
        try {
            const fontBase64 = await this.pdfHandler.loadFont();
            const bodyContent = await this._generateBodyContent();
            const styles = this._generateStyles(fontBase64);
            
            indicator.textContent = 'Generating HTML file...';
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${fileName} - View</title>
    <style>${styles}</style>
</head>
<body>
    <main>${bodyContent}</main>
</body>
</html>`;

            this._download(htmlContent, `${fileName}_view.html`);
        } catch (error) {
            console.error('Error saving HTML:', error);
            alert('Error saving as HTML: ' + error.message);
        } finally {
            uiManager.removeSavingIndicator(indicator);
        }
    }

    async _generateBodyContent() {
        const pageWrappers = Array.from(document.querySelectorAll('.page-wrapper'));
        
        const pagePromises = pageWrappers.map(async (wrapper) => {
            const canvas = wrapper.querySelector('canvas');
            if (!canvas) return '';

            const bgImageSrc = await this._canvasToDataURL(canvas, 'image/webp', 0.8);
            
            // We still need the dimensions for the font-size calculation.
            const pageWidth = wrapper.clientWidth;
            
            const overlaysHTML = this._generateOverlaysHTML(wrapper, pageWidth);
            const canvasAspectRatio = canvas.width / canvas.height;

            return `<div class="page-wrapper" style="aspect-ratio: ${canvasAspectRatio};">
    <img src="${bgImageSrc}" class="bg-image" alt="PDF Page background">
    ${overlaysHTML}
</div>`;
        });
        
        const pageContents = await Promise.all(pagePromises);
        return pageContents.join('');
    }

    _canvasToDataURL(canvas, type, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) return reject(new Error('Canvas to Blob conversion failed.'));
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            }, type, quality);
        });
    }

    _generateOverlaysHTML(pageWrapper, pageWidth) {
        const overlays = pageWrapper.querySelectorAll('.overlay');
        let html = '';
        overlays.forEach(overlay => {
            const computedStyle = getComputedStyle(overlay);
            const textSpan = overlay.querySelector('.overlay-text');
            const textStyle = getComputedStyle(textSpan);

            // --- START OF FIX ---
            // The live overlay styles are now already in percentages.
            // We just need to read them directly instead of recalculating.
            const left = overlay.style.left;     // e.g., "10.5%"
            const top = overlay.style.top;       // e.g., "20.2%"
            const width = overlay.style.width;   // e.g., "50.0%"
            const height = overlay.style.height; // e.g., "5.8%"
            // --- END OF FIX ---
            
            // The font size calculation logic remains correct, as it converts
            // the live computed pixel size to a responsive percentage.
            const baseVwInPx = pageWidth / 100;
            const fontSizePercent = (parseFloat(textStyle.fontSize) / baseVwInPx) * 100;

            const inlineStyles = [
                `left: ${left}`,
                `top: ${top}`,
                `width: ${width}`,
                `height: ${height}`,
                `background-color: ${computedStyle.backgroundColor}`,
                `border-color: ${computedStyle.borderColor}`,
                `color: ${textStyle.color}`,
                `font-size: ${fontSizePercent}%`
            ].join('; ');

            const textContent = textSpan ? textSpan.textContent : '';
            html += `<div class="overlay" style="${inlineStyles}">${textContent}</div>`;
        });
        return html;
    }

    _generateStyles(fontBase64) {
        const fontFace = fontBase64 ? `@font-face{font-family:'Bookerly';src:url(data:font/ttf;base64,${fontBase64}) format('truetype');font-weight:normal;font-style:normal;}` : '';
        
        return `${fontFace}*{box-sizing:border-box}body{margin:0;background:#555;font-family:sans-serif}main{max-width:100%;margin:0;padding:0}.page-wrapper{position:relative;width:100%;height:auto;margin:0 auto 10px auto;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:0;font-size:1vw;}.bg-image{display:block;width:100%;height:auto}.overlay{position:absolute;border-style:solid;border-width:.1vw;font-family:'Bookerly',serif;line-height:1.35;padding:0;overflow:hidden;display:flex;white-space:pre-wrap;word-wrap:break-word;text-align:justify;border-radius:.3vw}`;
    }
    
    _download(content, filename) {
        const blob = new Blob([content], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }
}