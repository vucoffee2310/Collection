import { CONFIG } from '../config.js';

const CAL = { x: 1, y: 1, w: 1, h: 1, borderWidth: 1, borderRadius: 1, opacity: 1, 
              paddingTop: 1, paddingLeft: 1, paddingRight: 1, fontSize: 0.99, baselineMultiplier: 1.13 };

export class PDFExporter {
    constructor(pdf) { 
        this.pdf = pdf;
        this.canvasCache = new Map();
    }

    _rgba(str) {
        const [r = 0, g = 0, b = 0, a = 1] = (str?.match(/(\d+(\.\d+)?)/g) || []).map(Number);
        return { r, g, b, a };
    }

    _fontStyle(w, s) {
        const bold = w === 'bold' || Number(w) >= 700;
        const italic = s === 'italic' || s === 'oblique';
        return bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    }

    _getProps(o, dims) {
        const s = getComputedStyle(o);
        const t = o.querySelector('.overlay-text');
        const ts = getComputedStyle(t);

        return {
            x: ((parseFloat(o.style.left) / 100) * dims.w) * CAL.x,
            y: ((parseFloat(o.style.top) / 100) * dims.h) * CAL.y,
            w: ((parseFloat(o.style.width) / 100) * dims.w) * CAL.w,
            h: ((parseFloat(o.style.height) / 100) * dims.h) * CAL.h,
            bg: this._rgba(s.backgroundColor),
            border: this._rgba(s.borderColor),
            borderW: parseFloat(s.borderTopWidth) * CAL.borderWidth,
            borderR: parseFloat(s.borderTopLeftRadius) * CAL.borderRadius,
            opacity: parseFloat(s.opacity) * CAL.opacity,
            pad: {
                top: parseFloat(s.paddingTop) * CAL.paddingTop,
                left: parseFloat(s.paddingLeft) * CAL.paddingLeft,
                right: parseFloat(s.paddingRight) * CAL.paddingRight,
            },
            txt: this._rgba(ts.color),
            fontSize: parseFloat(ts.fontSize) * CAL.fontSize,
            fontStyle: this._fontStyle(ts.fontWeight, ts.fontStyle),
            align: ts.textAlign === 'justify' ? 'justify' : 'left',
            lineH: parseFloat(s.lineHeight),
        };
    }

    async _getPageCanvas(wrapper, pageNum, scale) {
        const cacheKey = `${pageNum}_${scale}`;
        
        if (this.canvasCache.has(cacheKey)) {
            return this.canvasCache.get(cacheKey);
        }

        const existingCanvas = wrapper.querySelector('canvas');
        if (existingCanvas && scale === CONFIG.PDF.SCALE) {
            const cloned = document.createElement('canvas');
            cloned.width = existingCanvas.width;
            cloned.height = existingCanvas.height;
            const ctx = cloned.getContext('2d', { alpha: false });
            ctx.drawImage(existingCanvas, 0, 0);
            
            this.canvasCache.set(cacheKey, cloned);
            return cloned;
        }

        const canvas = await this.pdf.getRenderedPageCanvas(pageNum, scale);
        this.canvasCache.set(cacheKey, canvas);
        return canvas;
    }

    async _preparePageData(wrapper, pageNum, dims) {
        const canvas = await this._getPageCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
        const imageData = canvas.toDataURL('image/jpeg', 0.92);
        
        const overlays = Array.from(wrapper.querySelectorAll('.overlay'));
        const overlayProps = overlays.map(el => this._getProps(el, dims));
        const overlayElements = overlays;
        
        return {
            pageNum,
            imageData,
            overlayProps,
            overlayElements
        };
    }

