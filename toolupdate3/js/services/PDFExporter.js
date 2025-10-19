import { CONFIG } from '../config.js';
import { yieldToMain, PageSpecParser, withErrorHandling, forceUIUpdate } from '../utils.js';

export class PDFExporter {
    constructor(pdf) {
        this.pdf = pdf;
        this.cache = new Map();
    }

    _rgba(str) {
        const [r = 0, g = 0, b = 0, a = 1] = (str?.match(/[\d.]+/g) || []).map(Number);
        return { r, g, b, a };
    }

    _fontStyle(weight, style) {
        const bold = weight === 'bold' || Number(weight) >= 700;
        const italic = style === 'italic' || style === 'oblique';
        return bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    }

    async _getCanvas(wrapper, pageNum, scale) {
        const key = `${pageNum}_${scale}`;
        if (this.cache.has(key)) return this.cache.get(key);
        
        const canvas = wrapper.querySelector('canvas') && scale === CONFIG.PDF.SCALE
            ? wrapper.querySelector('canvas')
            : await this.pdf.getRenderedPageCanvas(pageNum, scale);
        
        this.cache.set(key, canvas);
        return canvas;
    }

    async _toDataURL(canvas, pageNum) {
        const key = `blob_${pageNum}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
        const url = await new Promise(res => {
            const r = new FileReader();
            r.onloadend = () => res(r.result);
            r.readAsDataURL(blob);
        });

        this.cache.set(key, url);
        return url;
    }

    _getProps(overlay, wrapper) {
        const os = getComputedStyle(overlay);
        const ts = getComputedStyle(overlay.querySelector('.overlay-text'));
        const rect = overlay.getBoundingClientRect();
        const wRect = wrapper.getBoundingClientRect();

        return {
            x: rect.left - wRect.left, y: rect.top - wRect.top,
            w: overlay.offsetWidth, h: overlay.offsetHeight,
            bg: this._rgba(os.backgroundColor), border: this._rgba(os.borderColor),
            borderW: parseFloat(os.borderTopWidth), borderR: parseFloat(os.borderTopLeftRadius),
            opacity: parseFloat(os.opacity),
            pad: { top: parseFloat(os.paddingTop), left: parseFloat(os.paddingLeft),
                   right: parseFloat(os.paddingRight), bottom: parseFloat(os.paddingBottom) },
            txt: this._rgba(ts.color), fontSize: parseFloat(ts.fontSize),
            fontStyle: this._fontStyle(ts.fontWeight, ts.fontStyle),
            lineH: parseFloat(ts.lineHeight)
        };
    }

    async _preparePageData(wrapper, pageNum) {
        const canvas = await this._getCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
        const imageData = await this._toDataURL(canvas, pageNum);
        const overlays = Array.from(wrapper.querySelectorAll('.overlay'));

        return {
            pageNum, imageData,
            overlayProps: overlays.map(el => this._getProps(el, wrapper)),
            overlayElements: overlays,
            width: wrapper.clientWidth, height: wrapper.clientHeight
        };
    }

    _measureText(textEl) {
        const blocks = textEl.querySelectorAll('.merged-text-block');
        const measurements = [];
        let totalHeight = 0;

        if (blocks.length) {
            blocks.forEach(block => {
                const text = block.textContent?.trim();
                if (!text) return;
                
                const style = getComputedStyle(block);
                const rect = block.getBoundingClientRect();
                const margin = parseFloat(style.marginBottom);
                
                measurements.push({ text, height: rect.height, 
                    indent: parseFloat(style.textIndent), margin, isBlock: true });
                totalHeight += rect.height + margin;
            });
            if (measurements.length) totalHeight -= measurements[measurements.length - 1].margin;
        } else {
            const text = textEl.textContent?.trim();
            if (text) {
                measurements.push({ text, height: textEl.getBoundingClientRect().height, 
                    indent: 0, margin: 0, isSimple: true });
                totalHeight = measurements[0].height;
            }
        }

        return { measurements, totalHeight };
    }

    _addPageToPDF(pdf, data, isFirst) {
        const { imageData, overlayProps, overlayElements, width, height } = data;
        
        if (!isFirst) pdf.addPage([width, height], width > height ? 'l' : 'p');
        pdf.addImage(imageData, 'JPEG', 0, 0, width, height);

        // Draw backgrounds
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

        // Draw text
        overlayElements.forEach((overlay, idx) => {
            const p = overlayProps[idx];
            const textEl = overlay.querySelector('.overlay-text');
            if (!textEl) return;

            pdf.setFont(CONFIG.FONT.NAME, p.fontStyle);
            pdf.setFontSize(p.fontSize);
            pdf.setTextColor(p.txt.r, p.txt.g, p.txt.b);
            pdf.setGState(new jspdf.GState({ opacity: p.opacity }));

            const maxWidth = p.w - p.pad.left - p.pad.right;
            if (maxWidth <= 0) return;

            const { measurements, totalHeight } = this._measureText(textEl);
            if (!measurements.length) return;

            const availHeight = p.h - p.pad.top - p.pad.bottom;
            let curY = p.y + p.pad.top + Math.max(0, (availHeight - totalHeight) / 2);

            if (measurements[0].isSimple) {
                const lines = pdf.splitTextToSize(measurements[0].text, maxWidth);
                pdf.text(lines, p.x + p.pad.left, curY + p.fontSize * 0.85, {
                    maxWidth, lineHeightFactor: p.lineH / p.fontSize
                });
            } else {
                measurements.forEach(m => {
                    const lines = pdf.splitTextToSize(m.text, maxWidth - m.indent);
                    pdf.text(lines, p.x + p.pad.left + m.indent, curY + p.fontSize * 0.85, {
                        baseline: 'alphabetic', lineHeightFactor: p.lineH / p.fontSize
                    });
                    curY += m.height + m.margin;
                });
            }
        });

        pdf.setGState(new jspdf.GState({ opacity: 1 }));
    }

    async _embedFont(pdf) {
        const font = await this.pdf.loadFont();
        if (font) {
            pdf.addFileToVFS(`${CONFIG.FONT.NAME}.ttf`, font);
            ['normal', 'bold', 'italic', 'bolditalic'].forEach(style =>
                pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, style));
        }
    }

    async _createPDF(wrapper) {
        const pdf = new jspdf.jsPDF({
            orientation: wrapper.clientWidth > wrapper.clientHeight ? 'l' : 'p',
            unit: 'pt', format: [wrapper.clientWidth, wrapper.clientHeight], compress: true
        });
        await this._embedFont(pdf);
        return pdf;
    }

    async _export(pageNumbers, filename, mode, ui) {
        return withErrorHandling(async () => {
            const indicator = ui.showSavingIndicator('Loading font...');
            await forceUIUpdate();

            try {
                await this._embedFont(new jspdf.jsPDF());
                const { groupSize, separate } = mode;

                if (separate) {
                    // Individual PDFs
                    for (let i = 0; i < pageNumbers.length; i++) {
                        const pageNum = pageNumbers[i];
                        indicator.textContent = `Exporting page ${pageNum} (${i + 1}/${pageNumbers.length})...`;

                        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
                        if (!wrapper) continue;

                        const pdf = await this._createPDF(wrapper);
                        const data = await this._preparePageData(wrapper, pageNum);
                        this._addPageToPDF(pdf, data, true);

                        pdf.save(`${filename}_page_${String(pageNum).padStart(3, '0')}.pdf`);
                        if (i % 3 === 0) {
                            this.cache.clear();
                            await new Promise(r => setTimeout(r, 100));
                        }
                    }
                } else if (groupSize) {
                    // Grouped PDFs
                    const totalGroups = Math.ceil(pageNumbers.length / groupSize);
                    for (let i = 0; i < pageNumbers.length; i += groupSize) {
                        const group = pageNumbers.slice(i, i + groupSize);
                        const [start, end] = [group[0], group[group.length - 1]];

                        indicator.textContent = `Creating file ${Math.floor(i / groupSize) + 1}/${totalGroups}...`;

                        const wrapper = document.querySelector(`#page-wrapper-${start}`);
                        const pdf = await this._createPDF(wrapper);

                        for (let j = 0; j < group.length; j++) {
                            const w = document.querySelector(`#page-wrapper-${group[j]}`);
                            if (w) this._addPageToPDF(pdf, await this._preparePageData(w, group[j]), j === 0);
                        }

                        pdf.save(`${filename}_pages_${String(start).padStart(3, '0')}_to_${String(end).padStart(3, '0')}.pdf`);
                        this.cache.clear();
                        await new Promise(r => setTimeout(r, 300));
                    }
                } else {
                    // Single combined PDF
                    const wrapper = document.querySelector(`#page-wrapper-${pageNumbers[0]}`);
                    const pdf = await this._createPDF(wrapper);

                    for (let i = 0; i < pageNumbers.length; i++) {
                        indicator.textContent = `Processing page ${pageNumbers[i]} (${i + 1}/${pageNumbers.length})...`;
                        const w = document.querySelector(`#page-wrapper-${pageNumbers[i]}`);
                        if (w) this._addPageToPDF(pdf, await this._preparePageData(w, pageNumbers[i]), i === 0);
                        if (i % 5 === 0) await yieldToMain();
                    }

                    indicator.textContent = 'Saving PDF...';
                    await yieldToMain();
                    pdf.save(filename);
                }

                this.cache.clear();
                return true;
            } finally {
                ui.removeSavingIndicator(indicator);
            }
        }, 'Export failed');
    }

    async save(name, ui) {
        const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
        return this._export(Array.from({ length: total }, (_, i) => i + 1),
            `${name}_export.pdf`, {}, ui);
    }

    async saveSinglePage(pageNum, name, ui) {
        return this._export([pageNum], `${name}_page_${String(pageNum).padStart(3, '0')}.pdf`, {}, ui);
    }

    async splitPDF(name, ui) {
        const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
        if (!confirm(`Split ${total} pages into individual files?`)) return;
        return this._export(Array.from({ length: total }, (_, i) => i + 1), name, { separate: true }, ui);
    }

    async splitByNumberOfFiles(numFiles, name, ui) {
        const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
        const pagesPerFile = Math.ceil(total / numFiles);
        if (!confirm(`Split ${total} pages into ${numFiles} files (~${pagesPerFile} pages each)?`)) return;
        return this._export(Array.from({ length: total }, (_, i) => i + 1), name, { groupSize: pagesPerFile }, ui);
    }

    async splitByPagesPerFile(pagesPerFile, name, ui) {
        const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
        const numFiles = Math.ceil(total / pagesPerFile);
        if (!confirm(`Split into groups of ${pagesPerFile} pages (${numFiles} files)?`)) return;
        return this._export(Array.from({ length: total }, (_, i) => i + 1), name, { groupSize: pagesPerFile }, ui);
    }

    async exportPageRange(start, end, name, ui) {
        if (start > end) return alert('Start page must be ≤ end page');
        return this._export(Array.from({ length: end - start + 1 }, (_, i) => start + i),
            `${name}_pages_${String(start).padStart(3, '0')}_to_${String(end).padStart(3, '0')}.pdf`, {}, ui);
    }

    async exportSpecificPages(pageSpec, name, ui) {
        const pages = PageSpecParser.parse(pageSpec);
        if (!pages.length) return alert('Invalid page specification');

        const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
        const valid = PageSpecParser.validate(pages, total);
        if (valid.length !== pages.length) {
            return alert(`Invalid pages: ${pages.filter(p => !valid.includes(p)).join(', ')}\nMax: ${total}`);
        }

        if (!confirm(`Export ${valid.length} pages?\n\nPages: ${PageSpecParser.format(valid)}`)) return;

        const filename = valid.length === 1
            ? `${name}_page_${String(valid[0]).padStart(3, '0')}.pdf`
            : `${name}_selected_${valid.length}_pages.pdf`;

        return this._export(valid, filename, {}, ui);
    }

    async savePageAsImage(pageNum, name, format = 'png') {
        return withErrorHandling(async () => {
            const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
            const canvas = wrapper?.querySelector('canvas');
            if (!canvas) throw new Error(`Page ${pageNum} not rendered`);

            const blob = await new Promise(res => canvas.toBlob(res, `image/${format}`, 0.95));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}_page_${String(pageNum).padStart(3, '0')}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'Image export failed');
    }
}