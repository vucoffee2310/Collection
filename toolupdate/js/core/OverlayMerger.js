import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayMerger {
    canMerge(a, b) {
        if (a.data.fontSize !== b.data.fontSize) return false;
        const [ta, la, ba, ra] = a.coords, [tb, lb, bb, rb] = b.coords, H = CONFIG.MERGE.TOLERANCE_HORIZONTAL;
        if (Math.abs(la - lb) >= H || Math.abs(ra - rb) >= H) return false;
        const gap = tb - ba, dynTol = (ba - ta) * 0.5;
        return gap >= -2 && gap < dynTol;
    }
    
    mergePage(ps) {
        if (!ps || !Object.keys(ps).length) return {};
        const blocks = Object.entries(ps)
            .map(([k, d]) => ({ originalKey: k, coords: Utils.parseCoords(k), data: d }))
            .filter(b => b.coords?.length === 4)
            .sort((a, b) => a.coords[0] - b.coords[0] || a.coords[1] - b.coords[1]);
        
        if (!blocks.length) return {};
        
        const merged = [];
        let grp = [blocks[0]];
        
        for (let i = 1; i < blocks.length; i++) {
            if (this.canMerge(grp[grp.length - 1], blocks[i])) {
                grp.push(blocks[i]);
            } else {
                merged.push(grp);
                grp = [blocks[i]];
            }
        }
        merged.push(grp);

        return merged.reduce((acc, g) => {
            const f = g[0];
            if (g.length === 1) {
                acc[f.originalKey] = f.data;
            } else {
                const l = g[g.length - 1];
                acc[JSON.stringify([f.coords[0], f.coords[1], l.coords[2], f.coords[3]])] = {
                    ...f.data,
                    text: g.map(b => `<div class="merged-text-block">${b.data.text}</div>`).join('')
                };
            }
            return acc;
        }, {});
    }
    
    mergeAllPages(data) {
        return Object.fromEntries(Object.keys(data).map(k => [k, this.mergePage(data[k])]));
    }
}