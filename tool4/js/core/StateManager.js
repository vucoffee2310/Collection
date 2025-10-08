import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class StateManager {
    constructor() {
        this.overlayData = {};
        this.activePalette = CONFIG.DEFAULT_PALETTE;
        this.expansion = 0;
    }
    
    initialize(jsonData) {
        this.overlayData = Object.fromEntries(
            Object.entries(jsonData).map(([pageKey, pageData]) => [
                pageKey,
                Object.fromEntries(
                    Object.entries(pageData).map(([coords, text]) => [
                        coords,
                        { text: text.trim(), fontSize: 'auto' }
                    ])
                )
            ])
        );
    }
    
    setActivePalette(key) { 
        this.activePalette = key; 
    }

    setExpansion(amount) {
        this.expansion = amount;
    }

    updateOverlayText(pageNum, coords, newText) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey] && this.overlayData[pageKey][coords]) {
            this.overlayData[pageKey][coords].text = newText;
        }
    }

    deleteOverlay(pageNum, coords) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey] && this.overlayData[pageKey][coords]) {
            delete this.overlayData[pageKey][coords];
        }
    }
}