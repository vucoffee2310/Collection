import { CONFIG } from '../config.js';

export class PDFExporter {
    constructor(pdf) { 
        this.pdf = pdf;
        this.canvasCache = new Map();
        this.imageBlobCache = new Map();
    }

    // Parse RGBA color from CSS string
    _rgba(str) {
        const [r = 0, g = 0, b = 0, a = 1] = (str?.match(/(\d+(\.\d+)?)/g) || []).map(Number);
        return { r, g, b, a };
    }

    // Determine font style from weight and style
    _fontStyle(weight, style) {
        const bold = weight === 'bold' || Number(weight) >= 700;
        const italic = style === 'italic' || style === 'oblique';
        return bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    }

    // Extract EXACT measurements from HTML overlay (no calibration needed)
    _getExactProps(overlay, wrapper) {
        const wrapperWidth = wrapper.clientWidth;
        const wrapperHeight = wrapper.clientHeight;
        
        const overlayStyle = getComputedStyle(overlay);
        const textElement = overlay.querySelector('.overlay-text');
        const textStyle = getComputedStyle(textElement);

        // Get exact pixel positions from computed style
        const rect = overlay.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        // Calculate exact positions relative to wrapper
        const x = rect.left - wrapperRect.left;
        const y = rect.top - wrapperRect.top;
        const w = overlay.offsetWidth;
        const h = overlay.offsetHeight;

        return {
            x,
            y,
            w,
            h,
            bg: this._rgba(overlayStyle.backgroundColor),
            border: this._rgba(overlayStyle.borderColor),
            borderW: parseFloat(overlayStyle.borderTopWidth),
            borderR: parseFloat(overlayStyle.borderTopLeftRadius),
            opacity: parseFloat(overlayStyle.opacity),
            pad: {
                top: parseFloat(overlayStyle.paddingTop),
                left: parseFloat(overlayStyle.paddingLeft),
                right: parseFloat(overlayStyle.paddingRight),
                bottom: parseFloat(overlayStyle.paddingBottom),
            },
            txt: this._rgba(textStyle.color),
            fontSize: parseFloat(textStyle.fontSize),
            fontStyle: this._fontStyle(textStyle.fontWeight, textStyle.fontStyle),
            align: textStyle.textAlign === 'justify' ? 'justify' : 'left',
            lineH: parseFloat(textStyle.lineHeight),
        };
    }

    // Get page canvas from cache or render it
    async _getPageCanvas(wrapper, pageNum, scale) {
        const cacheKey = `${pageNum}_${scale}`;
        
        if (this.canvasCache.has(cacheKey)) {
            return this.canvasCache.get(cacheKey);
        }

        const existingCanvas = wrapper.querySelector('canvas');
        if (existingCanvas && scale === CONFIG.PDF.SCALE) {
            this.canvasCache.set(cacheKey, existingCanvas);
            return existingCanvas;
        }

        const canvas = await this.pdf.getRenderedPageCanvas(pageNum, scale);
        this.canvasCache.set(cacheKey, canvas);
        return canvas;
    }

