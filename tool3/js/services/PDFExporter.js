import { CONFIG } from '../config.js';

// --- START OF CALIBRATION CONFIGURATION ---
// Adjust these multipliers to fine-tune the final PDF output.
// 1.0 = no change. 1.05 = 5% increase. 0.98 = 2% decrease.
const CALIBRATION_MULTIPLIERS = {
    x: 1.0,
    y: 1.0,
    w: 1.0, // Add a tiny bit of width to help with text justification
    h: 1.0, // Add a tiny bit of height to help with text justification
    borderWidth: 1.0,
    borderRadius: 1.0,
    opacity: 1.0,
    paddingTop: 1.0,
    paddingLeft: 1.0,
    paddingRight: 1.0,
    fontSize: 0.993,
    // This special multiplier adjusts the vertical position of the first line of text.
    baselineMultiplier: 1.13, 
};
// --- END OF CALIBRATION CONFIGURATION ---

export class PDFExporter {
    constructor(pdfHandler) {
        this.pdfHandler = pdfHandler;
    }

    _parseRgba(rgbaString) {
        const match = (rgbaString || '').match(/(\d+(\.\d+)?)/g);
        if (!match) return { r: 0, g: 0, b: 0, a: 1 };
        const [r, g, b, a] = match.map(Number);
        return { r, g, b, a: a === undefined ? 1 : a };
    }

    _getFontStyle(weight, style) {
        const isBold = weight === 'bold' || Number(weight) >= 700;
        const isItalic = style === 'italic' || style === 'oblique';
        if (isBold && isItalic) return 'bolditalic';
        if (isBold) return 'bold';
        if (isItalic) return 'italic';
        return 'normal';
    }

    async save(fileName, uiManager) {
        const indicator = uiManager.showSavingIndicator('Initializing Calibrated Exporter...');
        try {
            const pageWrappers = Array.from(document.querySelectorAll('.page-wrapper:not(.page-placeholder)'));
            if (pageWrappers.length === 0) throw new Error('No pages rendered.');

            const firstPage = pageWrappers[0];
            const dims = { w: firstPage.clientWidth, h: firstPage.clientHeight };
            const orientation = dims.w > dims.h ? 'l' : 'p';

            const pdf = new jspdf.jsPDF({ orientation, unit: 'pt', format: [dims.w, dims.h] });

            const fontBase64 = await this.pdfHandler.loadFont();
            if (fontBase64) {
                pdf.addFileToVFS(`${CONFIG.FONT.NAME}.ttf`, fontBase64);
                pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, 'normal');
                pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, 'bold');
                pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, 'italic');
                pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, 'bolditalic');
            }

            const opaqueGState = new jspdf.GState({ opacity: 1 });

            for (let i = 0; i < pageWrappers.length; i++) {
                const wrapper = pageWrappers[i];
                const pageNum = i + 1;
                indicator.textContent = `Analyzing Page ${pageNum} Layout...`;

                if (i > 0) pdf.addPage([dims.w, dims.h], orientation);

                const bgCanvas = await this.pdfHandler.getRenderedPageCanvas(pageNum, CONFIG.PDF.RENDER_SCALE);
                pdf.addImage(bgCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, dims.w, dims.h);

                const overlays = wrapper.querySelectorAll('.overlay');
                const detectedProperties = [];

                // --- PASS 1: Detect all computed properties and render GEOMETRY ---
                for (const overlayEl of overlays) {
                    const style = getComputedStyle(overlayEl);
                    const textEl = overlayEl.querySelector('.overlay-text');
                    const textStyle = getComputedStyle(textEl);
                    
                    // --- Apply calibration multipliers to the detected properties ---
                    const props = {
                        x: ((parseFloat(overlayEl.style.left) / 100) * dims.w) * CALIBRATION_MULTIPLIERS.x,
                        y: ((parseFloat(overlayEl.style.top) / 100) * dims.h) * CALIBRATION_MULTIPLIERS.y,
                        w: ((parseFloat(overlayEl.style.width) / 100) * dims.w) * CALIBRATION_MULTIPLIERS.w,
                        h: ((parseFloat(overlayEl.style.height) / 100) * dims.h) * CALIBRATION_MULTIPLIERS.h,
                        bgStyle: this._parseRgba(style.backgroundColor),
                        borderStyle: this._parseRgba(style.borderColor),
                        borderWidth: parseFloat(style.borderTopWidth) * CALIBRATION_MULTIPLIERS.borderWidth,
                        borderRadius: parseFloat(style.borderTopLeftRadius) * CALIBRATION_MULTIPLIERS.borderRadius,
                        opacity: parseFloat(style.opacity) * CALIBRATION_MULTIPLIERS.opacity,
                        padding: {
                            top: parseFloat(style.paddingTop) * CALIBRATION_MULTIPLIERS.paddingTop,
                            left: parseFloat(style.paddingLeft) * CALIBRATION_MULTIPLIERS.paddingLeft,
                            right: parseFloat(style.paddingRight) * CALIBRATION_MULTIPLIERS.paddingRight,
                        },
                        text: textEl.textContent,
                        textStyle: this._parseRgba(textStyle.color),
                        fontSize: parseFloat(textStyle.fontSize) * CALIBRATION_MULTIPLIERS.fontSize,
                        fontStyle: this._getFontStyle(textStyle.fontWeight, textStyle.fontStyle),
                        textAlign: textStyle.textAlign === 'justify' ? 'justify' : 'left',
                    };
                    detectedProperties.push(props);

                    const elementGState = new jspdf.GState({ opacity: props.opacity });
                    pdf.setGState(elementGState);

                    if (props.bgStyle.a > 0) {
                        const bgGState = new jspdf.GState({ opacity: props.opacity * props.bgStyle.a });
                        pdf.setGState(bgGState);
                        pdf.setFillColor(props.bgStyle.r, props.bgStyle.g, props.bgStyle.b);
                        pdf.roundedRect(props.x, props.y, props.w, props.h, props.borderRadius, props.borderRadius, 'F');
                        pdf.setGState(elementGState);
                    }

                    if (props.borderWidth > 0) {
                        pdf.setLineWidth(props.borderWidth);
                        pdf.setDrawColor(props.borderStyle.r, props.borderStyle.g, props.borderStyle.b);
                        pdf.roundedRect(props.x, props.y, props.w, props.h, props.borderRadius, props.borderRadius, 'S');
                    }
                     pdf.setGState(opaqueGState);
                }

                indicator.textContent = `Rendering Page ${pageNum} Content...`;
                // --- PASS 2: Render all TEXT on top of the completed geometry layer ---
                for (const props of detectedProperties) {
                    if (props.text && props.w > 0) {
                        const textMaxWidth = props.w - props.padding.left - props.padding.right;

                        if (textMaxWidth > 0) {
                            pdf.setFont(CONFIG.FONT.NAME, props.fontStyle);
                            pdf.setFontSize(props.fontSize);
                            pdf.setTextColor(props.textStyle.r, props.textStyle.g, props.textStyle.b);
                            
                            const textGState = new jspdf.GState({ opacity: props.opacity });
                            pdf.setGState(textGState);
                            
                            // Use the configurable baseline multiplier for fine-tuning
                            const firstBaselineY = props.y + props.padding.top + (props.fontSize * CALIBRATION_MULTIPLIERS.baselineMultiplier);

                            pdf.text(props.text, props.x + props.padding.left, firstBaselineY, {
                                align: props.textAlign,
                                maxWidth: textMaxWidth,
                                baseline: 'alphabetic',
                                lineHeightFactor: 1.35
                            });

                            pdf.setGState(opaqueGState);
                        }
                    }
                }
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