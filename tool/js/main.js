// js/main.js
import { jsonData as defaultJsonData } from './data.js';
import { colorPalettes, DEFAULT_PALETTE_KEY } from './config.js';
import { initializeState, getState, updateOverlay, setMergeActive, setActivePalette } from './state.js';
import { loadPDF, saveAsPDF, renderPdfPages, isPdfLoaded } from './pdfHandler.js';
import { applyTheme, autoFitFontSizeForElement } from './ui.js';
import { getMergedState } from './merger.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const autoFitAllBtn = document.getElementById('auto-fit-all-btn');
const fileInput = document.getElementById('file-input');
const jsonInput = document.getElementById('json-input');
const exportBtn = document.getElementById('export-btn');
const saveBtn = document.getElementById('save-btn');
const paletteContainer = document.getElementById('palette-container');
const pdfContainer = document.getElementById('pdf-container');
const mergeToggle = document.getElementById('merge-toggle');
const pdfFileNameSpan = document.getElementById('pdf-file-name');
const jsonFileNameSpan = document.getElementById('json-file-name');

let lastLoadedPdfFile = null;

let increaseStreak = {
    pageNum: null,
    coords: null,
    count: 0
};

function resetIncreaseStreak() {
    increaseStreak = { pageNum: null, coords: null, count: 0 };
}

function autoIncreaseFont(overlay, textSpan, pageNum, coords) {
    resetIncreaseStreak();
    increaseStreak.pageNum = pageNum;
    increaseStreak.coords = coords;
    let lastGoodSize = parseFloat(window.getComputedStyle(textSpan).fontSize);
    function step() {
        let currentSize = parseFloat(window.getComputedStyle(textSpan).fontSize);
        increaseStreak.count++;
        const increases = 1;
        const decreases = Math.floor(increaseStreak.count / 2) - Math.floor((increaseStreak.count - 1) / 2);
        const netChange = increases - decreases;
        const finalSize = currentSize + netChange;
        if (finalSize > 150) { 
            updateOverlay(pageNum, coords, { fontSize: lastGoodSize });
            resetIncreaseStreak();
            return;
        }
        textSpan.style.fontSize = `${finalSize}px`;
        if (doesTextOverflow(textSpan, overlay)) {
            textSpan.style.fontSize = `${lastGoodSize}px`;
            updateOverlay(pageNum, coords, { fontSize: lastGoodSize });
            resetIncreaseStreak();
        } else {
            lastGoodSize = finalSize;
            setTimeout(step, 0); 
        }
    }
    step();
}

/**
 * REVISED renderUI function
 * This now safely calls the render-only function from pdfHandler.
 */
function renderUI() {
    if (!isPdfLoaded()) return;
    const state = getState();
    const dataToShow = state.isMergeActive ? getMergedState(state.overlayData) : state.overlayData;
    renderPdfPages(dataToShow);
}

/**
 * Handles the initial load and parsing of a PDF file.
 * @param {object} rawJsonData - The JSON data to use for the first render.
 */
function processAndLoadInitialData(rawJsonData) {
    initializeState(rawJsonData, mergeToggle.checked);
    if (lastLoadedPdfFile) {
        const state = getState();
        // Call the full loadPDF function which parses the ArrayBuffer for the first time.
        loadPDF(lastLoadedPdfFile, state.overlayData);
    }
}

function updateFileNameDisplay(inputElement, spanElement) {
    if (inputElement.files && inputElement.files.length > 0) {
        spanElement.textContent = inputElement.files[0].name;
    } else {
        spanElement.textContent = (spanElement === pdfFileNameSpan) ? 'No file selected' : 'Using default';
    }
}

function doesTextOverflow(textElement, containerElement) {
    return textElement.scrollHeight > containerElement.clientHeight ||
           textElement.scrollWidth > containerElement.clientWidth;
}

function populatePaletteSwatches() {
    for (const [key, palette] of Object.entries(colorPalettes)) {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch';
        swatch.dataset.paletteKey = key;
        swatch.title = palette.name;
        swatch.style.background = `rgb(${palette.background.join(',')})`;
        swatch.style.color = `rgb(${palette.text.join(',')})`;
        swatch.innerHTML = '<span>Aa</span>';
        if (key === DEFAULT_PALETTE_KEY) swatch.classList.add('active');
        paletteContainer.appendChild(swatch);
    }
}

autoFitAllBtn.addEventListener('click', () => {
    if (!isPdfLoaded()) {
        alert("Please load a PDF file first.");
        return;
    }
    const state = getState();
    for (const pageKey in state.overlayData) {
        const pageNum = parseInt(pageKey.split('_')[1]);
        const pageData = state.overlayData[pageKey];
        for (const coords in pageData) {
            updateOverlay(pageNum, coords, { fontSize: 'auto' });
        }
    }
    renderUI();
    alert("All overlays have been set to auto-fit. The changes will be applied as you scroll through the document.");
});

