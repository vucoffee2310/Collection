/**
 * Cache Builder - Build lookup caches for fast matching
 */

import { getPositionMap } from '../../utils/json-helpers.js';

export const buildCaches = (sourceJSON) => {
  const unmatchedMap = buildUnmatchedMap(sourceJSON);
  const sourcePrevCache = buildSourcePrevCache(sourceJSON);
  const positionMap = getPositionMap(sourceJSON);
  
  return { unmatchedMap, sourcePrevCache, positionMap };
};

const buildUnmatchedMap = (sourceJSON) => {
  const unmatchedMap = new Map();
  
  Object.entries(sourceJSON.markers).forEach(([markerKey, instances]) => {
    const unmatched = instances.filter(inst => 
      inst.status !== "MATCHED" && 
      inst.status !== "ORPHAN" && 
      inst.status !== "MERGED"
    );
    if (unmatched.length > 0) {
      unmatchedMap.set(markerKey, unmatched);
    }
  });
  
  return unmatchedMap;
};

const buildSourcePrevCache = (sourceJSON) => {
  const sourcePrevCache = new Map();
  
  Object.values(sourceJSON.markers).forEach(instances => {
    instances.forEach(instance => {
      const cacheKey = instance.domainIndex;
      
      const cache = {
        prev5: instance.prev5 ? JSON.stringify(instance.prev5) : null,
        prev4: instance.prev4 ? JSON.stringify(instance.prev4) : null,
        prev3: instance.prev3 ? JSON.stringify(instance.prev3) : null,
        prev5Choose4Set: new Set(instance.prev5Choose4?.map(c => JSON.stringify(c)) || []),
        prev5Choose3Set: new Set(instance.prev5Choose3?.map(c => JSON.stringify(c)) || []),
        prev4Choose3Set: new Set(instance.prev4Choose3?.map(c => JSON.stringify(c)) || [])
      };
      
      sourcePrevCache.set(cacheKey, cache);
    });
  });
  
  return sourcePrevCache;
};