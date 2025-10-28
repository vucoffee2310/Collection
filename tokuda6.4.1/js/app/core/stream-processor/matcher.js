/**
 * Marker Matcher - Match translation markers with source markers
 */

import { splitTranslationByWordRatio } from '../../utils/text/word-splitter.js';
import { safelyMergeCompounds } from '../../utils/compounds/merger.js';  // ✅ CHANGED
import { checkForOrphans } from './merger.js';

const buildPrevLookupMap = (unmatchedInstances, sourcePrevCache) => {
  const lookupMap = {
    prev5: new Map(),
    prev4: new Map(),
    prev3: new Map(),
    prev5Choose4: new Map(),
    prev5Choose3: new Map(),
    prev4Choose3: new Map()
  };
  
  unmatchedInstances.forEach(instance => {
    const cacheKey = instance.domainIndex;
    const cache = sourcePrevCache.get(cacheKey);
    
    if (!cache) return;
    
    if (cache.prev5) {
      lookupMap.prev5.set(cache.prev5, instance);
    }
    if (cache.prev4) {
      lookupMap.prev4.set(cache.prev4, instance);
    }
    if (cache.prev3) {
      lookupMap.prev3.set(cache.prev3, instance);
    }
    
    if (cache.prev5Choose4Set.size > 0) {
      cache.prev5Choose4Set.forEach(combo => {
        if (!lookupMap.prev5Choose4.has(combo)) {
          lookupMap.prev5Choose4.set(combo, []);
        }
        lookupMap.prev5Choose4.get(combo).push(instance);
      });
    }
    
    if (cache.prev5Choose3Set.size > 0) {
      cache.prev5Choose3Set.forEach(combo => {
        if (!lookupMap.prev5Choose3.has(combo)) {
          lookupMap.prev5Choose3.set(combo, []);
        }
        lookupMap.prev5Choose3.get(combo).push(instance);
      });
    }
    
    if (cache.prev4Choose3Set.size > 0) {
      cache.prev4Choose3Set.forEach(combo => {
        if (!lookupMap.prev4Choose3.has(combo)) {
          lookupMap.prev4Choose3.set(combo, []);
        }
        lookupMap.prev4Choose3.get(combo).push(instance);
      });
    }
  });
  
  return lookupMap;
};

