import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class StateManager {
    constructor() {
        this.overlayData = {};
        this.activePalette = CONFIG.DEFAULT_PALETTE;
    }
    
    initialize(jsonData) {
        this.overlayData = Object.fromEntries(
            Object.entries(jsonData).map(([pageKey, pageData]) => [
                pageKey,
                Object.fromEntries(
                    Object.entries(pageData).map(([coords, text]) => [
                        coords,
                        // Use trim() to remove all leading/trailing whitespace,
                        // which correctly handles a final unwanted newline
                        // without affecting internal newlines.
                        { text: text.trim(), fontSize: 'auto' }
                    ])
                )
            ])
        );
    }
    
    setActivePalette(key) { 
        this.activePalette = key; 
    }

    expandAllOverlays(amount) {
        for (const pageKey in this.overlayData) {
            this.overlayData[pageKey] = Object.fromEntries(
                Object.entries(this.overlayData[pageKey]).map(([coordsStr, value]) => {
                    const [t, l, b, r] = Utils.parseCoords(coordsStr);
                    return [JSON.stringify([t - amount, l - amount, b + amount, r + amount]), value];
                })
            );
        }
    }

    // --- NEW METHODS FOR INTERACTIVITY ---

    updateOverlayText(pageNum, coords, newText) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey] && this.overlayData[pageKey][coords]) {
            this.overlayData[pageKey][coords].text = newText;
            console.log(`Updated text for page ${pageNum}, coords ${coords}`);
        }
    }

    deleteOverlay(pageNum, coords) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey] && this.overlayData[pageKey][coords]) {
            delete this.overlayData[pageKey][coords];
            console.log(`Deleted overlay for page ${pageNum}, coords ${coords}`);
        }
    }
}