fileInput.addEventListener('change', (e) => {
    resetIncreaseStreak();
    const file = e.target.files[0];
    updateFileNameDisplay(fileInput, pdfFileNameSpan);
    if (file && file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function() {
            lastLoadedPdfFile = this.result.slice(0); // Use slice(0) to create a copy
            jsonInput.value = '';
            updateFileNameDisplay(jsonInput, jsonFileNameSpan);
            processAndLoadInitialData(defaultJsonData);
        };
        reader.readAsArrayBuffer(file);
    }
});

jsonInput.addEventListener('change', (e) => {
    resetIncreaseStreak();
    const file = e.target.files[0];
    updateFileNameDisplay(jsonInput, jsonFileNameSpan);
    if (file && file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const newJsonData = JSON.parse(event.target.result);
                if (isPdfLoaded()) {
                    initializeState(newJsonData, mergeToggle.checked);
                    renderUI(); // Just re-render with the new data
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

mergeToggle.addEventListener('change', (e) => {
    resetIncreaseStreak();
    setMergeActive(e.target.checked);
    renderUI();
});

exportBtn.addEventListener('click', () => {
    resetIncreaseStreak();
    const { overlayData } = getState();
    const exportData = {};
    for (const [pageKey, pageValue] of Object.entries(overlayData)) {
        exportData[pageKey] = {};
        for (const [coords, overlayInfo] of Object.entries(pageValue)) {
            exportData[pageKey][coords] = overlayInfo.text;
        }
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "overlay_data.json";
    a.click();
    a.remove();
});

saveBtn.addEventListener('click', () => {
    resetIncreaseStreak();
    if (!isPdfLoaded()) {
        alert("Please load a PDF file first.");
        return;
    }
    const state = getState();
    const originalFileName = fileInput.files[0]?.name.replace('.pdf', '') || 'document';
    const dataToSave = state.isMergeActive ? getMergedState(state.overlayData) : state.overlayData;
    saveAsPDF(originalFileName, dataToSave, state.activePalette);
});

paletteContainer.addEventListener('click', (e) => {
    const swatch = e.target.closest('.palette-swatch');
    if (!swatch) return;
    paletteContainer.querySelector('.active')?.classList.remove('active');
    swatch.classList.add('active');
    const paletteKey = swatch.dataset.paletteKey;
    setActivePalette(paletteKey);
    applyTheme(paletteKey);
});

pdfContainer.addEventListener('blur', (e) => {
    resetIncreaseStreak();
    const textSpan = e.target;
    if (!textSpan.matches('.overlay-text')) return;
    const overlay = textSpan.closest('.overlay');
    if (!overlay.dataset.coords.startsWith('[')) return;
    const { coords, pageNum } = overlay.dataset;
    const cleanedText = textSpan.textContent.trimEnd();
    updateOverlay(pageNum, coords, { text: cleanedText });
    if (textSpan.textContent !== cleanedText) {
        textSpan.textContent = cleanedText;
    }
    if (getState().overlayData[`page_${pageNum}`][coords]?.fontSize === 'auto') {
        autoFitFontSizeForElement(overlay);
    }
}, true);


pdfContainer.addEventListener('click', (e) => {
    const target = e.target;
    if (!target.matches('.font-size-btn')) {
        resetIncreaseStreak();
        return;
    }
    const overlay = target.closest('.overlay');
    if (!overlay) return;
    const { coords, pageNum } = overlay.dataset;
    const textSpan = overlay.querySelector('.overlay-text');
    let currentSize = parseFloat(window.getComputedStyle(textSpan).fontSize);
    const action = target.dataset.action;
    if (increaseStreak.coords !== coords || increaseStreak.pageNum !== pageNum) {
        resetIncreaseStreak();
    }
    increaseStreak.pageNum = pageNum;
    increaseStreak.coords = coords;
    switch (action) {
        case 'increase': {
            increaseStreak.count++;
            const increases = 1;
            const decreases = Math.floor(increaseStreak.count / 2) - Math.floor((increaseStreak.count - 1) / 2);
            const netChange = increases - decreases;
            const finalSize = currentSize + netChange;
            textSpan.style.fontSize = `${finalSize}px`;
            if (doesTextOverflow(textSpan, overlay)) {
                textSpan.style.fontSize = `${currentSize}px`;
                resetIncreaseStreak();
            } else {
                updateOverlay(pageNum, coords, { fontSize: finalSize });
            }
            break;
        }
        case 'decrease': {
            resetIncreaseStreak();
            const newSize = Math.max(4, currentSize - 1);
            updateOverlay(pageNum, coords, { fontSize: newSize });
            textSpan.style.fontSize = `${newSize}px`;
            break;
        }
        case 'auto': {
            autoIncreaseFont(overlay, textSpan, pageNum, coords);
            break;
        }
    }
});

// --- Initialize UI ---
populatePaletteSwatches();
setActivePalette(DEFAULT_PALETTE_KEY);
applyTheme(DEFAULT_PALETTE_KEY);