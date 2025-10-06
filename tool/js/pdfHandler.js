import { showLoading, updatePageInfo, clearPdfContainer, createPageWrapper, addOverlaysToPage, showSavingIndicator, removeSavingIndicator } from './ui.js';
import { colorPalettes, DEFAULT_PALETTE_KEY } from './config.js';

let pdfDoc = null;
const FONT = { NAME: 'Bookerly', FILE: 'Bookerly-Regular.ttf', URL: './Bookerly-Regular.ttf' };
const pageRenderQueue = new Map();
let intersectionObserver = null;
let fontBase64 = null;

export const isPdfLoaded = () => pdfDoc !== null;

async function loadFontAsBase64() {
    if (fontBase64) return fontBase64;
    try {
        const response = await fetch(FONT.URL);
        if (!response.ok) throw new Error(`Font file not found at ${FONT.URL}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(fontBase64 = reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Failed to load custom font:", error);
        alert(`Error: Could not load "${FONT.FILE}". PDF will use default font.`);
        return null;
    }
}

async function renderPage(pageNum, overlayData) {
    const pageWrapper = document.getElementById(`page-wrapper-${pageNum}`);
    if (!pageWrapper || pageWrapper.dataset.rendered) return;
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        pageWrapper.innerHTML = '';
        pageWrapper.classList.remove('page-placeholder');
        pageWrapper.appendChild(canvas);
        pageWrapper.dataset.rendered = "true";
        addOverlaysToPage(pageWrapper, pageNum, viewport, overlayData);
    } catch (error) {
        console.error(`Error rendering page ${pageNum}:`, error);
        pageWrapper.innerHTML = `<span>Error loading page ${pageNum}</span>`;
    }
}

export async function renderPdfPages(overlayData) {
    if (!pdfDoc) return;
    
    intersectionObserver?.disconnect();
    clearPdfContainer();
    pageRenderQueue.clear();
    
    const pages = await Promise.all(Array.from({ length: pdfDoc.numPages }, (_, i) => pdfDoc.getPage(i + 1)));
    
    pages.forEach((page, i) => {
        const pageNum = i + 1;
        const viewport = page.getViewport({ scale: 1.5 });
        const wrapper = createPageWrapper(pageNum, viewport);
        wrapper && pageRenderQueue.set(wrapper, () => renderPage(pageNum, overlayData));
    });
    
    intersectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const renderFunc = pageRenderQueue.get(entry.target);
                if (renderFunc) {
                    renderFunc();
                    pageRenderQueue.delete(entry.target);
                    observer.unobserve(entry.target);
                }
            }
        });
    }, { rootMargin: '200px 0px' });
    
    document.querySelectorAll('.page-placeholder').forEach(el => intersectionObserver.observe(el));
}

export async function loadPDF(fileData, initialOverlayData) {
    try {
        showLoading('Loading PDF...');
        pdfDoc = await pdfjsLib.getDocument(fileData).promise;
        updatePageInfo(`Total pages: ${pdfDoc.numPages}`);
        await renderPdfPages(initialOverlayData);
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF file: ' + error.message);
        pdfDoc = null;
    }
}

function calculateOptimalFontSize(pdf, text, width, height, { minSize, maxSize, padding }) {
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    
    for (let size = maxSize; size >= minSize; size--) {
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(text, availableWidth);
        if (lines.length * pdf.getLineHeight() <= availableHeight) {
            return { fontSize: size, lines };
        }
    }
    pdf.setFontSize(minSize);
    return { fontSize: minSize, lines: pdf.splitTextToSize(text, availableWidth) };
}

export async function saveAsPDF(originalFileName, overlayData, paletteKey) {
    if (!pdfDoc) return alert('No document loaded to save.');
    
    const PADDING = 5;
    const MIN_HEIGHT = 20;
    const palette = colorPalettes[paletteKey] || colorPalettes[DEFAULT_PALETTE_KEY];
    const indicator = showSavingIndicator();
    
    try {
        const fontData = await loadFontAsBase64();
        const { jsPDF } = window.jspdf;
        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        const pageHeight = 1000;
        const pageWidth = (viewport.width / viewport.height) * pageHeight;
        const pdf = new jsPDF({
            orientation: pageWidth > pageHeight ? 'l' : 'p',
            unit: 'pt',
            format: [pageWidth, pageHeight]
        });
        
        pdf.setLineHeightFactor(1.35);
        
        if (fontData) {
            pdf.addFileToVFS(FONT.FILE, fontData);
            pdf.addFont(FONT.FILE, FONT.NAME, 'normal');
            pdf.setFont(FONT.NAME, 'normal');
        } else {
            pdf.setFont('Helvetica', 'normal');
        }
        
        for (let i = 0; i < pdfDoc.numPages; i++) {
            const pageNum = i + 1;
            if (i > 0) pdf.addPage([pageWidth, pageHeight]);
            
            const page = await pdfDoc.getPage(pageNum);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const vp = page.getViewport({ scale: 2.0 });
            canvas.width = vp.width;
            canvas.height = vp.height;
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageWidth, pageHeight);
            
            const pageData = overlayData[`page_${pageNum}`];
            if (!pageData) continue;
            
            const scaleX = pageWidth / 1000;
            const scaleY = pageHeight / 1000;
            
            Object.entries(pageData).forEach(([coordsStr, info]) => {
                const [top, left, bottom, right] = JSON.parse(coordsStr);
                const x = left * scaleX;
                const y = top * scaleY;
                const width = (right - left) * scaleX;
                const height = Math.max((bottom - top) * scaleY, MIN_HEIGHT);
                
                pdf.setDrawColor(...palette.border);
                pdf.setFillColor(...palette.background);
                pdf.rect(x, y, width, height, 'FD');
                pdf.setTextColor(...palette.text);
                
                let fontSize, lines;
                if (typeof info.fontSize === 'number') {
                    fontSize = info.fontSize;
                    pdf.setFontSize(fontSize);
                    lines = pdf.splitTextToSize(info.text, width - PADDING * 2);
                } else {
                    ({ fontSize, lines } = calculateOptimalFontSize(pdf, info.text, width, height, { minSize: 4, maxSize: height, padding: PADDING }));
                    pdf.setFontSize(fontSize);
                }
                pdf.text(lines, x + PADDING, y + PADDING, { align: 'justify', baseline: 'top' });
            });
        }
        pdf.save(`${originalFileName}_with_overlays.pdf`);
    } catch (error) {
        console.error('Error saving PDF:', error);
        alert('Error saving PDF: ' + error.message);
    } finally {
        removeSavingIndicator(indicator);
    }
}