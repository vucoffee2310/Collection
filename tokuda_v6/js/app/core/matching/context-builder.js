/**
 * Context Builder
 * Builds context information for marker matching
 */

import { combinations } from '../../utils/text/combinatorics.js';

/**
 * Build context for a marker position
 * @param {Array<Object>} completedMarkers - Previously completed markers
 * @param {number} currentPosition - Current marker position (1-based)
 * @returns {Object} - Context object with prev arrays
 */
export const buildMarkerContext = (completedMarkers, currentPosition) => {
  const context = {
    position: currentPosition,
    edgeCase: null
  };
  
  const markerIndex = currentPosition - 1;
  
  // Helper to get previous N markers
  const getPrev = (count) => {
    const pos = completedMarkers.length - 1;
    if (pos < count) return null;
    return completedMarkers.slice(pos - count, pos).map(m => m.marker);
  };
  
  // Edge cases: first 3 positions
  if (markerIndex < 3) {
    if (markerIndex === 0) {
      context.edgeCase = "start";
    } else {
      context.edgeCase = "partial";
    }
    
    // Add prev0, prev1, prev2 as applicable
    for (let j = 0; j <= markerIndex; j++) {
      context[`prev${j}`] = getPrev(j);
    }
  } else {
    // Normal case: build prev3, prev4, prev5 with combinations
    const prev5 = getPrev(5);
    const prev4 = getPrev(4);
    const prev3 = getPrev(3);
    
    context.prev5 = prev5;
    context.prev4 = prev4;
    context.prev3 = prev3;
    
    // Generate combinations
    if (prev5 && prev5.length === 5) {
      context.prev5Choose4 = combinations(prev5, 4);
      context.prev5Choose3 = combinations(prev5, 3);
    }
    
    if (prev4 && prev4.length === 4) {
      context.prev4Choose3 = combinations(prev4, 3);
    }
  }
  
  return context;
};

/**
 * Build cached context for source markers
 * Pre-computes prev arrays and combinations for fast lookup
 * 
 * @param {Object} sourceJSON - Source JSON with markers
 * @returns {Map} - Map of domainIndex -> context cache
 */
export const buildSourceContextCache = (sourceJSON) => {
  const cache = new Map();
  
  Object.values(sourceJSON.markers || {}).forEach(instances => {
    instances.forEach(instance => {
      const cacheKey = instance.domainIndex;
      
      const contextCache = {
        prev5: instance.prev5 ? JSON.stringify(instance.prev5) : null,
        prev4: instance.prev4 ? JSON.stringify(instance.prev4) : null,
        prev3: instance.prev3 ? JSON.stringify(instance.prev3) : null,
        prev5Choose4Set: new Set(
          instance.prev5Choose4?.map(c => JSON.stringify(c)) || []
        ),
        prev5Choose3Set: new Set(
          instance.prev5Choose3?.map(c => JSON.stringify(c)) || []
        ),
        prev4Choose3Set: new Set(
          instance.prev4Choose3?.map(c => JSON.stringify(c)) || []
        )
      };
      
      cache.set(cacheKey, contextCache);
    });
  });
  
  return cache;
};

/**
 * Compare two context objects for matching
 * @param {Object} transContext - Translation marker context
 * @param {Object} sourceContext - Source marker context
 * @returns {Object} - Match result { matched, method }
 */
export const compareContexts = (transContext, sourceContext) => {
  // Handle edge cases
  if (sourceContext.edgeCase) {
    for (let j = 0; j <= 2; j++) {
      const prevKey = `prev${j}`;
      if (sourceContext[prevKey] !== undefined && transContext[prevKey] !== undefined) {
        if (JSON.stringify(sourceContext[prevKey]) === JSON.stringify(transContext[prevKey])) {
          return { matched: true, method: `edge_case_${prevKey}` };
        }
      }
    }
    return { matched: false };
  }
  
  // Build trans context strings
  const transPrev5 = transContext.prev5 ? JSON.stringify(transContext.prev5) : null;
  const transPrev4 = transContext.prev4 ? JSON.stringify(transContext.prev4) : null;
  const transPrev3 = transContext.prev3 ? JSON.stringify(transContext.prev3) : null;
  
  // Try exact prev5 match
  if (transPrev5 && sourceContext.prev5 && transPrev5 === sourceContext.prev5) {
    return { matched: true, method: 'prev5' };
  }
  
  // Try prev5Choose4
  if (transPrev4 && sourceContext.prev5Choose4Set?.has(transPrev4)) {
    return { matched: true, method: 'prev5Choose4' };
  }
  
  // Try prev5Choose3
  if (transPrev3 && sourceContext.prev5Choose3Set?.has(transPrev3)) {
    return { matched: true, method: 'prev5Choose3' };
  }
  
  // Try exact prev4 match
  if (transPrev4 && sourceContext.prev4 && transPrev4 === sourceContext.prev4) {
    return { matched: true, method: 'prev4' };
  }
  
  // Try prev4Choose3
  if (transPrev3 && sourceContext.prev4Choose3Set?.has(transPrev3)) {
    return { matched: true, method: 'prev4Choose3' };
  }
  
  // Try exact prev3 match
  if (transPrev3 && sourceContext.prev3 && transPrev3 === sourceContext.prev3) {
    return { matched: true, method: 'prev3' };
  }
  
  return { matched: false };
};