import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class PDFExporter {
    constructor(pdfHandler) {
        this.pdfHandler = pdfHandler;
    }

    async save(fileName, overlayData, paletteKey, brightness, uiManager) {
        const indicator = uiManager.showSavingIndicator();
        try {
            const pdfDoc = this.pdfHandler.pdfDoc;
            const pdf = await this._initializeJsPDF(pdfDoc);
            await this._renderAllPagesToPDF(pdf, pdfDoc, overlayData, paletteKey, brightness);
            pdf.save(`${fileName}_with_overlays.pdf`);
        } catch (error) {
            console.error('Error saving PDF:', error);
            alert('Error saving PDF: ' + error.message);
        } finally {
            uiManager.removeSavingIndicator(indicator);
        }
    }

    async _initializeJsPDF(pdfDoc) {
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        const pageHeight = 1000;
        const pageWidth = (viewport.width / viewport.height) * pageHeight;
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: pageWidth > pageHeight ? 'l' : 'p',
            unit: 'pt',
            format: [pageWidth, pageHeight]
        });
        
        pdf.setLineHeightFactor(1.35);

        const fontData = await this.pdfHandler.loadFont();
        if (fontData) {
            pdf.addFileToVFS(CONFIG.FONT.FILE, fontData);
            pdf.addFont(CONFIG.FONT.FILE, CONFIG.FONT.NAME, 'normal');
            pdf.setFont(CONFIG.FONT.NAME, 'normal');
        } else {
            pdf.setFont('Helvetica', 'normal');
        }
        return pdf;
    }

    async _renderAllPagesToPDF(pdf, pdfDoc, overlayData, paletteKey, brightness) {
        const { width: pageWidth, height: pageHeight } = pdf.getPageInfo(1).pageContext.mediaBox;
        const palette = CONFIG.COLOR_PALETTES[paletteKey];

        for (let i = 0; i < pdfDoc.numPages; i++) {
            const pageNum = i + 1;
            if (i > 0) pdf.addPage([pageWidth, pageHeight]);

            const canvas = await this.pdfHandler.getRenderedPageCanvas(pageNum, CONFIG.PDF.RENDER_SCALE);
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageWidth, pageHeight);
            
            const pageData = overlayData[`page_${pageNum}`];
            if (!pageData) continue;
            
            Object.entries(pageData).forEach(([coordsStr, info]) => {
                this._renderPDFOverlay(pdf, coordsStr, info, pageWidth, pageHeight, palette, brightness);
            });
        }
    }

    _renderPDFOverlay(pdf, coordsStr, info, pageWidth, pageHeight, palette, brightness) {
        const pos = Utils.calculateOverlayPosition({
            coords: coordsStr,
            containerWidth: pageWidth,
            containerHeight: pageHeight,
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
        });

        pdf.setDrawColor(...palette.border);
        pdf.setFillColor(...palette.background);
        pdf.rect(pos.left, pos.top, pos.width, pos.height, 'FD');
        
        const brightnessValue = Math.round(brightness * 2.55);
        pdf.setTextColor(brightnessValue, brightnessValue, brightnessValue);

        const plainText = info.text.replace(/<[^>]*>/g, '\n').trim();
        
        const { fontSize, lines } = this._calculatePDFFontSize(pdf, plainText, pos.width, pos.height, info.fontSize);
        pdf.setFontSize(fontSize);
        
        const padding = CONFIG.OVERLAY.PADDING;
        pdf.text(lines, pos.left + padding, pos.top + padding, { align: 'justify', baseline: 'top' });
    }

    _calculatePDFFontSize(pdf, text, width, height, specifiedSize) {
        const { MIN_FONT_SIZE, MAX_FONT_SIZE, PADDING } = CONFIG.OVERLAY;
        const availableWidth = width - PADDING * 2;
        const availableHeight = height - PADDING * 2;
        
        if (typeof specifiedSize === 'number') {
            pdf.setFontSize(specifiedSize);
            return { fontSize: specifiedSize, lines: pdf.splitTextToSize(text, availableWidth) };
        }

        for (let size = MAX_FONT_SIZE; size >= MIN_FONT_SIZE; size--) {
            pdf.setFontSize(size);
            const lines = pdf.splitTextToSize(text, availableWidth);
            if (lines.length * pdf.getLineHeight() <= availableHeight) {
                return { fontSize: size, lines };
            }
        }
        
        pdf.setFontSize(MIN_FONT_SIZE);
        return { fontSize: MIN_FONT_SIZE, lines: pdf.splitTextToSize(text, availableWidth) };
    }
}
