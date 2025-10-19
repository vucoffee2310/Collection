import { readFile } from '../utils.js';

export class Exporters {
    constructor(pdf) {
        this.pdf = pdf;
        this.canvasCache = new Map();
    }

    // Yield control back to browser for responsiveness
    _yieldToMain() {
        return new Promise(resolve => {
            if ('scheduler' in window && 'yield' in window.scheduler) {
                window.scheduler.yield().then(resolve);
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    // Convert canvas to data URL asynchronously with caching
    async _canvasToDataURL(canvas, pageNum, format = 'image/webp', quality = 0.85) {
        if (this.canvasCache.has(pageNum)) {
            return this.canvasCache.get(pageNum);
        }

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => b ? resolve(b) : reject(new Error('Canvas to Blob failed')),
                format,
                quality
            );
        });

        const dataURL = await readFile(blob, 'readAsDataURL');
        this.canvasCache.set(pageNum, dataURL);
        return dataURL;
    }

    // Extract overlay properties for HTML export
    _extractOverlayStyles(overlay, baseVw) {
        const overlayStyle = getComputedStyle(overlay);
        const textElement = overlay.querySelector('.overlay-text');
        if (!textElement) return null;
        
        const textStyle = getComputedStyle(textElement);
        const currentFontSize = parseFloat(overlay.style.fontSize) || 100;
        const fontSizePercent = ((currentFontSize / 100) * baseVw / baseVw) * 100;

        return {
            left: overlay.style.left,
            top: overlay.style.top,
            width: overlay.style.width,
            height: overlay.style.height,
            'background-color': overlayStyle.backgroundColor,
            'border-color': overlayStyle.borderColor,
            color: textStyle.color,
            'font-size': `${fontSizePercent}%`
        };
    }

    // Generate HTML for a single overlay
    _overlayToHTML(overlay, baseVw) {
        const styles = this._extractOverlayStyles(overlay, baseVw);
        if (!styles) return '';

        const textElement = overlay.querySelector('.overlay-text');
        const styleString = Object.entries(styles)
            .map(([key, value]) => `${key}:${value}`)
            .join(';');
        
        return `<div class="overlay" style="${styleString}"><div class="overlay-text">${textElement.innerHTML || ''}</div></div>`;
    }

    // Generate all overlays HTML for a page wrapper
    _generateOverlaysHTML(wrapper) {
        const baseVw = wrapper.clientWidth / 100;
        const overlays = Array.from(wrapper.querySelectorAll('.overlay'));
        
        return overlays
            .map(overlay => this._overlayToHTML(overlay, baseVw))
            .filter(html => html) // Remove empty strings
            .join('\n    ');
    }

    // Generate HTML for a single page
    async _generatePageHTML(wrapper, pageNum) {
        const canvas = wrapper.querySelector('canvas');
        if (!canvas) return '';

        const imageData = await this._canvasToDataURL(canvas, pageNum);
        const overlaysHTML = this._generateOverlaysHTML(wrapper);
        const aspectRatio = canvas.width / canvas.height;

        return `<div class="page-wrapper" style="aspect-ratio: ${aspectRatio};">
    <img src="${imageData}" class="bg-image" alt="PDF Page ${pageNum}" loading="lazy">
    ${overlaysHTML}
</div>`;
    }

    // Generate body HTML for all pages
    async _generateBodyHTML(indicator) {
        const wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
        const totalPages = wrappers.length;
        const batchSize = 3; // Smaller batches for better responsiveness
        const pageHTMLs = [];

        for (let i = 0; i < totalPages; i += batchSize) {
            const batch = wrappers.slice(i, i + batchSize);
            const endPage = Math.min(i + batchSize, totalPages);
            
            indicator.textContent = `Processing pages ${i + 1}-${endPage} of ${totalPages}...`;

            const batchResults = await Promise.all(
                batch.map((wrapper, idx) => this._generatePageHTML(wrapper, i + idx + 1))
            );

            pageHTMLs.push(...batchResults);
            await this._yieldToMain(); // Yield to browser
        }

        return pageHTMLs.filter(html => html).join('\n');
    }

    // Build complete HTML document
    _buildHTMLDocument(title, fontBase64, bodyHTML) {
        const fontFace = fontBase64 
            ? `@font-face{font-family:'Bookerly';src:url(data:font/ttf;base64,${fontBase64}) format('truetype');}`
            : '';

        // Get current paragraph spacing from live element
        const mergedBlock = document.querySelector('.merged-text-block');
        const paragraphSpacing = mergedBlock 
            ? getComputedStyle(mergedBlock).marginBottom 
            : '0.4em';

        const css = `${fontFace}*{box-sizing:border-box}body{margin:0;background:#e9e9e9}main{margin:0 auto;max-width:100%}.page-wrapper{position:relative;width:100%;height:auto;margin:0 auto 10px;box-shadow:0 2px 10px rgba(0,0,0,.3);line-height:0;font-size:1vw}.bg-image{display:block;width:100%;height:auto}.overlay{position:absolute;border:.1vw solid;font-family:'Bookerly',serif;line-height:1.15;overflow:hidden;display:flex;align-items:center;white-space:pre-wrap;word-wrap:break-word;border-radius:.3vw}.overlay-text{width:100%;text-align:justify}.merged-text-block:not(:last-child){margin-bottom:${paragraphSpacing}}`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - View</title>
    <style>${css}</style>
</head>
<body>
    <main>${bodyHTML}</main>
</body>
</html>`;
    }

    // Download file to user's system
    _downloadFile(content, filename, mimeType = 'text/html') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        
        // Clean up
        URL.revokeObjectURL(url);
    }

    // Main HTML export function
    async html(name, pageManager) {
        const indicator = pageManager.showSavingIndicator('Initializing HTML export...');
        
        try {
            // Load font
            indicator.textContent = 'Loading font...';
            const fontBase64 = await this.pdf.loadFont();
            
            // Generate body HTML
            const bodyHTML = await this._generateBodyHTML(indicator);
            
            // Build complete HTML document
            indicator.textContent = 'Building HTML document...';
            await this._yieldToMain();
            const htmlDocument = this._buildHTMLDocument(name, fontBase64, bodyHTML);
            
            // Download file
            indicator.textContent = 'Saving file...';
            await this._yieldToMain();
            this._downloadFile(htmlDocument, `${name}_view.html`);
            
            // Cleanup
            this.canvasCache.clear();
            
        } catch (error) {
            console.error('HTML Export Error:', error);
            alert(`Error saving as HTML: ${error.message}`);
        } finally {
            pageManager.removeSavingIndicator(indicator);
        }
    }

    // Print export function
    async print(pageManager) {
        const indicator = pageManager.showSavingIndicator('Preparing for print...');
        
        try {
            // Ensure all pages are rendered
            await this.pdf.renderAllQueuedPages();
            
            // Small delay to ensure rendering is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Trigger print dialog
            window.print();
            
        } catch (error) {
            console.error('Print Error:', error);
            alert('Could not prepare for print. See console for details.');
        } finally {
            pageManager.removeSavingIndicator(indicator);
        }
    }
}