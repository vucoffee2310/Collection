import { PageSpecParser, validateRange } from '../utils.js';

export class SplitModal {
    constructor(pdfExporter, pdfHandler, pageManager) {
        this.pdfExp = pdfExporter;
        this.pdf = pdfHandler;
        this.pageManager = pageManager;
        this.pdfName = '';
        
        this.elements = this._initElements();
        this._setupEventListeners();
    }
    
    _initElements() {
        return {
            modal: document.getElementById('split-modal'),
            closeBtn: document.getElementById('modal-close'),
            cancelBtn: document.getElementById('modal-cancel'),
            exportBtn: document.getElementById('modal-export'),
            totalPages: document.getElementById('modal-total-pages'),
            estimate: document.getElementById('modal-estimate'),
            inputs: {
                numFiles: document.getElementById('num-files'),
                pagesPerFile: document.getElementById('pages-per-file'),
                rangeStart: document.getElementById('range-start'),
                rangeEnd: document.getElementById('range-end'),
                customPages: document.getElementById('custom-pages'),
            }
        };
    }
    
    _setupEventListeners() {
        const { modal, closeBtn, cancelBtn, exportBtn } = this.elements;
        
        closeBtn?.addEventListener('click', () => this.hide());
        cancelBtn?.addEventListener('click', () => this.hide());
        exportBtn?.addEventListener('click', () => this.handleExport());
        
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.hide();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('active')) {
                this.hide();
            }
        });
        
        // Update estimate on any input change
        const updateEstimate = () => this.updateEstimate();
        document.querySelectorAll('input[name="split-mode"]').forEach(radio => {
            radio.addEventListener('change', updateEstimate);
        });
        
        Object.values(this.elements.inputs).forEach(input => {
            input?.addEventListener('input', updateEstimate);
        });
    }
    
    show(pdfName) {
        this.pdfName = pdfName;
        const totalPages = this.pdf.getNumPages();
        
        this.elements.totalPages.textContent = totalPages;
        
        // Set input constraints
        const { numFiles, pagesPerFile, rangeStart, rangeEnd } = this.elements.inputs;
        numFiles.max = totalPages;
        pagesPerFile.max = totalPages;
        rangeStart.max = totalPages;
        rangeEnd.max = totalPages;
        rangeEnd.value = totalPages;
        
        this.updateEstimate();
        this.elements.modal?.classList.add('active');
    }
    
    hide() {
        this.elements.modal?.classList.remove('active');
    }
    
    updateEstimate() {
        const mode = document.querySelector('input[name="split-mode"]:checked')?.value;
        const totalPages = this.pdf.getNumPages();
        
        const estimates = {
            'all': () => `${totalPages} PDF files (1 page each)`,
            
            'by-files': () => {
                const numFiles = parseInt(this.elements.inputs.numFiles.value || 2);
                const pagesPerFile = Math.ceil(totalPages / numFiles);
                return `${numFiles} PDF files (~${pagesPerFile} pages each)`;
            },
            
            'by-pages': () => {
                const pagesPerFile = parseInt(this.elements.inputs.pagesPerFile.value || 10);
                const numFiles = Math.ceil(totalPages / pagesPerFile);
                return `${numFiles} PDF files (${pagesPerFile} pages each)`;
            },
            
            'range': () => {
                const start = parseInt(this.elements.inputs.rangeStart.value || 1);
                const end = parseInt(this.elements.inputs.rangeEnd.value || totalPages);
                const validation = validateRange(start, end, totalPages);
                
                if (!validation.valid) return validation.error;
                
                const numPages = end - start + 1;
                return `1 PDF file (${numPages} pages)`;
            },
            
            'custom': () => {
                const spec = this.elements.inputs.customPages.value || '';
                const pages = PageSpecParser.parse(spec);
                const validPages = PageSpecParser.validate(pages, totalPages);
                
                if (validPages.length === 0) return 'Enter page numbers';
                if (validPages.length !== pages.length) {
                    return `⚠️ ${validPages.length} valid pages (some invalid)`;
                }
                
                return `1 PDF file (${validPages.length} pages)`;
            }
        };
        
        const estimate = estimates[mode]?.() || '-';
        this.elements.estimate.textContent = estimate;
    }
    
    async handleExport() {
        const mode = document.querySelector('input[name="split-mode"]:checked')?.value;
        if (!mode) {
            alert('Please select a split mode');
            return;
        }
        
        this.hide();
        
        const exportActions = {
            'all': () => this.pdfExp.splitPDF(this.pdfName, this.pageManager),
            
            'by-files': () => {
                const numFiles = parseInt(this.elements.inputs.numFiles.value || 2);
                return this.pdfExp.splitByNumberOfFiles(numFiles, this.pdfName, this.pageManager);
            },
            
            'by-pages': () => {
                const pagesPerFile = parseInt(this.elements.inputs.pagesPerFile.value || 10);
                return this.pdfExp.splitByPagesPerFile(pagesPerFile, this.pdfName, this.pageManager);
            },
            
            'range': () => {
                const start = parseInt(this.elements.inputs.rangeStart.value || 1);
                const end = parseInt(this.elements.inputs.rangeEnd.value || 1);
                return this.pdfExp.exportPageRange(start, end, this.pdfName, this.pageManager);
            },
            
            'custom': () => {
                const spec = this.elements.inputs.customPages.value || '';
                return this.pdfExp.exportSpecificPages(spec, this.pdfName, this.pageManager);
            }
        };
        
        try {
            await exportActions[mode]?.();
        } catch (e) {
            console.error('Export error:', e);
            alert(`Export failed: ${e.message}`);
        }
    }
}