import { PageSpecParser, validateRange } from '../utils.js';

export class SplitModal {
    constructor(pdfExporter, pdfHandler, pageManager) {
        this.exp = pdfExporter;
        this.pdf = pdfHandler;
        this.pm = pageManager;
        this.pdfName = '';

        this.el = {
            modal: document.getElementById('split-modal'),
            close: document.getElementById('modal-close'),
            cancel: document.getElementById('modal-cancel'),
            export: document.getElementById('modal-export'),
            total: document.getElementById('modal-total-pages'),
            estimate: document.getElementById('modal-estimate'),
            numFiles: document.getElementById('num-files'),
            pagesPerFile: document.getElementById('pages-per-file'),
            rangeStart: document.getElementById('range-start'),
            rangeEnd: document.getElementById('range-end'),
            customPages: document.getElementById('custom-pages'),
        };

        this._init();
    }

    _init() {
        this.el.close.onclick = () => this.hide();
        this.el.cancel.onclick = () => this.hide();
        this.el.export.onclick = () => this._export();
        this.el.modal.onclick = (e) => e.target === this.el.modal && this.hide();
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.el.modal.classList.contains('active')) this.hide();
        });

        const update = () => this._updateEstimate();
        document.querySelectorAll('input[name="split-mode"]').forEach(r => r.onchange = update);
        Object.values(this.el).forEach(el => el.oninput && (el.oninput = update));
    }

    show(pdfName) {
        this.pdfName = pdfName;
        const total = this.pdf.getNumPages();
        
        this.el.total.textContent = total;
        [this.el.numFiles, this.el.pagesPerFile, this.el.rangeStart, this.el.rangeEnd]
            .forEach(el => el.max = total);
        this.el.rangeEnd.value = total;
        
        this._updateEstimate();
        this.el.modal.classList.add('active');
    }

    hide() {
        this.el.modal.classList.remove('active');
    }

    _updateEstimate() {
        const mode = document.querySelector('input[name="split-mode"]:checked')?.value;
        const total = this.pdf.getNumPages();
        
        const estimates = {
            all: () => `${total} PDF files (1 page each)`,
            'by-files': () => {
                const n = parseInt(this.el.numFiles.value || 2);
                return `${n} PDF files (~${Math.ceil(total / n)} pages each)`;
            },
            'by-pages': () => {
                const p = parseInt(this.el.pagesPerFile.value || 10);
                return `${Math.ceil(total / p)} PDF files (${p} pages each)`;
            },
            range: () => {
                const s = parseInt(this.el.rangeStart.value || 1);
                const e = parseInt(this.el.rangeEnd.value || total);
                const v = validateRange(s, e, total);
                return v.valid ? `1 PDF file (${e - s + 1} pages)` : v.error;
            },
            custom: () => {
                const pages = PageSpecParser.parse(this.el.customPages.value || '');
                const valid = PageSpecParser.validate(pages, total);
                if (!valid.length) return 'Enter page numbers';
                if (valid.length !== pages.length) return `⚠️ ${valid.length} valid pages (some invalid)`;
                return `1 PDF file (${valid.length} pages)`;
            }
        };

        this.el.estimate.textContent = estimates[mode]?.() || '-';
    }

    async _export() {
        const mode = document.querySelector('input[name="split-mode"]:checked')?.value;
        if (!mode) return alert('Please select a split mode');
        
        this.hide();

        const actions = {
            all: () => this.exp.splitPDF(this.pdfName, this.pm),
            'by-files': () => this.exp.splitByNumberOfFiles(
                parseInt(this.el.numFiles.value || 2), this.pdfName, this.pm),
            'by-pages': () => this.exp.splitByPagesPerFile(
                parseInt(this.el.pagesPerFile.value || 10), this.pdfName, this.pm),
            range: () => this.exp.exportPageRange(
                parseInt(this.el.rangeStart.value || 1),
                parseInt(this.el.rangeEnd.value || 1), this.pdfName, this.pm),
            custom: () => this.exp.exportSpecificPages(
                this.el.customPages.value || '', this.pdfName, this.pm)
        };

        try {
            await actions[mode]?.();
        } catch (e) {
            console.error('Export error:', e);
            alert(`Export failed: ${e.message}`);
        }
    }
}