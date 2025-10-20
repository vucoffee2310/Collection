import { CONFIG } from '../config.js';
import { parseCoords, coordinatesToOrder } from '../utils.js';

export class StateManager {
  constructor() {
    this.overlayData = {};
    this.activePalette = CONFIG.DEFAULT_PALETTE;
    this.globalCoordinateOrder = CONFIG.DEFAULT_COORDINATE_ORDER;
    this.pageOverrides = new Map(); // Use Map for O(1) lookup
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
  
  setGlobalCoordinateOrder(order) {
    this.globalCoordinateOrder = order;
  }
  
  getGlobalCoordinateOrder() {
    return this.globalCoordinateOrder;
  }
  
  getPageCoordinateOrder(pageNum) {
    return this.pageOverrides.get(pageNum) || this.globalCoordinateOrder;
  }
  
  setPageCoordinateOrder(pageNum, order) {
    this.pageOverrides.set(pageNum, order);
  }
  
  clearPageOverride(pageNum) {
    this.pageOverrides.delete(pageNum);
  }
  
  applyCoordinateOrderToAllPages(order) {
    Object.keys(this.overlayData).forEach(pageKey => {
      const pageNum = pageKey.replace('page_', '');
      this.pageOverrides.set(pageNum, order);
    });
  }
  
  expandAllOverlays(amount) {
    Object.keys(this.overlayData).forEach(pageKey => {
      const pageNum = pageKey.replace('page_', '');
      const coordOrder = this.getPageCoordinateOrder(pageNum);
      
      this.overlayData[pageKey] = Object.fromEntries(
        Object.entries(this.overlayData[pageKey]).map(([coords, data]) => {
          const [top, left, bottom, right] = parseCoords(coords, coordOrder);
          const expandedTLBR = [top - amount, left - amount, bottom + amount, right + amount];
          const expandedCoords = coordinatesToOrder(expandedTLBR, coordOrder);
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