    _addPageToPDF(pdf, pageData, dims, isFirst) {
        const { imageData, overlayProps, overlayElements } = pageData;
        
        if (!isFirst) {
            pdf.addPage([dims.w, dims.h], dims.w > dims.h ? 'l' : 'p');
        }
        
        pdf.addImage(imageData, 'JPEG', 0, 0, dims.w, dims.h);
        
        const opaque = new jspdf.GState({ opacity: 1 });
        
        overlayProps.forEach(p => {
            pdf.setGState(new jspdf.GState({ opacity: p.opacity }));
            if (p.bg.a > 0) {
                pdf.setGState(new jspdf.GState({ opacity: p.opacity * p.bg.a }));
                pdf.setFillColor(p.bg.r, p.bg.g, p.bg.b);
                pdf.roundedRect(p.x, p.y, p.w, p.h, p.borderR, p.borderR, 'F');
            }
            if (p.borderW > 0) {
                pdf.setLineWidth(p.borderW);
                pdf.setDrawColor(p.border.r, p.border.g, p.border.b);
                pdf.roundedRect(p.x, p.y, p.w, p.h, p.borderR, p.borderR, 'S');
            }
        });
        pdf.setGState(opaque);
        
        overlayElements.forEach((o, idx) => {
            const p = overlayProps[idx];
            const t = o.querySelector('.overlay-text');
            const blocks = t.querySelectorAll('.merged-text-block');

            pdf.setFont(CONFIG.FONT.NAME, p.fontStyle);
            pdf.setFontSize(p.fontSize);
            pdf.setTextColor(p.txt.r, p.txt.g, p.txt.b);
            pdf.setGState(new jspdf.GState({ opacity: p.opacity }));

            const maxW = p.w - p.pad.left - p.pad.right;
            if (maxW <= 0) return;

            let curY = p.y + p.pad.top + (p.fontSize * CAL.baselineMultiplier);

            if (blocks.length > 0) {
                blocks.forEach(bl => {
                    const bs = getComputedStyle(bl);
                    const indent = parseFloat(bs.textIndent);
                    const margin = parseFloat(bs.marginBottom);
                    const lines = pdf.splitTextToSize(bl.textContent || '', maxW - indent);
                    
                    pdf.text(lines, p.x + p.pad.left + indent, curY, {
                        baseline: 'alphabetic',
                        lineHeightFactor: p.lineH / p.fontSize
                    });

                    curY += lines.length * p.lineH + margin;
                });
            } else {
                const txt = t.textContent || '';
                if (txt) {
                    pdf.text(txt, p.x + p.pad.left, curY, {
                        align: p.align, 
                        maxWidth: maxW, 
                        lineHeightFactor: p.lineH / p.fontSize
                    });
                }
            }
        });
        pdf.setGState(opaque);
    }

    async save(name, ui) {
        const ind = ui.showSavingIndicator('Processing...');
        
        try {
            const ws = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
            if (!ws.length) throw new Error('No pages rendered.');

            const dims = { w: ws[0].clientWidth, h: ws[0].clientHeight };
            const pdf = new jspdf.jsPDF({ 
                orientation: dims.w > dims.h ? 'l' : 'p', 
                unit: 'pt', 
                format: [dims.w, dims.h],
                compress: true
            });

            const font = await this.pdf.loadFont();
            if (font) {
                pdf.addFileToVFS(`${CONFIG.FONT.NAME}.ttf`, font);
                ['normal', 'bold', 'italic', 'bolditalic'].forEach(st => {
                    pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, st);
                });
            }

            const totalPages = ws.length;
            const batchSize = 5;
            
            for (let i = 0; i < totalPages; i += batchSize) {
                const batch = Array.from(ws).slice(i, i + batchSize);
                
                const preparedPages = await Promise.all(
                    batch.map((w, idx) => {
                        const pageNum = i + idx + 1;
                        ind.textContent = `Page ${pageNum} / ${totalPages}`;
                        return this._preparePageData(w, pageNum, dims);
                    })
                );
                
                preparedPages.forEach((pageData, idx) => {
                    const globalIndex = i + idx;
                    this._addPageToPDF(pdf, pageData, dims, globalIndex === 0);
                });
                
                await new Promise(r => setTimeout(r, 10));
            }

            ind.textContent = 'Saving...';
            await new Promise(r => setTimeout(r, 50));
            pdf.save(`${name}_export.pdf`);
            
            this.canvasCache.clear();
        } catch (e) {
            console.error('PDF Export Error:', e);
            alert(`Could not save as PDF: ${e.message}`);
        } finally {
            ui.removeSavingIndicator(ind);
        }
    }
}