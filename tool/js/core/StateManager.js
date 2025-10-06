export class StateManager {
    constructor() {
        this.state = {
            overlayData: {},
            isMergeActive: true,
            activePalette: CONFIG.DEFAULT_PALETTE
        };
    }
    
    initialize(jsonData, mergeByDefault = true) {
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
        this.state.overlayData = statefulData;
        this.state.isMergeActive = mergeByDefault;
    }
    
    getState() {
        return this.state;
    }
    
    updateOverlay(pageNum, coords, updates) {
        const pageKey = `page_${pageNum}`;
        const overlay = this.state.overlayData?.[pageKey]?.[coords];
        if (overlay) {
            Object.assign(overlay, updates);
        }
    }
    
    setMergeActive(isActive) {
        this.state.isMergeActive = isActive;
    }
    
    setActivePalette(paletteKey) {
        this.state.activePalette = paletteKey;
    }
}
