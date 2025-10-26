/**
 * Orphan Merger - Handle skipped/orphaned markers
 */

import { getGroupInfo } from '../../ui/cards/index.js';

export const mergeOrphanForward = (processor, orphanInstance, targetInstance) => {
  orphanInstance.status = "MERGED";
  orphanInstance.mergedInto = targetInstance.domainIndex;
  orphanInstance.mergeDirection = "FORWARD";
  processor.stats.merged++;
  
  if (!targetInstance.mergedOrphans) {
    targetInstance.mergedOrphans = [];
  }
  
  targetInstance.mergedOrphans.unshift({
    domainIndex: orphanInstance.domainIndex,
    position: orphanInstance.position,
    content: orphanInstance.content,
    utterances: orphanInstance.utterances,
    contentLength: orphanInstance.contentLength,
    totalUtteranceWords: orphanInstance.totalUtteranceWords,
    mergeDirection: "FORWARD"
  });
  
  if (orphanInstance.utteranceCount > 0) {
    if (!targetInstance.utterances) {
      targetInstance.utterances = [];
    }
    
    orphanInstance.utterances.forEach(utt => {
      utt._mergedFrom = orphanInstance.domainIndex;
    });
    
    targetInstance.utterances.unshift(...orphanInstance.utterances);
    targetInstance.utteranceCount = targetInstance.utterances.length;
  }
  
  if (processor.events.length < processor.maxEvents) {
    const eventIndex = processor.events.length;
    const groupInfo = getGroupInfo(eventIndex);
    
    processor.events.push({
      type: 'marker_merged',
      marker: orphanInstance.domainIndex,
      position: orphanInstance.position,
      mergedInto: targetInstance.domainIndex,
      mergeDirection: 'FORWARD',
      reason: 'forward_merge',
      detectedBetween: `Forward-merged into ${targetInstance.domainIndex}`,
      group: groupInfo.groupNumber,
      eventIndex: eventIndex
    });
  }
  
  console.log(`🔗 Forward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${targetInstance.domainIndex}`);
};

export const mergeOrphanToPreceding = (processor, orphanInstance) => {
  if (!processor.lastMatchedInstance) {
    orphanInstance.status = "ORPHAN";
    processor.stats.orphaned++;
    
    if (processor.events.length < processor.maxEvents) {
      const eventIndex = processor.events.length;
      const groupInfo = getGroupInfo(eventIndex);
      
      processor.events.push({
        type: 'marker_orphaned',
        marker: orphanInstance.domainIndex,
        position: orphanInstance.position,
        reason: 'no_preceding_match',
        detectedBetween: 'No preceding match to merge with',
        group: groupInfo.groupNumber,
        eventIndex: eventIndex
      });
    }
    
    console.log(`⚠️ Orphan: ${orphanInstance.domainIndex} (#${orphanInstance.position})`);
    return;
  }
  
  orphanInstance.status = "MERGED";
  orphanInstance.mergedInto = processor.lastMatchedInstance.domainIndex;
  orphanInstance.mergeDirection = "BACKWARD";
  processor.stats.merged++;
  
  if (!processor.lastMatchedInstance.mergedOrphans) {
    processor.lastMatchedInstance.mergedOrphans = [];
  }
  
  processor.lastMatchedInstance.mergedOrphans.push({
    domainIndex: orphanInstance.domainIndex,
    position: orphanInstance.position,
    content: orphanInstance.content,
    utterances: orphanInstance.utterances,
    contentLength: orphanInstance.contentLength,
    totalUtteranceWords: orphanInstance.totalUtteranceWords,
    mergeDirection: "BACKWARD"
  });
  
  if (orphanInstance.utteranceCount > 0) {
    if (!processor.lastMatchedInstance.utterances) {
      processor.lastMatchedInstance.utterances = [];
    }
    
    orphanInstance.utterances.forEach(utt => {
      utt._mergedFrom = orphanInstance.domainIndex;
    });
    
    processor.lastMatchedInstance.utterances.push(...orphanInstance.utterances);
    processor.lastMatchedInstance.utteranceCount = processor.lastMatchedInstance.utterances.length;
  }
  
  if (processor.events.length < processor.maxEvents) {
    const eventIndex = processor.events.length;
    const groupInfo = getGroupInfo(eventIndex);
    
    processor.events.push({
      type: 'marker_merged',
      marker: orphanInstance.domainIndex,
      position: orphanInstance.position,
      mergedInto: processor.lastMatchedInstance.domainIndex,
      mergeDirection: 'BACKWARD',
      reason: 'backward_merge',
      detectedBetween: `Backward-merged into ${processor.lastMatchedInstance.domainIndex}`,
      group: groupInfo.groupNumber,
      eventIndex: eventIndex
    });
  }
  
  console.log(`🔗 Backward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${processor.lastMatchedInstance.domainIndex}`);
};

export const checkForOrphans = (processor, beforePosition, currentMatchedInstance = null) => {
  const startPos = processor.lastMatchedPosition + 1;
  const endPos = beforePosition - 1;
  
  if (startPos > endPos) return;
  
  console.log(`🔍 Checking #${startPos}-#${endPos} for orphans`);
  
  for (let pos = startPos; pos <= endPos; pos++) {
    const instance = processor.positionMap.get(pos);
    
    if (instance && instance.status === "GAP") {
      if (!processor.lastMatchedInstance && currentMatchedInstance) {
        mergeOrphanForward(processor, instance, currentMatchedInstance);
      } else {
        mergeOrphanToPreceding(processor, instance);
      }
    }
  }
  
  processor.rebuildUnmatchedMap();
};