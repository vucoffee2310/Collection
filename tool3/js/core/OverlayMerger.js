import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayMerger {
    canMerge(blockA, blockB) {
        if (blockA.data.fontSize !== blockB.data.fontSize) return false;
        
        const [topA, leftA, bottomA, rightA] = blockA.coords;
        const [topB, leftB, bottomB, rightB] = blockB.coords;
        
        const H_TOL = CONFIG.MERGE.TOLERANCE_HORIZONTAL;
        const V_TOL = CONFIG.MERGE.TOLERANCE_VERTICAL;

        const aligned = Math.abs(leftA - leftB) < H_TOL && 
                       Math.abs(rightA - rightB) < H_TOL;
        const gap = topB - bottomA;
        
        return aligned && gap >= -2 && gap < V_TOL; 
    }
    
    mergePage(pageState) {
        if (!pageState || !Object.keys(pageState).length) return {};
        
        const blocks = Object.entries(pageState)
            .map(([key, data]) => ({ 
                originalKey: key, 
                coords: Utils.parseCoords(key), 
                data 
            }))
            .filter(b => b.coords && b.coords.length === 4)
            .sort((a, b) => a.coords[0] - b.coords[0] || a.coords[1] - b.coords[1]);
        
        if (!blocks.length) return {};
        
        const mergedBlocks = [];
        let currentGroup = [blocks[0]];
        
        for (let i = 1; i < blocks.length; i++) {
            const currentBlock = blocks[i];
            const lastInGroup = currentGroup[currentGroup.length - 1];
            
            if (this.canMerge(lastInGroup, currentBlock)) {
                currentGroup.push(currentBlock);
            } else {
                mergedBlocks.push(currentGroup);
                currentGroup = [currentBlock];
            }
        }
        mergedBlocks.push(currentGroup);

        return mergedBlocks.reduce((acc, group) => {
            const first = group[0];
            if (group.length === 1) {
                acc[first.originalKey] = first.data;
            } else {
                const last = group[group.length - 1];
                const key = JSON.stringify([first.coords[0], first.coords[1], last.coords[2], first.coords[3]]);
                
                // --- MODIFICATION HERE ---
                // Wrap each original text block in a div instead of joining with '\n'.
                const mergedText = group.map(b => `<div class="merged-text-block">      ${b.data.text}</div>`).join('');
                
                acc[key] = { ...first.data, text: mergedText };
            }
            return acc;
        }, {});
    }
    
    mergeAllPages(overlayData) {
        return Object.fromEntries(
            Object.keys(overlayData).map(pageKey => 
                [pageKey, this.mergePage(overlayData[pageKey])]
            )
        );
    }
}