import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class StateManager {
    constructor() {
        this.overlayData = {};
        this.activePalette = CONFIG.DEFAULT_PALETTE;
        this.globalCoordinateOrder = CONFIG.DEFAULT_COORDINATE_ORDER;
        this.pageCoordinateOverrides = {}; // Store per-page overrides
    }
    
    initialize(json) {
        this.overlayData = Object.fromEntries(
            Object.entries(json).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([c, t]) => [c, { text: t.trim(), fontSize: 'auto' }]))])
        );
    }
    
    setActivePalette(key) { this.activePalette = key; }
    
    setGlobalCoordinateOrder(order) {
        this.globalCoordinateOrder = order;
    }
    
    getGlobalCoordinateOrder() {
        return this.globalCoordinateOrder;
    }
    
    getPageCoordinateOrder(pageNum) {
        // Return page-specific override if exists, otherwise return global
        return this.pageCoordinateOverrides[pageNum] || this.globalCoordinateOrder;
    }
    
    setPageCoordinateOrder(pageNum, order) {
        this.pageCoordinateOverrides[pageNum] = order;
    }
    
    hasPageOverride(pageNum) {
        return !!this.pageCoordinateOverrides[pageNum];
    }
    
    clearPageOverride(pageNum) {
        delete this.pageCoordinateOverrides[pageNum];
    }

    expandAllOverlays(amt) {
        for (const pk in this.overlayData) {
            const pageNum = pk.replace('page_', '');
            const coordOrder = this.getPageCoordinateOrder(pageNum);
            
            this.overlayData[pk] = Object.fromEntries(
                Object.entries(this.overlayData[pk]).map(([cs, val]) => {
                    const [t, l, b, r] = Utils.parseCoords(cs, coordOrder);
                    return [JSON.stringify([t - amt, l - amt, b + amt, r + amt]), val];
                })
            );
        }
    }

    updateOverlayText(page, coords, text) {
        const pk = `page_${page}`;
        if (this.overlayData[pk]?.[coords]) this.overlayData[pk][coords].text = text;
    }

    deleteOverlay(page, coords) {
        const pk = `page_${page}`;
        if (this.overlayData[pk]?.[coords]) delete this.overlayData[pk][coords];
    }
}