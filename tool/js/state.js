// js/state.js
let appState = {
    // This will hold the UNMERGED overlay data as the single source of truth
    overlayData: {},
    isMergeActive: true,
    activePalette: 'modernDark'
};

export function initializeState(jsonData, mergeByDefault = true) {
    const statefulData = {};
    for (const [pageKey, pageData] of Object.entries(jsonData)) {
        statefulData[pageKey] = {};
        for (const [coords, text] of Object.entries(pageData)) {
            statefulData[pageKey][coords] = {
                text: text.trimEnd(),
                fontSize: 'auto'
            };
        }
    }
    appState.overlayData = statefulData;
    appState.isMergeActive = mergeByDefault;
}

export function getState() {
    return appState;
}

/**
 * Updates a specific property of an overlay.
 * @param {number} pageNum - The page number (1-based)
 * @param {string} coords - The coordinate string key
 * @param {object} updates - An object of properties to update, e.g., { text: 'new text' }
 */
export function updateOverlay(pageNum, coords, updates) {
    const pageKey = `page_${pageNum}`;
    const overlay = appState.overlayData?.[pageKey]?.[coords];
    if (overlay) {
        Object.assign(overlay, updates);
    }
}

export function setMergeActive(isActive) {
    appState.isMergeActive = isActive;
}

export function setActivePalette(paletteKey) {
    appState.activePalette = paletteKey;
}