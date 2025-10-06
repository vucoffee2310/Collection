import { jsonData as defaultJsonData } from './data.js';
import { colorPalettes, DEFAULT_PALETTE_KEY } from './config.js';
import { initializeState, getState, updateOverlay, setMergeActive, setActivePalette } from './state.js';
import { loadPDF, saveAsPDF, renderPdfPages, isPdfLoaded } from './pdfHandler.js';
import { applyTheme, autoFitFontSizeForElement } from './ui.js';
import { getMergedState } from './merger.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const els = {
    fileInput: document.getElementById('file-input'),
    jsonInput: document.getElementById('json-input'),
    saveBtn: document.getElementById('save-btn'),
    palette: document.getElementById('palette-container'),
    container: document.getElementById('pdf-container'),
    mergeToggle: document.getElementById('merge-toggle'),
    pdfFileName: document.getElementById('pdf-file-name'),
    jsonFileName: document.getElementById('json-file-name')
};

let lastLoadedPdfFile = null;
let increaseStreak = { pageNum: null, coords: null, count: 0 };

const resetStreak = () => increaseStreak = { pageNum: null, coords: null, count: 0 };
const renderUI = () => isPdfLoaded() && renderPdfPages(getState().isMergeActive ? getMergedState(getState().overlayData) : getState().overlayData);
const updateFileName = (input, span) => span.textContent = input.files?.[0]?.name || (span === els.pdfFileName ? 'No file selected' : 'Using default');
const textOverflows = (text, container) => text.scrollHeight > container.clientHeight || text.scrollWidth > container.clientWidth;

function autoIncreaseFont(overlay, textSpan, pageNum, coords) {
    resetStreak();
    Object.assign(increaseStreak, { pageNum, coords });
    let lastGoodSize = parseFloat(getComputedStyle(textSpan).fontSize);
    
    const step = () => {
        const currentSize = parseFloat(getComputedStyle(textSpan).fontSize);
        increaseStreak.count++;
        const netChange = 1 - (Math.floor(increaseStreak.count / 2) - Math.floor((increaseStreak.count - 1) / 2));
        const finalSize = currentSize + netChange;
        
        if (finalSize > 150) {
            updateOverlay(pageNum, coords, { fontSize: lastGoodSize });
            resetStreak();
            return;
        }
        
        textSpan.style.fontSize = `${finalSize}px`;
        
        if (textOverflows(textSpan, overlay)) {
            textSpan.style.fontSize = `${lastGoodSize}px`;
            updateOverlay(pageNum, coords, { fontSize: lastGoodSize });
            resetStreak();
        } else {
            lastGoodSize = finalSize;
            setTimeout(step, 0);
        }
    };
    step();
}

function processAndLoadInitialData(rawJsonData) {
    initializeState(rawJsonData, els.mergeToggle.checked);
    lastLoadedPdfFile && loadPDF(lastLoadedPdfFile, getState().overlayData);
}

function populatePaletteSwatches() {
    Object.entries(colorPalettes).forEach(([key, palette]) => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch' + (key === DEFAULT_PALETTE_KEY ? ' active' : '');
        swatch.dataset.paletteKey = key;
        swatch.title = palette.name;
        swatch.style.background = `rgb(${palette.background.join(',')})`;
        swatch.style.color = `rgb(${palette.text.join(',')})`;
        swatch.innerHTML = '<span>Aa</span>';
        els.palette.appendChild(swatch);
    });
}

// Event Listeners
els.fileInput.addEventListener('change', (e) => {
    resetStreak();
    const file = e.target.files[0];
    updateFileName(els.fileInput, els.pdfFileName);
    if (file?.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function() {
            lastLoadedPdfFile = this.result.slice(0);
            els.jsonInput.value = '';
            updateFileName(els.jsonInput, els.jsonFileName);
            processAndLoadInitialData(defaultJsonData);
        };
        reader.readAsArrayBuffer(file);
    }
});

