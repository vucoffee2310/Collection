import { CONFIG } from '../config.js';

// --- START OF CALIBRATION CONFIGURATION ---
const CALIBRATION_MULTIPLIERS = {
    x: 1.0, y: 1.0, w: 1.0, h: 1.0,
    borderWidth: 1.0, borderRadius: 1.0, opacity: 1.0,
    paddingTop: 1.0, paddingLeft: 1.0, paddingRight: 1.0,
    fontSize: 0.993, baselineMultiplier: 1.13, 
};
// --- END OF CALIBRATION CONFIGURATION ---

export class PDFExporter {
    constructor(pdfHandler) {
        this.pdfHandler = pdfHandler;
    }

    _parseRgba(rgbaString) {
        const [r = 0, g = 0, b = 0, a = 1] = (rgbaString?.match(/(\d+(\.\d+)?)/g) || []).map(Number);
        return { r, g, b, a };
    }

    _getFontStyle(weight, style) {
        const isBold = weight === 'bold' || Number(weight) >= 700;
        const isItalic = style === 'italic' || style === 'oblique';
        if (isBold && isItalic) return 'bolditalic';
        if (isBold) return 'bold';
        if (isItalic) return 'italic';
        return 'normal';
    }

    _getOverlayProperties(overlayEl, dims) {
        const style = getComputedStyle(overlayEl);
        const textEl = overlayEl.querySelector('.overlay-text');
        const textStyle = getComputedStyle(textEl);
        const C = CALIBRATION_MULTIPLIERS;

        return {
            x: ((parseFloat(overlayEl.style.left) / 100) * dims.w) * C.x,
            y: ((parseFloat(overlayEl.style.top) / 100) * dims.h) * C.y,
            w: ((parseFloat(overlayEl.style.width) / 100) * dims.w) * C.w,
            h: ((parseFloat(overlayEl.style.height) / 100) * dims.h) * C.h,
            bgStyle: this._parseRgba(style.backgroundColor),
            borderStyle: this._parseRgba(style.borderColor),
            borderWidth: parseFloat(style.borderTopWidth) * C.borderWidth,
            borderRadius: parseFloat(style.borderTopLeftRadius) * C.borderRadius,
            opacity: parseFloat(style.opacity) * C.opacity,
            padding: {
                top: parseFloat(style.paddingTop) * C.paddingTop,
                left: parseFloat(style.paddingLeft) * C.paddingLeft,
                right: parseFloat(style.paddingRight) * C.paddingRight,
            },
            textStyle: this._parseRgba(textStyle.color),
            fontSize: parseFloat(textStyle.fontSize) * C.fontSize,
            fontStyle: this._getFontStyle(textStyle.fontWeight, textStyle.fontStyle),
            textAlign: textStyle.textAlign === 'justify' ? 'justify' : 'left',
            lineHeightPx: parseFloat(style.lineHeight), // Get computed line-height in pixels
        };
    }