export const matchAndUpdate = (processor, transMarker) => {
  processor.stats.processed++;
  
  const getPrev = (count) => {
    if (count === 0) return [];
    
    const len = processor.completedMarkers.length;
    if (len - 1 < count) return null;
    
    return processor.completedMarkers.slice(len - 1 - count, len - 1).map(m => m.marker);
  };
  
  const trans = {
    marker: transMarker.marker,
    letter: transMarker.letter,
    content: transMarker.content,
    position: transMarker.position
  };
  
  const markerIndex = processor.completedMarkers.length - 1;
  
  if (markerIndex < 3) {
    trans.edgeCase = markerIndex === 0 ? "start" : "partial";
    for (let j = 0; j <= markerIndex; j++) {
      trans[`prev${j}`] = getPrev(j);
    }
  } else {
    trans.prev5 = getPrev(5);
    trans.prev4 = getPrev(4);
    trans.prev3 = getPrev(3);
  }
  
  const markerKey = trans.marker;
  const unmatchedInstances = processor.unmatchedMap.get(markerKey);
  
  if (!unmatchedInstances || unmatchedInstances.length === 0) {
    return { matched: false, reason: 'no_unmatched_instances', sourcePosition: null };
  }
  
  const lookupKey = `${markerKey}_lookup`;
  if (!processor[lookupKey]) {
    processor[lookupKey] = buildPrevLookupMap(unmatchedInstances, processor.sourcePrevCache);
  }
  const lookupMap = processor[lookupKey];
  
  const transPrevCache = {
    prev5: trans.prev5 ? JSON.stringify(trans.prev5) : null,
    prev4: trans.prev4 ? JSON.stringify(trans.prev4) : null,
    prev3: trans.prev3 ? JSON.stringify(trans.prev3) : null
  };
  
  let matched = false;
  let matchMethod = null;
  let matchedInstance = null;
  
  for (const sourceInstance of unmatchedInstances) {
    if (sourceInstance.edgeCase && trans.edgeCase) {
      for (let j = 0; j <= markerIndex; j++) {
        const prevKey = `prev${j}`;
        if (sourceInstance[prevKey] !== undefined && trans[prevKey] !== undefined) {
          if (JSON.stringify(sourceInstance[prevKey]) === JSON.stringify(trans[prevKey])) {
            matchedInstance = sourceInstance;
            matchMethod = `edge_case_${prevKey}`;
            matched = true;
            break;
          }
        }
      }
      if (matched) break;
    }
  }
  
  if (!matched && transPrevCache.prev5) {
    matchedInstance = lookupMap.prev5.get(transPrevCache.prev5);
    if (matchedInstance) { matchMethod = 'prev5'; matched = true; }
  }
  
  if (!matched && transPrevCache.prev4) {
    const candidates = lookupMap.prev5Choose4.get(transPrevCache.prev4);
    if (candidates?.length > 0) { matchedInstance = candidates[0]; matchMethod = 'prev5Choose4'; matched = true; }
  }
  
  if (!matched && transPrevCache.prev3) {
    const candidates = lookupMap.prev5Choose3.get(transPrevCache.prev3);
    if (candidates?.length > 0) { matchedInstance = candidates[0]; matchMethod = 'prev5Choose3'; matched = true; }
  }
  
  if (!matched && transPrevCache.prev4) {
    matchedInstance = lookupMap.prev4.get(transPrevCache.prev4);
    if (matchedInstance) { matchMethod = 'prev4'; matched = true; }
  }
  
  if (!matched && transPrevCache.prev3) {
    const candidates = lookupMap.prev4Choose3.get(transPrevCache.prev3);
    if (candidates?.length > 0) { matchedInstance = candidates[0]; matchMethod = 'prev4Choose3'; matched = true; }
  }
  
  if (!matched && transPrevCache.prev3) {
    matchedInstance = lookupMap.prev3.get(transPrevCache.prev3);
    if (matchedInstance) { matchMethod = 'prev3'; matched = true; }
  }

  if (!matched && unmatchedInstances.length > 0) {
      let bestCandidate = unmatchedInstances.find(inst => inst.position > processor.lastMatchedPosition);
      if (!bestCandidate) {
          bestCandidate = unmatchedInstances.sort((a, b) => a.position - b.position)[0];
      }
      
      if (bestCandidate) {
          matchedInstance = bestCandidate;
          matchMethod = 'fallback_proximity';
          matched = true;
          console.warn(`⚠️ Context match failed for ${trans.marker} at trans pos #${trans.position}. Using FALLBACK match to source pos #${matchedInstance.position}. Re-synchronizing stream.`);
      }
  }
  
  if (matched && matchedInstance) {
    matchedInstance.overallTranslation = trans.content;
    matchedInstance._compoundsMerged = false;
    
    const mergedTranslation = safelyMergeCompounds(trans.content);
    matchedInstance.overallTranslationWithCompounds = mergedTranslation;
    matchedInstance._compoundsMerged = true;
    
    matchedInstance.status = "MATCHED";
    matchedInstance.matchMethod = matchMethod;
    
    if (matchedInstance.utterances && matchedInstance.utterances.length > 0) {
      const elementTranslations = splitTranslationByWordRatio(mergedTranslation, matchedInstance.utterances, 'vi');
      matchedInstance.utterances.forEach((utt, idx) => { utt.elementTranslation = elementTranslations[idx] || ''; });
    }
    
    processor.stats.matched++;
    
    checkForOrphans(processor, matchedInstance.position, matchedInstance);
    
    processor.lastMatchedPosition = matchedInstance.position;
    processor.lastMatchedInstance = matchedInstance;
    
    const remaining = unmatchedInstances.filter(inst => inst !== matchedInstance);
    if (remaining.length > 0) {
      processor.unmatchedMap.set(markerKey, remaining);
      delete processor[lookupKey];
    } else {
      processor.unmatchedMap.delete(markerKey);
      delete processor[lookupKey];
    }
    
    return { matched: true, method: matchMethod, sourcePosition: matchedInstance.position };
  }
  
  return { matched: false, reason: 'no_context_match', sourcePosition: null };
};