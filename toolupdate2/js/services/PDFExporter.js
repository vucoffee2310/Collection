import { CONFIG } from '../config.js';
import { yieldToMain, PageSpecParser, withErrorHandling, forceUIUpdate } from '../utils.js';

export class PDFExporter {
    constructor(pdf) { 
        this.pdf = pdf;
        this.canvasCache = new Map();
        this.imageBlobCache = new Map();
    }

    _rgba(str) {
        const [r = 0, g = 0, b = 0, a = 1] = (str?.match(/(\d+(\.\d+)?)/g) || []).map(Number);
        return { r, g, b, a };
    }

    _fontStyle(weight, style) {
        const bold = weight === 'bold' || Number(weight) >= 700;
        const italic = style === 'italic' || style === 'oblique';
        return bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    }

    _cleanup() {
        this.canvasCache.clear();
        this.imageBlobCache.clear();
    }

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

    _getExactProps(overlay, wrapper) {
        const overlayStyle = getComputedStyle(overlay);
        const textElement = overlay.querySelector('.overlay-text');
        const textStyle = getComputedStyle(textElement);

        const rect = overlay.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        
        const x = rect.left - wrapperRect.left;
        const y = rect.top - wrapperRect.top;
        const w = overlay.offsetWidth;
        const h = overlay.offsetHeight;

        return {
            x, y, w, h,
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

    _calculatePDFLines(pdf, text, maxWidth) {
        if (!text.trim()) return [];
        return pdf.splitTextToSize(text, maxWidth);
    }

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

    _drawOverlayText(pdf, overlayProps, overlayElements) {
        overlayElements.forEach((overlay, idx) => {
            const props = overlayProps[idx];
            const textElement = overlay.querySelector('.overlay-text');
            if (!textElement) return;

            pdf.setFont(CONFIG.FONT.NAME, props.fontStyle);
            pdf.setFontSize(props.fontSize);
            pdf.setTextColor(props.txt.r, props.txt.g, props.txt.b);
            pdf.setGState(new jspdf.GState({ opacity: props.opacity }));

            const maxWidth = props.w - props.pad.left - props.pad.right;
            if (maxWidth <= 0) return;

            const { measurements, totalHeight } = this._measureTextInHTML(textElement);
            if (measurements.length === 0) return;

            const availableHeight = props.h - props.pad.top - props.pad.bottom;
            const verticalOffset = Math.max(0, (availableHeight - totalHeight) / 2);
            
            let curY = props.y + props.pad.top + verticalOffset;

            if (measurements[0].isSimple) {
                const lines = this._calculatePDFLines(pdf, measurements[0].text, maxWidth);
                const lineHeight = props.lineH;
                curY += props.fontSize * 0.85;
                
                pdf.text(lines, props.x + props.pad.left, curY, {
                    align: props.align,
                    maxWidth: maxWidth,
                    lineHeightFactor: lineHeight / props.fontSize
                });
            } else {
                measurements.forEach(measure => {
                    const lines = this._calculatePDFLines(pdf, measure.text, maxWidth - measure.indent);
                    const lineHeight = props.lineH;
                    const blockY = curY + props.fontSize * 0.85;
                    
                    pdf.text(lines, props.x + props.pad.left + measure.indent, blockY, {
                        baseline: 'alphabetic',
                        lineHeightFactor: lineHeight / props.fontSize
                    });
                    
                    curY += measure.height + measure.margin;
                });
            }
        });
    }

    _addPageToPDF(pdf, pageData, isFirst) {
        const { imageData, overlayProps, overlayElements, wrapperWidth, wrapperHeight } = pageData;
        
        if (!isFirst) {
            pdf.addPage([wrapperWidth, wrapperHeight], wrapperWidth > wrapperHeight ? 'l' : 'p');
        }
        
        pdf.addImage(imageData, 'JPEG', 0, 0, wrapperWidth, wrapperHeight);
        
        const opaque = new jspdf.GState({ opacity: 1 });
        
        this._drawOverlayBackgrounds(pdf, overlayProps);
        pdf.setGState(opaque);
        
        this._drawOverlayText(pdf, overlayProps, overlayElements);
        pdf.setGState(opaque);
    }

    async _embedFont(pdf) {
        const font = await this.pdf.loadFont();
        if (font) {
            pdf.addFileToVFS(`${CONFIG.FONT.NAME}.ttf`, font);
            ['normal', 'bold', 'italic', 'bolditalic'].forEach(style => {
                pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, style);
            });
        }
    }

    async _createPDFInstance(wrapper) {
        const pdf = new jspdf.jsPDF({
            orientation: wrapper.clientWidth > wrapper.clientHeight ? 'l' : 'p',
            unit: 'pt',
            format: [wrapper.clientWidth, wrapper.clientHeight],
            compress: true
        });
        await this._embedFont(pdf);
        return pdf;
    }

    _getWrappers() {
        const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
        if (!wrappers.length) throw new Error('No pages rendered');
        return Array.from(wrappers);
    }

    async _exportCombinedPDF(pageNumbers, filename, indicator) {
        const firstWrapper = document.querySelector(`#page-wrapper-${pageNumbers[0]}`);
        const pdf = await this._createPDFInstance(firstWrapper);

        let isFirst = true;
        for (let i = 0; i < pageNumbers.length; i++) {
            const pageNum = pageNumbers[i];
            indicator.textContent = `Processing page ${pageNum} (${i + 1}/${pageNumbers.length})...`;

            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            if (!wrapper) continue;

            const pageData = await this._preparePageData(wrapper, pageNum);
            this._addPageToPDF(pdf, pageData, isFirst);
            isFirst = false;

            if (i % 5 === 0) await yieldToMain();
        }

        indicator.textContent = 'Saving PDF...';
        await yieldToMain();
        pdf.save(filename);
    }

    async _exportGroupedPDFs(pageNumbers, filenameBase, groupSize, indicator) {
        const totalGroups = Math.ceil(pageNumbers.length / groupSize);

        for (let i = 0; i < pageNumbers.length; i += groupSize) {
            const group = pageNumbers.slice(i, i + groupSize);
            const groupIndex = Math.floor(i / groupSize) + 1;
            const startPage = group[0];
            const endPage = group[group.length - 1];

            indicator.textContent = `Creating file ${groupIndex}/${totalGroups} (pages ${startPage}-${endPage})...`;

            const firstWrapper = document.querySelector(`#page-wrapper-${startPage}`);
            const pdf = await this._createPDFInstance(firstWrapper);

            let isFirst = true;
            for (const pageNum of group) {
                const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
                if (!wrapper) continue;

                const pageData = await this._preparePageData(wrapper, pageNum);
                this._addPageToPDF(pdf, pageData, isFirst);
                isFirst = false;
            }

            const filename = `${filenameBase}_pages_${String(startPage).padStart(3, '0')}_to_${String(endPage).padStart(3, '0')}.pdf`;
            await yieldToMain();
            pdf.save(filename);

            this._cleanup();
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    async _exportIndividualPDFs(pageNumbers, filenameBase, indicator) {
        for (let i = 0; i < pageNumbers.length; i++) {
            const pageNum = pageNumbers[i];
            indicator.textContent = `Exporting page ${pageNum} (${i + 1}/${pageNumbers.length})...`;

            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            if (!wrapper) continue;

            const pdf = await this._createPDFInstance(wrapper);
            const pageData = await this._preparePageData(wrapper, pageNum);
            this._addPageToPDF(pdf, pageData, true);

            const filename = `${filenameBase}_page_${String(pageNum).padStart(3, '0')}.pdf`;
            await yieldToMain();
            pdf.save(filename);

            if (i % 3 === 0) {
                this._cleanup();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    async _exportPages(config, ui) {
        const { 
            pageNumbers,
            filename,
            combinePages,
            groupSize,
            progressPrefix
        } = config;

        return withErrorHandling(async () => {
            const wrappers = this._getWrappers();
            const indicator = ui.showSavingIndicator(`${progressPrefix}...`);
            
            // Force UI to update before processing
            await forceUIUpdate();

            try {
                indicator.textContent = 'Loading font...';
                await this._embedFont(new jspdf.jsPDF());

                if (combinePages) {
                    await this._exportCombinedPDF(pageNumbers, filename, indicator);
                } else if (groupSize) {
                    await this._exportGroupedPDFs(pageNumbers, filename, groupSize, indicator);
                } else {
                    await this._exportIndividualPDFs(pageNumbers, filename, indicator);
                }

                this._cleanup();
                return true;

            } finally {
                ui.removeSavingIndicator(indicator);
            }
        }, 'Export failed');
    }

    async save(name, ui) {
        const wrappers = this._getWrappers();
        const totalPages = wrappers.length;
        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

        return this._exportPages({
            pageNumbers,
            filename: `${name}_export.pdf`,
            combinePages: true,
            progressPrefix: 'Exporting all pages'
        }, ui);
    }

    async saveSinglePage(pageNum, name, ui) {
        return this._exportPages({
            pageNumbers: [pageNum],
            filename: `${name}_page_${String(pageNum).padStart(3, '0')}.pdf`,
            combinePages: true,
            progressPrefix: `Exporting page ${pageNum}`
        }, ui);
    }

    async splitPDF(name, ui) {
        const wrappers = this._getWrappers();
        const pageNumbers = Array.from({ length: wrappers.length }, (_, i) => i + 1);

        const confirmed = confirm(
            `Split ${pageNumbers.length} pages into individual files?\n\n` +
            `This will download ${pageNumbers.length} separate PDFs.\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        return this._exportPages({
            pageNumbers,
            filename: name,
            combinePages: false,
            progressPrefix: `Splitting ${pageNumbers.length} pages`
        }, ui);
    }

    async splitByNumberOfFiles(numFiles, name, ui) {
        const wrappers = this._getWrappers();
        const totalPages = wrappers.length;
        const pagesPerFile = Math.ceil(totalPages / numFiles);
        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

        const confirmed = confirm(
            `Split ${totalPages} pages into ${numFiles} files?\n\n` +
            `Each file will contain ~${pagesPerFile} pages.\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        return this._exportPages({
            pageNumbers,
            filename: name,
            combinePages: false,
            groupSize: pagesPerFile,
            progressPrefix: `Creating ${numFiles} files`
        }, ui);
    }

    async splitByPagesPerFile(pagesPerFile, name, ui) {
        const wrappers = this._getWrappers();
        const totalPages = wrappers.length;
        const numFiles = Math.ceil(totalPages / pagesPerFile);
        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

        const confirmed = confirm(
            `Split into groups of ${pagesPerFile} pages?\n\n` +
            `This will create ${numFiles} files.\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        return this._exportPages({
            pageNumbers,
            filename: name,
            combinePages: false,
            groupSize: pagesPerFile,
            progressPrefix: `Creating ${numFiles} files`
        }, ui);
    }

    async exportPageRange(startPage, endPage, name, ui) {
        if (startPage > endPage) {
            alert('Start page must be ≤ end page');
            return;
        }

        const pageNumbers = Array.from(
            { length: endPage - startPage + 1 }, 
            (_, i) => startPage + i
        );

        return this._exportPages({
            pageNumbers,
            filename: `${name}_pages_${String(startPage).padStart(3, '0')}_to_${String(endPage).padStart(3, '0')}.pdf`,
            combinePages: true,
            progressPrefix: `Exporting pages ${startPage}-${endPage}`
        }, ui);
    }

    async exportSpecificPages(pageSpec, name, ui) {
        const pageNumbers = PageSpecParser.parse(pageSpec);

        if (pageNumbers.length === 0) {
            alert('Invalid page specification.\n\nExamples:\n• "1,5,10"\n• "1-5,10,15-20"');
            return;
        }

        const wrappers = this._getWrappers();
        const validPages = PageSpecParser.validate(pageNumbers, wrappers.length);

        if (validPages.length !== pageNumbers.length) {
            const invalid = pageNumbers.filter(p => !validPages.includes(p));
            alert(`Invalid pages: ${invalid.join(', ')}\n\nMax page: ${wrappers.length}`);
            return;
        }

        const confirmed = confirm(
            `Export ${validPages.length} specific pages?\n\n` +
            `Pages: ${PageSpecParser.format(validPages)}\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        const filename = validPages.length === 1
            ? `${name}_page_${String(validPages[0]).padStart(3, '0')}.pdf`
            : `${name}_selected_${validPages.length}_pages.pdf`;

        return this._exportPages({
            pageNumbers: validPages,
            filename,
            combinePages: true,
            progressPrefix: `Exporting ${validPages.length} pages`
        }, ui);
    }

    async savePageAsImage(pageNum, name, format = 'png') {
        return withErrorHandling(async () => {
            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            if (!wrapper) throw new Error(`Page ${pageNum} not found`);

            const canvas = wrapper.querySelector('canvas');
            if (!canvas) throw new Error(`Page ${pageNum} not rendered`);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (b) => b ? resolve(b) : reject(new Error('Canvas to Blob failed')),
                    `image/${format}`,
                    0.95
                );
            });

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${name}_page_${String(pageNum).padStart(3, '0')}.${format}`;
            anchor.click();

            URL.revokeObjectURL(url);
            return true;
        }, 'Image export failed');
    }
}