els.jsonInput.addEventListener('change', (e) => {
    resetStreak();
    const file = e.target.files[0];
    updateFileName(els.jsonInput, els.jsonFileName);
    if (file?.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const newJsonData = JSON.parse(event.target.result);
                if (isPdfLoaded()) {
                    initializeState(newJsonData, els.mergeToggle.checked);
                    renderUI();
                } else {
                    alert("Please choose a PDF file to apply this JSON data to.");
                }
            } catch (error) {
                alert('Error parsing JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
});

els.mergeToggle.addEventListener('change', (e) => {
    resetStreak();
    setMergeActive(e.target.checked);
    renderUI();
});

els.saveBtn.addEventListener('click', () => {
    resetStreak();
    if (!isPdfLoaded()) return alert("Please load a PDF file first.");
    const state = getState();
    const fileName = els.fileInput.files[0]?.name.replace('.pdf', '') || 'document';
    const dataToSave = state.isMergeActive ? getMergedState(state.overlayData) : state.overlayData;
    saveAsPDF(fileName, dataToSave, state.activePalette);
});

els.palette.addEventListener('click', (e) => {
    const swatch = e.target.closest('.palette-swatch');
    if (!swatch) return;
    els.palette.querySelector('.active')?.classList.remove('active');
    swatch.classList.add('active');
    setActivePalette(swatch.dataset.paletteKey);
    applyTheme(swatch.dataset.paletteKey);
});

els.container.addEventListener('blur', (e) => {
    resetStreak();
    const textSpan = e.target;
    if (!textSpan.matches('.overlay-text')) return;
    const overlay = textSpan.closest('.overlay');
    if (!overlay.dataset.coords.startsWith('[')) return;
    const { coords, pageNum } = overlay.dataset;
    const cleanedText = textSpan.textContent.trimEnd();
    updateOverlay(pageNum, coords, { text: cleanedText });
    if (textSpan.textContent !== cleanedText) textSpan.textContent = cleanedText;
    if (getState().overlayData[`page_${pageNum}`][coords]?.fontSize === 'auto') {
        autoFitFontSizeForElement(overlay);
    }
}, true);

els.container.addEventListener('click', (e) => {
    const target = e.target;
    if (!target.matches('.font-size-btn')) {
        resetStreak();
        return;
    }
    
    const overlay = target.closest('.overlay');
    if (!overlay) return;
    const { coords, pageNum } = overlay.dataset;
    const textSpan = overlay.querySelector('.overlay-text');
    const currentSize = parseFloat(getComputedStyle(textSpan).fontSize);
    const action = target.dataset.action;
    
    if (increaseStreak.coords !== coords || increaseStreak.pageNum !== pageNum) resetStreak();
    Object.assign(increaseStreak, { pageNum, coords });
    
    switch (action) {
        case 'increase': {
            increaseStreak.count++;
            const netChange = 1 - (Math.floor(increaseStreak.count / 2) - Math.floor((increaseStreak.count - 1) / 2));
            const finalSize = currentSize + netChange;
            textSpan.style.fontSize = `${finalSize}px`;
            if (textOverflows(textSpan, overlay)) {
                textSpan.style.fontSize = `${currentSize}px`;
                resetStreak();
            } else {
                updateOverlay(pageNum, coords, { fontSize: finalSize });
            }
            break;
        }
        case 'decrease': {
            resetStreak();
            const newSize = Math.max(4, currentSize - 1);
            updateOverlay(pageNum, coords, { fontSize: newSize });
            textSpan.style.fontSize = `${newSize}px`;
            break;
        }
        case 'auto':
            autoIncreaseFont(overlay, textSpan, pageNum, coords);
            break;
    }
});

populatePaletteSwatches();
setActivePalette(DEFAULT_PALETTE_KEY);
applyTheme(DEFAULT_PALETTE_KEY);