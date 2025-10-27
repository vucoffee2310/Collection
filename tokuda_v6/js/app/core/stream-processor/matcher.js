/**
 * Marker Matcher - Match translation markers with source markers
 */

import { getGroupInfo } from '../../ui/cards/index.js';
import { splitTranslationByWordRatio } from '../../utils/text/index.js';
import { mergeVietnameseCompounds } from '../../utils/compounds/index.js';
import { checkForOrphans } from './merger.js';

export const matchAndUpdate = (processor, transMarker) => {
  processor.stats.processed++;
  
  const getPrev = (count) => {
    const pos = processor.completedMarkers.length - 1;
    if (pos < count) return null;
    return processor.completedMarkers.slice(pos - count, pos).map(m => m.marker);
  };
  
  const trans = {
    marker: transMarker.marker,
    letter: transMarker.letter,
    content: transMarker.content,
    position: transMarker.position
  };
  
  const markerIndex = trans.position - 1;
  if (markerIndex < 3) {
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
  
  const transPrevCache = {
    prev5: trans.prev5 ? JSON.stringify(trans.prev5) : null,
    prev4: trans.prev4 ? JSON.stringify(trans.prev4) : null,
    prev3: trans.prev3 ? JSON.stringify(trans.prev3) : null
  };
  
  let matched = false;
  let matchMethod = null;
  let matchedInstance = null;
  
  for (const sourceInstance of unmatchedInstances) {
    if (sourceInstance.edgeCase) {
      for (let j = 0; j <= 2; j++) {
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
      continue;
    }
    
    const cacheKey = sourceInstance.domainIndex;
    const sourcePrevCache = processor.sourcePrevCache.get(cacheKey);
    
    if (!sourcePrevCache) continue;
    
    if (transPrevCache.prev5 && sourcePrevCache.prev5 && 
        transPrevCache.prev5 === sourcePrevCache.prev5) {
      matchedInstance = sourceInstance;
      matchMethod = 'prev5';
      matched = true;
      break;
    }
    
    if (!matched && transPrevCache.prev4 && sourcePrevCache.prev5Choose4Set.size > 0) {
      if (sourcePrevCache.prev5Choose4Set.has(transPrevCache.prev4)) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev5Choose4';
        matched = true;
        break;
      }
    }
    
    if (!matched && transPrevCache.prev3 && sourcePrevCache.prev5Choose3Set.size > 0) {
      if (sourcePrevCache.prev5Choose3Set.has(transPrevCache.prev3)) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev5Choose3';
        matched = true;
        break;
      }
    }
    
    if (!matched && transPrevCache.prev4 && sourcePrevCache.prev4 && 
        transPrevCache.prev4 === sourcePrevCache.prev4) {
      matchedInstance = sourceInstance;
      matchMethod = 'prev4';
      matched = true;
      break;
    }
    
    if (!matched && transPrevCache.prev3 && sourcePrevCache.prev4Choose3Set.size > 0) {
      if (sourcePrevCache.prev4Choose3Set.has(transPrevCache.prev3)) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev4Choose3';
        matched = true;
        break;
      }
    }
    
    if (!matched && transPrevCache.prev3 && sourcePrevCache.prev3 && 
        transPrevCache.prev3 === sourcePrevCache.prev3) {
      matchedInstance = sourceInstance;
      matchMethod = 'prev3';
      matched = true;
      break;
    }
  }
  
  if (matched && matchedInstance) {
    // ✅ Store original translation WITHOUT compounds first
    matchedInstance.overallTranslation = trans.content;
    
    // ✅ Then merge compounds ONCE and store separately
    const mergedTranslation = mergeVietnameseCompounds(trans.content);
    matchedInstance.overallTranslationWithCompounds = mergedTranslation;
    
    matchedInstance.status = "MATCHED";
    matchedInstance.matchMethod = matchMethod;
    
    if (matchedInstance.utterances && matchedInstance.utterances.length > 0) {
      // ✅ Use the MERGED translation (with compounds) for splitting
      const elementTranslations = splitTranslationByWordRatio(
        mergedTranslation,
        matchedInstance.utterances,
        'vi'
      );
      
      matchedInstance.utterances.forEach((utt, idx) => {
        utt.elementTranslation = elementTranslations[idx] || '';
      });
      
      console.log(`✅ Split translation into ${matchedInstance.utterances.length} utterances for ${matchedInstance.domainIndex}`);
    } else {
      console.warn(`⚠️ No utterances found for ${matchedInstance.domainIndex}`);
    }
    
    processor.stats.matched++;
    
    checkForOrphans(processor, matchedInstance.position, matchedInstance);
    
    processor.lastMatchedPosition = matchedInstance.position;
    processor.lastMatchedInstance = matchedInstance;
    
    const remaining = unmatchedInstances.filter(inst => inst !== matchedInstance);
    if (remaining.length > 0) {
      processor.unmatchedMap.set(markerKey, remaining);
    } else {
      processor.unmatchedMap.delete(markerKey);
    }
    
    return { matched: true, method: matchMethod, sourcePosition: matchedInstance.position };
  }
  
  return { matched: false, reason: 'no_context_match', sourcePosition: null };
};