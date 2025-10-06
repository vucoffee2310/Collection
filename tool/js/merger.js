// js/merger.js
import { parseCoords } from './utils.js';

const HORIZONTAL_TOLERANCE = 10;
const VERTICAL_TOLERANCE = 8; // Max gap to still be considered for merging.

/**
 * Determines if two overlay blocks can be merged.
 * They must be aligned, adjacent, and have compatible styles (e.g., same font size).
 */
function canMerge(blockA, blockB) {
    if (blockA.data.fontSize !== blockB.data.fontSize) {
        return false;
    }

    const [topA, leftA, bottomA, rightA] = blockA.coords;
    const [topB, leftB, bottomB, rightB] = blockB.coords;

    const isHorizontallyAligned =
        Math.abs(leftA - leftB) < HORIZONTAL_TOLERANCE &&
        Math.abs(rightA - rightB) < HORIZONTAL_TOLERANCE;

    const verticalGap = topB - bottomA;
    const isVerticallyAdjacent = verticalGap >= -2 && verticalGap < VERTICAL_TOLERANCE;

    return isHorizontallyAligned && isVerticallyAdjacent;
}

/**
 * Processes a single page of overlay data, merging adjacent blocks.
 * @param {object} pageState - The state data for a single page.
 * @returns {object} The merged state data for that page.
 */
function processPageForMerging(pageState) {
    if (!pageState || Object.keys(pageState).length === 0) {
        return {};
    }

    const blocks = Object.entries(pageState).map(([key, data]) => ({
        originalKey: key,
        coords: parseCoords(key),
        data: data
    })).filter(b => b.coords);

    blocks.sort((a, b) => a.coords[0] - b.coords[0] || a.coords[1] - b.coords[1]);

    if (blocks.length === 0) {
        return {};
    }
    
    const mergedBlocks = [];
    let currentGroup = [blocks[0]];

    for (let i = 1; i < blocks.length; i++) {
        const lastBlockInGroup = currentGroup[currentGroup.length - 1];
        const currentBlock = blocks[i];

        if (canMerge(lastBlockInGroup, currentBlock)) {
            currentGroup.push(currentBlock);
        } else {
            mergedBlocks.push(currentGroup);
            currentGroup = [currentBlock];
        }
    }
    mergedBlocks.push(currentGroup);

    const result = {};
    mergedBlocks.forEach(group => {
        if (group.length === 1) {
            const block = group[0];
            result[block.originalKey] = block.data;
        } else {
            const firstBlock = group[0];
            const lastBlock = group[group.length - 1];
            
            const newCoords = [
                firstBlock.coords[0],
                firstBlock.coords[1],
                lastBlock.coords[2],
                firstBlock.coords[3]
            ];
            
            const newText = group.map(b => b.data.text).join('    ');
            
            const newKey = JSON.stringify(newCoords);
            
            result[newKey] = {
                ...firstBlock.data,
                text: newText
            };
        }
    });

    return result;
}


/**
 * Takes the entire application overlay state and returns a merged version.
 * @param {object} overlayData - The complete, unmerged overlay data from the state.
 * @returns {object} A new object with adjacent overlays merged.
 */
export function getMergedState(overlayData) {
    const finalMergedData = {};
    for (const pageKey in overlayData) {
        finalMergedData[pageKey] = processPageForMerging(overlayData[pageKey]);
    }
    return finalMergedData;
}