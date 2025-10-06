export class OverlayMerger {
    canMerge(blockA, blockB) {
        if (blockA.data.fontSize !== blockB.data.fontSize) return false;
        
        const [topA, leftA, bottomA, rightA] = blockA.coords;
        const [topB, leftB, bottomB, rightB] = blockB.coords;
        
        const isAligned = 
            Math.abs(leftA - leftB) < CONFIG.MERGE.TOLERANCE_HORIZONTAL && 
            Math.abs(rightA - rightB) < CONFIG.MERGE.TOLERANCE_HORIZONTAL;
        
        const gap = topB - bottomA;
        return isAligned && gap >= -2 && gap < CONFIG.MERGE.TOLERANCE_VERTICAL;
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
        
        const mergedBlocks = [];
        let currentGroup = [blocks[0]];
        
        for (let i = 1; i < blocks.length; i++) {
            if (this.canMerge(currentGroup[currentGroup.length - 1], blocks[i])) {
                currentGroup.push(blocks[i]);
            } else {
                mergedBlocks.push(currentGroup);
                currentGroup = [blocks[i]];
            }
        }
        mergedBlocks.push(currentGroup);
        
        const result = {};
        mergedBlocks.forEach(group => {
            if (group.length === 1) {
                result[group[0].originalKey] = group[0].data;
            } else {
                const [first, ...rest] = group;
                const last = group[group.length - 1];
                const newKey = JSON.stringify([first.coords[0], first.coords[1], last.coords[2], first.coords[3]]);
                result[newKey] = { 
                    ...first.data, 
                    text: group.map(b => b.data.text).join('    ') 
                };
            }
        });
        
        return result;
    }
    
    mergeAllPages(overlayData) {
        return Object.fromEntries(
            Object.entries(overlayData).map(([pageKey, pageData]) => 
                [pageKey, this.mergePage(pageData)]
            )
        );
    }
}
