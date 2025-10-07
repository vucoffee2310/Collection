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
                        { text: text.trimEnd(), fontSize: 'auto' }
                    ])
                )
            ])
        );
    }
    
    setActivePalette(key) { 
        this.activePalette = key; 
    }

    expandAllOverlays(amount) {
        // This process requires regenerating all keys, making it inherently iterative.
        // Modern JS object iteration methods are used for maximum speed.
        for (const pageKey in this.overlayData) {
            this.overlayData[pageKey] = Object.fromEntries(
                Object.entries(this.overlayData[pageKey]).map(([coordsStr, value]) => {
                    const [t, l, b, r] = Utils.parseCoords(coordsStr);
                    return [JSON.stringify([t - amount, l - amount, b + amount, r + amount]), value];
                })
            );
        }
    }
}