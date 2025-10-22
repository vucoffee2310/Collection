import { CONFIG } from "../config.js";
import { parseCoords, coordinatesToOrder } from "../utils.js";

export class StateManager {
  constructor() {
    this.overlayData = {};
    this.activePalette = CONFIG.DEFAULT_PALETTE;
    this.globalCoordinateOrder = CONFIG.DEFAULT_COORDINATE_ORDER;
    this.pageOverrides = new Map();
  }

  initialize(json) {
    this.overlayData = {};
    const bboxKey = "[y1, x1, y2, x2]";

    Object.entries(json).forEach(([pageKey, items]) => {
      if (!Array.isArray(items)) return;

      this.overlayData[pageKey] = {};

      items.forEach((item) => {
        const bbox = item[bboxKey];
        if (!this._isValidBbox(bbox)) return;

        const { type, content } = this._extractContent(item, bboxKey);
        if (!content && type !== CONFIG.CONTENT_TYPES.IMAGE) return;

        const key = JSON.stringify(bbox);
        this.overlayData[pageKey][key] = {
          text: this._formatContent(content, type),
          fontSize: "auto",
          type,
          originalBbox: bbox,
          ...(type === CONFIG.CONTENT_TYPES.TABLE && { tableData: content }),
        };
      });
    });
  }

  _isValidBbox(bbox) {
    if (!Array.isArray(bbox) || bbox.length !== 4) return false;
    const [top, left, bottom, right] = bbox;
    return left < right && top < bottom;
  }

  _extractContent(item, bboxKey) {
    const typeKey = Object.keys(item).find((k) => k !== bboxKey);
    if (!typeKey) return { type: CONFIG.CONTENT_TYPES.TEXT, content: "" };

    const typeMap = {
      text: CONFIG.CONTENT_TYPES.TEXT,
      code: CONFIG.CONTENT_TYPES.CODE,
      list: CONFIG.CONTENT_TYPES.LIST,
      table: CONFIG.CONTENT_TYPES.TABLE,
      image: CONFIG.CONTENT_TYPES.IMAGE,
    };

    return {
      type: typeMap[typeKey] || CONFIG.CONTENT_TYPES.TEXT,
      content: item[typeKey],
    };
  }

  _formatContent(content, type) {
    if (!content && type !== CONFIG.CONTENT_TYPES.IMAGE) return "";

    const formatters = {
      [CONFIG.CONTENT_TYPES.CODE]: () => String(content).trimEnd(),

      [CONFIG.CONTENT_TYPES.LIST]: () => {
        if (!Array.isArray(content)) return String(content);
        return content
          .map((line) => {
            const str = String(line).trim();
            return str.startsWith("•") ? str : `• ${str}`;
          })
          .join("\n");
      },

      [CONFIG.CONTENT_TYPES.TABLE]: () => {
        if (!Array.isArray(content)) return String(content || "");
        return JSON.stringify(content);
      },

      [CONFIG.CONTENT_TYPES.IMAGE]: () => "[Image]",
      [CONFIG.CONTENT_TYPES.TEXT]: () => String(content).trim(),
    };

    return (formatters[type] || formatters[CONFIG.CONTENT_TYPES.TEXT])();
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

  applyCoordinateOrderToAllPages(order) {
    Object.keys(this.overlayData).forEach((pageKey) => {
      const pageNum = pageKey.replace("page_", "");
      this.pageOverrides.set(pageNum, order);
    });
  }

  expandAllOverlays(amount) {
    Object.keys(this.overlayData).forEach((pageKey) => {
      const pageNum = pageKey.replace("page_", "");
      const coordOrder = this.getPageCoordinateOrder(pageNum);

      this.overlayData[pageKey] = Object.fromEntries(
        Object.entries(this.overlayData[pageKey]).map(([coords, data]) => {
          const [top, left, bottom, right] = parseCoords(coords, coordOrder);
          const expandedTLBR = [
            top - amount,
            left - amount,
            bottom + amount,
            right + amount,
          ];
          const expandedCoords = coordinatesToOrder(expandedTLBR, coordOrder);
          return [JSON.stringify(expandedCoords), data];
        }),
      );
    });
  }

  updateOverlayText(pageNum, coords, text) {
    const pageKey = `page_${pageNum}`;
    if (this.overlayData[pageKey]?.[coords]) {
      this.overlayData[pageKey][coords].text = text;

      if (
        this.overlayData[pageKey][coords].type === CONFIG.CONTENT_TYPES.TABLE
      ) {
        try {
          this.overlayData[pageKey][coords].tableData = JSON.parse(text);
        } catch (e) {
          console.warn("Failed to parse table data:", e);
        }
      }
    }
  }

  deleteOverlay(pageNum, coords) {
    const pageKey = `page_${pageNum}`;
    delete this.overlayData[pageKey]?.[coords];
  }
}