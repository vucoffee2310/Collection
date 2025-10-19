import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class StateManager {
    constructor() {
        this.overlayData = {};
        this.activePalette = CONFIG.DEFAULT_PALETTE;
        this.globalCoordinateOrder = CONFIG.DEFAULT_COORDINATE_ORDER;
        this.pageCoordinateOverrides = {};
    }
    
    initialize(json) {
        this.overlayData = Object.fromEntries(
            Object.entries(json).map(([pageKey, overlays]) => [
                pageKey,
                Object.fromEntries(
                    Object.entries(overlays).map(([coords, text]) => [
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
    
    setGlobalCoordinateOrder(order) {
        this.globalCoordinateOrder = order;
    }
    
    getGlobalCoordinateOrder() {
        return this.globalCoordinateOrder;
    }
    
    getPageCoordinateOrder(pageNum) {
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
    
    applyCoordinateOrderToAllPages(order) {
        Object.keys(this.overlayData).forEach(pageKey => {
            const pageNum = pageKey.replace('page_', '');
            this.pageCoordinateOverrides[pageNum] = order;
        });
    }

    expandAllOverlays(amount) {
        Object.keys(this.overlayData).forEach(pageKey => {
            const pageNum = pageKey.replace('page_', '');
            const coordOrder = this.getPageCoordinateOrder(pageNum);
            
            this.overlayData[pageKey] = Object.fromEntries(
                Object.entries(this.overlayData[pageKey]).map(([coords, data]) => {
                    const [t, l, b, r] = Utils.parseCoords(coords, coordOrder);
                    const expandedTLBR = [t - amount, l - amount, b + amount, r + amount];
                    const expandedCoords = Utils.coordinatesToOrder(expandedTLBR, coordOrder);
                    return [JSON.stringify(expandedCoords), data];
                })
            );
        });
    }

    updateOverlayText(pageNum, coords, text) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey]?.[coords]) {
            this.overlayData[pageKey][coords].text = text;
        }
    }

    deleteOverlay(pageNum, coords) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey]?.[coords]) {
            delete this.overlayData[pageKey][coords];
        }
    }
}