    // Convert canvas to data URL asynchronously
    async _canvasToDataURL(canvas, pageNum, quality = 0.92) {
        const cacheKey = `blob_${pageNum}`;
        
        if (this.imageBlobCache.has(cacheKey)) {
            return this.imageBlobCache.get(cacheKey);
        }

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                (b) => b ? resolve(b) : reject(new Error('Canvas to Blob failed')),
                'image/jpeg',
                quality
            );
        });

        const dataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        this.imageBlobCache.set(cacheKey, dataURL);
        return dataURL;
    }

    // Prepare all data for a single page
    async _preparePageData(wrapper, pageNum) {
        const canvas = await this._getPageCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
        const imageData = await this._canvasToDataURL(canvas, pageNum);
        
        const overlays = Array.from(wrapper.querySelectorAll('.overlay'));
        const overlayProps = overlays.map(el => this._getExactProps(el, wrapper));
        
        return {
            pageNum,
            imageData,
            overlayProps,
            overlayElements: overlays,
            wrapperWidth: wrapper.clientWidth,
            wrapperHeight: wrapper.clientHeight
        };
    }

    // Get exact text measurements from HTML
    _measureTextInHTML(textElement) {
        const blocks = textElement.querySelectorAll('.merged-text-block');
        const measurements = [];
        let totalHeight = 0;

        if (blocks.length > 0) {
            blocks.forEach(block => {
                const text = block.textContent || '';
                if (!text.trim()) return;

                const blockStyle = getComputedStyle(block);
                const rect = block.getBoundingClientRect();
                
                measurements.push({
                    text,
                    height: rect.height,
                    indent: parseFloat(blockStyle.textIndent),
                    margin: parseFloat(blockStyle.marginBottom),
                    isBlock: true
                });
                
                totalHeight += rect.height + parseFloat(blockStyle.marginBottom);
            });
            
            // Remove last margin
            if (measurements.length > 0) {
                totalHeight -= measurements[measurements.length - 1].margin;
            }
        } else {
            const text = textElement.textContent || '';
            if (text.trim()) {
                const rect = textElement.getBoundingClientRect();
                measurements.push({
                    text,
                    height: rect.height,
                    indent: 0,
                    margin: 0,
                    isSimple: true
                });
                totalHeight = rect.height;
            }
        }

        return { measurements, totalHeight };
    }

    // Calculate how many lines text will take in PDF
    _calculatePDFLines(pdf, text, maxWidth) {
        if (!text.trim()) return [];
        return pdf.splitTextToSize(text, maxWidth);
    }

    // Draw overlay backgrounds and borders
    _drawOverlayBackgrounds(pdf, overlayProps) {
        overlayProps.forEach(p => {
            if (p.bg.a > 0) {
                pdf.setGState(new jspdf.GState({ opacity: p.opacity * p.bg.a }));
                pdf.setFillColor(p.bg.r, p.bg.g, p.bg.b);
                pdf.roundedRect(p.x, p.y, p.w, p.h, p.borderR, p.borderR, 'F');
            }
            if (p.borderW > 0) {
                pdf.setGState(new jspdf.GState({ opacity: p.opacity }));
                pdf.setLineWidth(p.borderW);
                pdf.setDrawColor(p.border.r, p.border.g, p.border.b);
                pdf.roundedRect(p.x, p.y, p.w, p.h, p.borderR, p.borderR, 'S');
            }
        });
    }

    // Draw overlay text matching HTML exactly
    _drawOverlayText(pdf, overlayProps, overlayElements) {
        overlayElements.forEach((overlay, idx) => {
            const props = overlayProps[idx];
            const textElement = overlay.querySelector('.overlay-text');
            if (!textElement) return;

            // Set text properties
            pdf.setFont(CONFIG.FONT.NAME, props.fontStyle);
            pdf.setFontSize(props.fontSize);
            pdf.setTextColor(props.txt.r, props.txt.g, props.txt.b);
            pdf.setGState(new jspdf.GState({ opacity: props.opacity }));

            const maxWidth = props.w - props.pad.left - props.pad.right;
            if (maxWidth <= 0) return;

            // Get exact measurements from HTML
            const { measurements, totalHeight } = this._measureTextInHTML(textElement);
            if (measurements.length === 0) return;

            // Calculate vertical centering to match HTML's align-items: center
            const availableHeight = props.h - props.pad.top - props.pad.bottom;
            const verticalOffset = Math.max(0, (availableHeight - totalHeight) / 2);
            
            // Start position (matching HTML flex centering exactly)
            let curY = props.y + props.pad.top + verticalOffset;

            if (measurements[0].isSimple) {
                // Simple single text
                const lines = this._calculatePDFLines(pdf, measurements[0].text, maxWidth);
                const lineHeight = props.lineH;
                
                // Add first line ascent for proper baseline
                curY += props.fontSize * 0.85;
                
                pdf.text(lines, props.x + props.pad.left, curY, {
                    align: props.align,
                    maxWidth: maxWidth,
                    lineHeightFactor: lineHeight / props.fontSize
                });
            } else {
                // Multiple text blocks
                measurements.forEach(measure => {
                    const lines = this._calculatePDFLines(pdf, measure.text, maxWidth - measure.indent);
                    const numLines = lines.length;
                    const lineHeight = props.lineH;
                    
                    // Position at block start + baseline offset
                    const blockY = curY + props.fontSize * 0.85;
                    
                    pdf.text(lines, props.x + props.pad.left + measure.indent, blockY, {
                        baseline: 'alphabetic',
                        lineHeightFactor: lineHeight / props.fontSize
                    });
                    
                    // Move to next block (using exact HTML measurement)
                    curY += measure.height + measure.margin;
                });
            }
        });
    }

    // Add a complete page to the PDF
    _addPageToPDF(pdf, pageData, isFirst) {
        const { imageData, overlayProps, overlayElements, wrapperWidth, wrapperHeight } = pageData;
        
        // Add new page if not first
        if (!isFirst) {
            pdf.addPage([wrapperWidth, wrapperHeight], wrapperWidth > wrapperHeight ? 'l' : 'p');
        }
        
        // Add background image
        pdf.addImage(imageData, 'JPEG', 0, 0, wrapperWidth, wrapperHeight);
        
        const opaque = new jspdf.GState({ opacity: 1 });
        
        // Draw overlay backgrounds and borders
        this._drawOverlayBackgrounds(pdf, overlayProps);
        pdf.setGState(opaque);
        
        // Draw overlay text
        this._drawOverlayText(pdf, overlayProps, overlayElements);
        pdf.setGState(opaque);
    }

    // Yield control to browser
    _yieldToMain() {
        return new Promise(resolve => {
            if ('scheduler' in window && 'yield' in window.scheduler) {
                window.scheduler.yield().then(resolve);
            } else {
                setTimeout(resolve, 0);
            }
        });
    }

    // Embed font into PDF
    async _embedFont(pdf) {
        const font = await this.pdf.loadFont();
        if (font) {
            pdf.addFileToVFS(`${CONFIG.FONT.NAME}.ttf`, font);
            ['normal', 'bold', 'italic', 'bolditalic'].forEach(style => {
                pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, style);
            });
        }
    }

    // Convert all pages to image data
    async _convertAllPages(wrappers, totalPages, indicator) {
        const batchSize = 3;
        const allPageData = [];
        
        for (let i = 0; i < totalPages; i += batchSize) {
            const batch = Array.from(wrappers).slice(i, i + batchSize);
            const endPage = Math.min(i + batchSize, totalPages);
            
            indicator.textContent = `Converting pages ${i + 1}-${endPage} of ${totalPages}...`;
            
            const batchData = await Promise.all(
                batch.map((wrapper, idx) => this._preparePageData(wrapper, i + idx + 1))
            );
            
            allPageData.push(...batchData);
            await this._yieldToMain();
        }
        
        return allPageData;
    }

    // Build the PDF from prepared page data
    async _buildPDF(pdf, allPageData, totalPages, indicator) {
        await this._yieldToMain();
        
        for (let i = 0; i < allPageData.length; i++) {
            if (i % 5 === 0) {
                indicator.textContent = `Adding page ${i + 1}/${totalPages} to PDF...`;
                await this._yieldToMain();
            }
            
            this._addPageToPDF(pdf, allPageData[i], i === 0);
        }
    }

    // Clean up caches
    _cleanup() {
        this.canvasCache.clear();
        this.imageBlobCache.clear();
    }

    // Main export function
    async save(name, ui) {
        const indicator = ui.showSavingIndicator('Initializing export...');
        
        try {
            // Get all rendered pages
            const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
            if (!wrappers.length) throw new Error('No pages rendered.');

            const totalPages = wrappers.length;
            const firstWrapper = wrappers[0];

            // Initialize PDF with exact dimensions from HTML
            const pdf = new jspdf.jsPDF({ 
                orientation: firstWrapper.clientWidth > firstWrapper.clientHeight ? 'l' : 'p', 
                unit: 'pt', 
                format: [firstWrapper.clientWidth, firstWrapper.clientHeight],
                compress: true
            });

            // Load and embed font
            indicator.textContent = 'Loading font...';
            await this._embedFont(pdf);

            // Phase 1: Convert all canvases to images
            indicator.textContent = 'Converting pages to images...';
            const allPageData = await this._convertAllPages(wrappers, totalPages, indicator);

            // Phase 2: Build PDF document
            indicator.textContent = 'Building PDF document...';
            await this._buildPDF(pdf, allPageData, totalPages, indicator);

            // Phase 3: Save file
            indicator.textContent = 'Saving PDF file...';
            await this._yieldToMain();
            pdf.save(`${name}_export.pdf`);
            
            // Cleanup
            this._cleanup();
            
        } catch (e) {
            console.error('PDF Export Error:', e);
            alert(`Could not save as PDF: ${e.message}`);
        } finally {
            ui.removeSavingIndicator(indicator);
        }
    }
}