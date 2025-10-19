import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayMerger {
    canMerge(a, b) {
        if (a.data.fontSize !== b.data.fontSize) return false;
        
        const [ta, la, ba, ra] = a.coords;
        const [tb, lb, bb, rb] = b.coords;
        const H = CONFIG.MERGE.TOLERANCE_HORIZONTAL;
        
        if (Math.abs(la - lb) >= H || Math.abs(ra - rb) >= H) return false;
        
        const gap = tb - ba;
        const dynTol = (ba - ta) * 0.5;
        return gap >= -2 && gap < dynTol;
    }
    
    mergePage(overlays, coordOrder) {
        if (!overlays || !Object.keys(overlays).length) return {};
        
        const blocks = Object.entries(overlays)
            .map(([key, data]) => ({
                key,
                coords: Utils.parseCoords(key, coordOrder),
                data
            }))
            .filter(b => b.coords?.length === 4)
            .sort((a, b) => a.coords[0] - b.coords[0] || a.coords[1] - b.coords[1]);
        
        if (!blocks.length) return {};
        
        const groups = [];
        let group = [blocks[0]];
        
        for (let i = 1; i < blocks.length; i++) {
            if (this.canMerge(group[group.length - 1], blocks[i])) {
                group.push(blocks[i]);
            } else {
                groups.push(group);
                group = [blocks[i]];
            }
        }
        groups.push(group);

        return Object.fromEntries(
            groups.map(g => {
                if (g.length === 1) {
                    return [g[0].key, g[0].data];
                }
                
                const first = g[0];
                const last = g[g.length - 1];
                const mergedKey = JSON.stringify([
                    first.coords[0], first.coords[1], 
                    last.coords[2], first.coords[3]
                ]);
                
                return [mergedKey, {
                    ...first.data,
                    text: g.map(b => `<div class="merged-text-block">${b.data.text}</div>`).join('')
                }];
            })
        );
    }
    
    mergeAllPages(data, stateManager) {
        return Object.fromEntries(
            Object.entries(data).map(([pageKey, overlays]) => {
                const pageNum = pageKey.replace('page_', '');
                const coordOrder = stateManager?.getPageCoordinateOrder(pageNum) || 
                                 CONFIG.DEFAULT_COORDINATE_ORDER;
                return [pageKey, this.mergePage(overlays, coordOrder)];
            })
        );
    }
}