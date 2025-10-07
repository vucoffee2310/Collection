export class HTMLExporter {
    constructor(pdfHandler) {
        this.pdfHandler = pdfHandler;
    }

    async save(fileName, uiManager) {
        const indicator = uiManager.showSavingIndicator('Preparing all pages for export...');
        try {
            const [fontBase64, bodyContent] = await Promise.all([
                this.pdfHandler.loadFont(),
                this._generateBodyContent(indicator) 
            ]);
            
            indicator.textContent = 'Generating HTML file...';
            
            const htmlContent = this._buildHTML(fileName, fontBase64, bodyContent);
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
        const totalPages = pageWrappers.length;

        // Use standard loop for sequential indicator updates
        const pageContents = [];
        for (let i = 0; i < totalPages; i++) {
            const wrapper = pageWrappers[i];
            indicator.textContent = `Processing page ${i + 1}/${totalPages}...`;
            pageContents.push(await this._processPage(wrapper));
        }
        
        return pageContents.join('');
    }

    async _processPage(wrapper) {
        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return '';

        const bgImageSrc = await this._canvasToDataURL(canvas);
        const overlaysHTML = this._generateOverlaysHTML(wrapper);
        const aspectRatio = canvas.width / canvas.height;

        return `<div class="page-wrapper" style="aspect-ratio: ${aspectRatio};">
    <img src="${bgImageSrc}" class="bg-image" alt="PDF Page background">
    ${overlaysHTML}
</div>`.trim();
    }

    _canvasToDataURL(canvas) {
        // Optimization: Uses WebP (0.8 quality) for efficient image serialization
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (!blob) return reject(new Error('Canvas to Blob conversion failed.'));
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
            }, 'image/webp', 0.8);
        });
    }

    _generateOverlaysHTML(pageWrapper) {
        const pageWidth = pageWrapper.clientWidth;
        const baseVwInPx = pageWidth / 100;
        
        return Array.from(pageWrapper.querySelectorAll('.overlay'))
            .map(overlay => this._overlayToHTML(overlay, baseVwInPx))
            .join('');
    }

    _overlayToHTML(overlay, baseVwInPx) {
        const computedStyle = getComputedStyle(overlay);
        const textSpan = overlay.querySelector('.overlay-text');
        
        if (!textSpan) return ''; 

        const textStyle = getComputedStyle(textSpan);

        // Retrieve font size dynamically from the overlay element's style, which is set by FontSizeCalculator
        // Need to parse the size set in percentage relative to the pageWrapper (1vw)
        const currentOverlayFontSize = parseFloat(overlay.style.fontSize) || 100; // Expected to be a percentage
        const currentFontSizePx = (currentOverlayFontSize / 100) * baseVwInPx;
        
        const fontSizePercent = (currentFontSizePx / baseVwInPx) * 100; // Recalculate as percentage of 1vw

        const inlineStyles = [
            `left: ${overlay.style.left}`,
            `top: ${overlay.style.top}`,
            `width: ${overlay.style.width}`,
            `height: ${overlay.style.height}`,
            `background-color: ${computedStyle.backgroundColor}`,
            `border-color: ${computedStyle.borderColor}`,
            `color: ${textStyle.color}`,
            `font-size: ${fontSizePercent}%`
        ].join('; ');

        const textContent = textSpan.textContent || '';
        return `<div class="overlay" style="${inlineStyles}">${textContent}</div>`;
    }

    _buildHTML(fileName, fontBase64, bodyContent) {
        const fontFace = fontBase64 
            ? `@font-face{font-family:'Bookerly';src:url(data:font/ttf;base64,${fontBase64}) format('truetype');font-weight:normal;font-style:normal;}`
            : '';
        
        // Minified CSS subset for export view
        const styles = `${fontFace}*{box-sizing:border-box}body{margin:0;background:#555;font-family:sans-serif}main{max-width:100%;margin:0;padding:0}.page-wrapper{position:relative;width:100%;height:auto;margin:0 auto 10px auto;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:0;font-size:1vw}.bg-image{display:block;width:100%;height:auto}.overlay{position:absolute;border-style:solid;border-width:.1vw;font-family:'Bookerly',serif;line-height:1.35;padding:0;overflow:hidden;display:flex;white-space:pre-wrap;word-wrap:break-word;text-align:justify;border-radius:.3vw}`;

        return `<!DOCTYPE html>
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