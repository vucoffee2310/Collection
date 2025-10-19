import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class StateManager {
    constructor() {
        this.overlayData = {};
        this.activePalette = CONFIG.DEFAULT_PALETTE;
        this.globalCoordinateOrder = CONFIG.DEFAULT_COORDINATE_ORDER;
        this.pageCoordinateOverrides = {};
    }
    
    // Initialize overlay data from JSON
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
    
    // Palette management
    setActivePalette(key) { 
        this.activePalette = key; 
    }
    
    // Global coordinate order management
    setGlobalCoordinateOrder(order) {
        this.globalCoordinateOrder = order;
    }
    
    getGlobalCoordinateOrder() {
        return this.globalCoordinateOrder;
    }
    
    // Page-specific coordinate order management
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
            this.setPageCoordinateOrder(pageNum, order);
        });
    }

    // Expand all overlays by a given amount while maintaining coordinate format
    expandAllOverlays(amount) {
        Object.keys(this.overlayData).forEach(pageKey => {
            const pageNum = pageKey.replace('page_', '');
            const coordOrder = this.getPageCoordinateOrder(pageNum);
            
            this.overlayData[pageKey] = Object.fromEntries(
                Object.entries(this.overlayData[pageKey]).map(([coords, data]) => {
                    // Parse coordinates using page's order to get TLBR
                    const [top, left, bottom, right] = Utils.parseCoords(coords, coordOrder);
                    
                    // Expand in TLBR format
                    const expandedTLBR = [
                        top - amount, 
                        left - amount, 
                        bottom + amount, 
                        right + amount
                    ];
                    
                    // Convert back to original coordinate order format
                    const expandedCoords = Utils.coordinatesToOrder(expandedTLBR, coordOrder);
                    
                    return [JSON.stringify(expandedCoords), data];
                })
            );
        });
    }

    // Update overlay text content
    updateOverlayText(pageNum, coords, text) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey]?.[coords]) {
            this.overlayData[pageKey][coords].text = text;
        }
    }

    // Delete an overlay
    deleteOverlay(pageNum, coords) {
        const pageKey = `page_${pageNum}`;
        if (this.overlayData[pageKey]?.[coords]) {
            delete this.overlayData[pageKey][coords];
        }
    }
}