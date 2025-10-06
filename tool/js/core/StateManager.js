import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class StateManager {
    constructor() {
        this.state = {
            overlayData: {},
            isMergeActive: true, // Merging is now always active
            activePalette: CONFIG.DEFAULT_PALETTE
        };
    }
    
    initialize(jsonData) {
        const statefulData = {};
        for (const [pageKey, pageData] of Object.entries(jsonData)) {
            statefulData[pageKey] = {};
            for (const [coords, text] of Object.entries(pageData)) {
                statefulData[pageKey][coords] = {
                    text: text.trimEnd(),
                    fontSize: 'auto' // Font size is always auto
                };
            }
        }
        this.state.overlayData = statefulData;
    }
    
    getState() { return this.state; }
    
    getOverlayState(pageNum, coords) {
        const pageKey = `page_${pageNum}`;
        return this.state.overlayData?.[pageKey]?.[coords];
    }

    updateOverlay(pageNum, coords, updates) {
        const overlay = this.getOverlayState(pageNum, coords);
        if (overlay) {
            Object.assign(overlay, updates);
        }
    }
    
    setActivePalette(paletteKey) { this.state.activePalette = paletteKey; }

    expandAllOverlays(amount) {
        // This method works on the core, unmerged data.
        for (const pageKey in this.state.overlayData) {
            const oldPageData = this.state.overlayData[pageKey];
            const newPageData = {};

            for (const coordsStr in oldPageData) {
                const value = oldPageData[coordsStr];
                const coords = Utils.parseCoords(coordsStr);
                
                // Expand from the center: decrease top/left, increase bottom/right
                const newCoords = [
                    coords[0] - amount, // top
                    coords[1] - amount, // left
                    coords[2] + amount, // bottom
                    coords[3] + amount  // right
                ];

                const newCoordsStr = JSON.stringify(newCoords);
                newPageData[newCoordsStr] = value;
            }
            this.state.overlayData[pageKey] = newPageData;
        }
    }
}
