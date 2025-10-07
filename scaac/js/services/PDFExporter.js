import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class PDFExporter {
    constructor(pdfHandler) {
        this.pdfHandler = pdfHandler;
    }

    async save(fileName, overlayData, paletteKey, brightness, opacity, uiManager) {
        const indicator = uiManager.showSavingIndicator('Generating Searchable PDF...');
        try {
            const pdfDoc = this.pdfHandler.pdfDoc;
            const pdf = await this._initializeJsPDF(pdfDoc);
            await this._renderAllPagesToPDF(pdf, pdfDoc, overlayData, paletteKey, brightness, opacity);
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

    async _renderAllPagesToPDF(pdf, pdfDoc, overlayData, paletteKey, brightness, opacity) {
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
                this._renderPDFOverlay(pdf, coordsStr, info, pageWidth, pageHeight, palette, brightness, opacity);
            });
        }
    }

    _renderPDFOverlay(pdf, coordsStr, info, pageWidth, pageHeight, palette, brightness, opacity) {
        const pos = Utils.calculateOverlayPosition({
            coords: coordsStr,
            containerWidth: pageWidth,
            containerHeight: pageHeight,
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
        });

        // --- FIX 1: Add a guard for invalid dimensions to prevent jsPDF from crashing ---
        if (pos.width <= 0 || pos.height <= 0) {
            console.warn('Skipping overlay with invalid dimensions:', { coords: coordsStr, calculated: pos });
            return;
        }

        const opacityValue = opacity / 100;

        // --- FIX 2: Correctly instantiate GState using the global jsPDF object ---
        // This ensures we are calling a valid constructor.
        const gState = new window.jspdf.jsPDF.GState({ opacity: opacityValue });
        pdf.setGState(gState);

        // Draw the semi-transparent background
        pdf.setDrawColor(...palette.border);
        pdf.setFillColor(...palette.background);
        pdf.rect(pos.left, pos.top, pos.width, pos.height, 'FD'); // FD = Fill and Stroke
        
        // Reset graphics state to make text fully opaque
        pdf.setGState(new window.jspdf.jsPDF.GState({ opacity: 1.0 }));

        // Set text color based on the brightness slider
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