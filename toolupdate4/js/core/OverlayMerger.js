import { CONFIG } from '../config.js';
import { parseCoords } from '../utils.js';

export class OverlayMerger {
  canMerge(a, b) {
    if (a.data.fontSize !== b.data.fontSize) return false;
    
    const [ta, la, ba, ra] = a.coords;
    const [tb, lb, bb, rb] = b.coords;
    const H = CONFIG.MERGE.TOLERANCE_HORIZONTAL;
    
    // Check horizontal alignment
    if (Math.abs(la - lb) >= H || Math.abs(ra - rb) >= H) return false;
    
    // Check vertical proximity with dynamic tolerance
    const gap = tb - ba;
    const dynTol = (ba - ta) * 0.5;
    
    return gap >= -2 && gap < dynTol;
  }
  
  mergePage(pageData, coordOrder) {
    if (!pageData || !Object.keys(pageData).length) return {};
    
    // Parse and sort blocks once
    const blocks = Object.entries(pageData)
      .map(([key, data]) => ({
        key,
        coords: parseCoords(key, coordOrder),
        data
      }))
      .filter(b => b.coords.length === 4)
      .sort((a, b) => a.coords[0] - b.coords[0] || a.coords[1] - b.coords[1]);
    
    if (!blocks.length) return {};
    
    // Group mergeable blocks using reduce
    const groups = blocks.reduce((acc, block) => {
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && this.canMerge(lastGroup[lastGroup.length - 1], block)) {
        lastGroup.push(block);
      } else {
        acc.push([block]);
      }
      return acc;
    }, []);
    
    // Build output
    return groups.reduce((acc, group) => {
      if (group.length === 1) {
        acc[group[0].key] = group[0].data;
      } else {
        const first = group[0];
        const last = group[group.length - 1];
        const mergedKey = JSON.stringify([
          first.coords[0], 
          first.coords[1], 
          last.coords[2], 
          first.coords[3]
        ]);
        
        acc[mergedKey] = {
          ...first.data,
          text: group.map(b => `<div class="merged-text-block">${b.data.text}</div>`).join('')
        };
      }
      return acc;
    }, {});
  }
  
  mergeAllPages(data, stateManager) {
    return Object.fromEntries(
      Object.keys(data).map(key => {
        const pageNum = key.replace('page_', '');
        const coordOrder = stateManager.getPageCoordinateOrder(pageNum);
        return [key, this.mergePage(data[key], coordOrder)];
      })
    );
  }
}