import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayMerger {
    canMerge(blockA, blockB) {
        if (blockA.data.fontSize !== blockB.data.fontSize) return false;
        
        const [topA, leftA, bottomA, rightA] = blockA.coords;
        const [topB, leftB, bottomB, rightB] = blockB.coords;
        
        const aligned = Math.abs(leftA - leftB) < CONFIG.MERGE.TOLERANCE_HORIZONTAL && 
                       Math.abs(rightA - rightB) < CONFIG.MERGE.TOLERANCE_HORIZONTAL;
        const gap = topB - bottomA;
        
        return aligned && gap >= -2 && gap < CONFIG.MERGE.TOLERANCE_VERTICAL;
    }
    
    mergePage(pageState) {
        if (!pageState || !Object.keys(pageState).length) return {};
        
        const blocks = Object.entries(pageState)
            .map(([key, data]) => ({ 
                originalKey: key, 
                coords: Utils.parseCoords(key), 
                data 
            }))
            .filter(b => b.coords)
            .sort((a, b) => a.coords[0] - b.coords[0] || a.coords[1] - b.coords[1]);
        
        if (!blocks.length) return {};
        
        const groups = blocks.reduce((acc, block) => {
            const lastGroup = acc[acc.length - 1];
            if (lastGroup && this.canMerge(lastGroup[lastGroup.length - 1], block)) {
                lastGroup.push(block);
            } else {
                acc.push([block]);
            }
            return acc;
        }, []);
        
        return Object.fromEntries(groups.map(group => {
            if (group.length === 1) {
                return [group[0].originalKey, group[0].data];
            }
            const first = group[0];
            const last = group[group.length - 1];
            const key = JSON.stringify([first.coords[0], first.coords[1], last.coords[2], first.coords[3]]);
            return [key, { ...first.data, text: group.map(b => '    ' + b.data.text).join('\n') }];
        }));
    }
    
    mergeAllPages(overlayData) {
        return Object.fromEntries(
            Object.entries(overlayData).map(([pageKey, pageData]) => 
                [pageKey, this.mergePage(pageData)]
            )
        );
    }
}