    async save(fileName, uiManager) {
        const indicator = uiManager.showSavingIndicator('Initializing Calibrated Exporter...');
        try {
            const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
            if (wrappers.length === 0) throw new Error('No pages rendered.');

            const dims = { w: wrappers[0].clientWidth, h: wrappers[0].clientHeight };
            const orientation = dims.w > dims.h ? 'l' : 'p';
            const pdf = new jspdf.jsPDF({ orientation, unit: 'pt', format: [dims.w, dims.h] });

            const fontBase64 = await this.pdfHandler.loadFont();
            if (fontBase64) {
                pdf.addFileToVFS(`${CONFIG.FONT.NAME}.ttf`, fontBase64);
                ['normal', 'bold', 'italic', 'bolditalic'].forEach(style => {
                    pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, style);
                });
            }

            const opaqueGState = new jspdf.GState({ opacity: 1 });

            for (let i = 0; i < wrappers.length; i++) {
                const wrapper = wrappers[i];
                const pageNum = i + 1;
                indicator.textContent = `Analyzing Page ${pageNum} Layout...`;
                if (i > 0) pdf.addPage([dims.w, dims.h], orientation);
                
                const bgCanvas = await this.pdfHandler.getRenderedPageCanvas(pageNum, CONFIG.PDF.RENDER_SCALE);
                pdf.addImage(bgCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, dims.w, dims.h);

                const overlays = Array.from(wrapper.querySelectorAll('.overlay'));
                const detectedProps = overlays.map(el => this._getOverlayProperties(el, dims));

                // PASS 1: Render GEOMETRY
                detectedProps.forEach(props => {
                    pdf.setGState(new jspdf.GState({ opacity: props.opacity }));
                    if (props.bgStyle.a > 0) {
                        pdf.setGState(new jspdf.GState({ opacity: props.opacity * props.bgStyle.a }));
                        pdf.setFillColor(props.bgStyle.r, props.bgStyle.g, props.bgStyle.b);
                        pdf.roundedRect(props.x, props.y, props.w, props.h, props.borderRadius, props.borderRadius, 'F');
                    }
                    if (props.borderWidth > 0) {
                        pdf.setLineWidth(props.borderWidth);
                        pdf.setDrawColor(props.borderStyle.r, props.borderStyle.g, props.borderStyle.b);
                        pdf.roundedRect(props.x, props.y, props.w, props.h, props.borderRadius, props.borderRadius, 'S');
                    }
                });
                pdf.setGState(opaqueGState);

                indicator.textContent = `Rendering Page ${pageNum} Content...`;
                
                // --- PASS 2: Render TEXT using computed styles for high fidelity ---
                overlays.forEach((overlayEl, overlayIndex) => {
                    const props = detectedProps[overlayIndex];
                    const textEl = overlayEl.querySelector('.overlay-text');
                    const mergedBlocks = textEl.querySelectorAll('.merged-text-block');

                    pdf.setFont(CONFIG.FONT.NAME, props.fontStyle);
                    pdf.setFontSize(props.fontSize);
                    pdf.setTextColor(props.textStyle.r, props.textStyle.g, props.textStyle.b);
                    pdf.setGState(new jspdf.GState({ opacity: props.opacity }));

                    const textMaxWidth = props.w - props.padding.left - props.padding.right;
                    if (textMaxWidth <= 0) return;

                    let currentY = props.y + props.padding.top + (props.fontSize * CALIBRATION_MULTIPLIERS.baselineMultiplier);

                    if (mergedBlocks.length > 0) {
                        // --- Logic for MERGED overlays, using computed styles ---
                        mergedBlocks.forEach(block => {
                            const blockStyle = getComputedStyle(block);
                            const indentPt = parseFloat(blockStyle.textIndent);
                            const marginBottomPt = parseFloat(blockStyle.marginBottom);
                            const blockText = block.textContent || '';
                            
                            const textLines = pdf.splitTextToSize(blockText, textMaxWidth - indentPt);
                            
                            pdf.text(textLines, props.x + props.padding.left + indentPt, currentY, {
                                baseline: 'alphabetic',
                                lineHeightFactor: props.lineHeightPx / props.fontSize
                            });

                            const renderedHeight = textLines.length * props.lineHeightPx;
                            currentY += renderedHeight + marginBottomPt;
                        });

                    } else {
                        // --- Logic for STANDARD, non-merged overlays ---
                        const text = textEl.textContent || '';
                        if (text) {
                            pdf.text(text, props.x + props.padding.left, currentY, {
                                align: props.textAlign, 
                                maxWidth: textMaxWidth, 
                                lineHeightFactor: props.lineHeightPx / props.fontSize
                            });
                        }
                    }
                });
                pdf.setGState(opaqueGState);
            }

            indicator.textContent = 'Finalizing PDF...';
            pdf.save(`${fileName}_vector_export.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
            alert(`Could not save as PDF: ${error.message}`);
        } finally {
            uiManager.removeSavingIndicator(indicator);
        }
    }
}