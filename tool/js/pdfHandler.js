// js/pdfHandler.js
import { showLoading, updatePageInfo, clearPdfContainer, createPageWrapper, addOverlaysToPage, showSavingIndicator, removeSavingIndicator } from './ui.js';
import { colorPalettes, DEFAULT_PALETTE_KEY } from './config.js';

let pdfDoc = null; // This will hold our parsed document persistently.
const FONT_NAME = 'Bookerly';
const FONT_FILE_NAME = 'Bookerly-Regular.ttf';
const FONT_URL = `./${FONT_FILE_NAME}`;

let pageRenderQueue = new Map();
let intersectionObserver = null;
let fontBase64 = null;

/**
 * Checks if a PDF document has been successfully parsed and is ready.
 * @returns {boolean}
 */
export function isPdfLoaded() {
    return pdfDoc !== null;
}

async function loadFontAsBase64() {
    if (fontBase64) return fontBase64;
    try {
        const response = await fetch(FONT_URL);
        if (!response.ok) throw new Error(`Font file not found at ${FONT_URL}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                fontBase64 = reader.result.split(',')[1];
                resolve(fontBase64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Failed to load custom font:", error);
        alert(`Error: Could not load the custom font file "${FONT_FILE_NAME}". The saved PDF will use a default font.`);
        return null;
    }
}

async function renderPage(pageNum, overlayData) {
    const pageWrapper = document.getElementById(`page-wrapper-${pageNum}`);
    if (!pageWrapper || pageWrapper.dataset.rendered) return;

    try {
        const page = await pdfDoc.getPage(pageNum);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const context = canvas.getContext('2d');

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

/**
 * NEW RENDER-ONLY FUNCTION
 * This can be called anytime to redraw pages using the existing `pdfDoc` object.
 * @param {object} overlayData - The overlay data to display.
 */
export async function renderPdfPages(overlayData) {
    if (!pdfDoc) return;

    if (intersectionObserver) intersectionObserver.disconnect();
    clearPdfContainer();
    pageRenderQueue.clear();

    const pagePromises = Array.from({ length: pdfDoc.numPages }, (_, i) => pdfDoc.getPage(i + 1));
    const pages = await Promise.all(pagePromises);
    
    pages.forEach((page, index) => {
        const pageNum = index + 1;
        const viewport = page.getViewport({ scale: 1.5 });
        const pageWrapper = createPageWrapper(pageNum, viewport);
        if (pageWrapper) {
            pageRenderQueue.set(pageWrapper, () => renderPage(pageNum, overlayData));
        }
    });

    intersectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const renderFunc = pageRenderQueue.get(target);
                if (renderFunc) {
                    renderFunc();
                    pageRenderQueue.delete(target);
                    observer.unobserve(target);
                }
            }
        });
    }, { rootMargin: '200px 0px' });

    document.querySelectorAll('.page-placeholder').forEach(el => {
        intersectionObserver.observe(el);
    });
}

/**
 * REVISED LOAD FUNCTION
 * This is now called ONLY ONCE per new file to parse the ArrayBuffer.
 * @param {ArrayBuffer} fileData - The raw data of the PDF file.
 * @param {object} initialOverlayData - The initial overlay data to render.
 */
export async function loadPDF(fileData, initialOverlayData) {
    try {
        showLoading('Loading PDF...');
        pdfDoc = null; // Reset the document
        
        // This is where the ArrayBuffer is transferred. It will only happen once.
        pdfDoc = await pdfjsLib.getDocument(fileData).promise;
        
        updatePageInfo(`Total pages: ${pdfDoc.numPages}`);
        
        // Trigger the first render using the new render-only function
        await renderPdfPages(initialOverlayData);

    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF file: ' + error.message);
        pdfDoc = null;
    }
}

function calculateOptimalFontSize(pdf, text, width, height, options) {
    const { minSize, maxSize, padding } = options;
    const availableWidth = width - (padding * 2);
    const availableHeight = height - (padding * 2);

    for (let currentSize = maxSize; currentSize >= minSize; currentSize--) {
        pdf.setFontSize(currentSize);
        const lines = pdf.splitTextToSize(text, availableWidth);
        const textHeight = lines.length * pdf.getLineHeight();
        if (textHeight <= availableHeight) {
            return { fontSize: currentSize, lines: lines };
        }
    }
    
    pdf.setFontSize(minSize);
    return { fontSize: minSize, lines: pdf.splitTextToSize(text, availableWidth) };
}

export async function saveAsPDF(originalFileName, overlayData, paletteKey) {
    if (!pdfDoc) {
        alert('No document loaded to save.');
        return;
    }
    const PADDING = 5;
    const MIN_OVERLAY_HEIGHT_PT = 20;
    const activePalette = colorPalettes[paletteKey] || colorPalettes[DEFAULT_PALETTE_KEY];
    const indicator = showSavingIndicator();

    try {
        const bookerlyFontData = await loadFontAsBase64();
        const { jsPDF } = window.jspdf;
        const firstPdfPage = await pdfDoc.getPage(1);
        const viewport = firstPdfPage.getViewport({ scale: 1 });

        const pageHeight = 1000;
        const pageWidth = (viewport.width / viewport.height) * pageHeight;
        const orientation = pageWidth > pageHeight ? 'l' : 'p';
        const pdf = new jsPDF({ orientation, unit: 'pt', format: [pageWidth, pageHeight] });
        
        pdf.setLineHeightFactor(1.35);

        let useDefaultFont = true;
        if (bookerlyFontData) {
            pdf.addFileToVFS(FONT_FILE_NAME, bookerlyFontData);
            pdf.addFont(FONT_FILE_NAME, FONT_NAME, 'normal');
            pdf.setFont(FONT_NAME, 'normal');
            useDefaultFont = false;
        } else {
            pdf.setFont('Helvetica', 'normal');
        }
        
        for (let i = 0; i < pdfDoc.numPages; i++) {
            const pageNum = i + 1;
            if (i > 0) pdf.addPage([pageWidth, pageHeight], orientation);

            const page = await pdfDoc.getPage(pageNum);
            const tempCanvas = document.createElement('canvas');
            const tempContext = tempCanvas.getContext('2d');
            const tempViewport = page.getViewport({ scale: 2.0 });
            tempCanvas.width = tempViewport.width;
            tempCanvas.height = tempViewport.height;
            await page.render({ canvasContext: tempContext, viewport: tempViewport }).promise;

            pdf.addImage(tempCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pageWidth, pageHeight);

            const pageKey = `page_${pageNum}`;
            const pageData = overlayData[pageKey];
            if (!pageData) continue;

            const scaleX = pageWidth / 1000;
            const scaleY = pageHeight / 1000;

            for (const [coordsStr, overlayInfo] of Object.entries(pageData)) {
                const coords = JSON.parse(coordsStr);
                const [top, left, bottom, right] = coords;
                
                const x = left * scaleX;
                const y = top * scaleY;
                const width = (right - left) * scaleX;
                
                const originalHeight = (bottom - top) * scaleY;
                const height = Math.max(originalHeight, MIN_OVERLAY_HEIGHT_PT);

                pdf.setDrawColor(...activePalette.border);
                pdf.setFillColor(...activePalette.background);
                pdf.rect(x, y, width, height, 'FD');
                pdf.setTextColor(...activePalette.text);
                
                let fontSize, lines;
                
                if (typeof overlayInfo.fontSize === 'number') {
                    fontSize = overlayInfo.fontSize;
                    pdf.setFontSize(fontSize);
                    lines = pdf.splitTextToSize(overlayInfo.text, width - PADDING * 2);
                } else {
                    const textOptions = { minSize: 4, maxSize: height, padding: PADDING };
                    const result = calculateOptimalFontSize(pdf, overlayInfo.text, width, height, textOptions);
                    fontSize = result.fontSize;
                    lines = result.lines;
                    pdf.setFontSize(fontSize);
                }
                
                pdf.text(lines, x + PADDING, y + PADDING, {
                    align: 'justify',
                    baseline: 'top'
                });
            }
        }
        pdf.save(`${originalFileName}_with_overlays.pdf`);
    } catch (error) {
        console.error('Error saving PDF:', error);
        alert('An error occurred while saving the PDF: ' + error.message);
    } finally {
        removeSavingIndicator(indicator);
    }
}