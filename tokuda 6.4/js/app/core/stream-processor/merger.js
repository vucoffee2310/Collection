/**
 * Orphan Merger - Handle skipped/orphaned markers
 * ✅ Updates overallLength when merging
 */

import { getGroupInfo } from '../../ui/cards/index.js';
import { getInstanceStats } from '../../utils/json-helpers.js';

/**
 * Check for orphans and apply appropriate merge strategy
 */
export const checkForOrphans = (processor, beforePosition, currentMatchedInstance = null) => {
  const startPos = processor.lastMatchedPosition + 1;
  const endPos = beforePosition - 1;
  
  if (startPos > endPos) return;
  
  console.log(`🔍 Checking #${startPos}-#${endPos} for orphans`);
  
  const orphans = [];
  for (let pos = startPos; pos <= endPos; pos++) {
    const instance = processor.positionMap.get(pos);
    if (instance && instance.status === "GAP") {
      orphans.push(instance);
    }
  }
  
  if (orphans.length === 0) return;
  
  if (!processor.lastMatchedInstance && currentMatchedInstance) {
    handleLeadingOrphans(processor, orphans);
  } else if (processor.lastMatchedInstance) {
    handleGapOrphans(processor, orphans, processor.lastMatchedInstance);
  } else {
    handleTrailingOrphans(processor, orphans);
  }
  
  processor.rebuildUnmatchedMap();
};

/**
 * Handle leading orphans - create self-contained group
 */
const handleLeadingOrphans = (processor, orphans) => {
  if (orphans.length === 0) return;
  
  const leader = orphans[0];
  leader.status = "ORPHAN_GROUP";
  leader.orphanGroupType = "LEADING";
  leader.groupMembers = [];
  processor.stats.orphaned++;
  
  console.log(`👑 Leading orphan group: ${leader.domainIndex} (#${leader.position})`);
  
  if (!leader.utterances) leader.utterances = [];
  
  for (let i = 1; i < orphans.length; i++) {
    const orphan = orphans[i];
    
    orphan.status = "MERGED";
    orphan.mergedInto = leader.domainIndex;
    orphan.mergeDirection = "ORPHAN_GROUP";
    processor.stats.merged++;
    
    const orphanStats = getInstanceStats(orphan);
    leader.groupMembers.push({
      domainIndex: orphan.domainIndex,
      position: orphan.position,
      content: orphan.content,
      utterances: orphan.utterances || [],
      contentLength: orphanStats.contentLength,
      totalUtteranceWords: orphanStats.totalUtteranceWords
    });
    
    if (orphan.utterances && orphan.utterances.length > 0) {
      orphan.utterances.forEach(utt => {
        utt._mergedFrom = orphan.domainIndex;
      });
      leader.utterances.push(...orphan.utterances);
    }
    
    console.log(`  ↳ Merged ${orphan.domainIndex} (#${orphan.position}) into orphan group`);
    
    if (processor.events.length < processor.maxEvents) {
      const eventIndex = processor.events.length;
      const groupInfo = getGroupInfo(eventIndex);
      
      processor.events.push({
        type: 'marker_merged',
        marker: orphan.domainIndex,
        position: orphan.position,
        mergedInto: leader.domainIndex,
        mergeDirection: 'ORPHAN_GROUP',
        reason: 'leading_orphan_group',
        detectedBetween: `Grouped into leading orphan ${leader.domainIndex}`,
        group: groupInfo.groupNumber,
        eventIndex: eventIndex
      });
    }
  }
  
  if (processor.events.length < processor.maxEvents) {
    const eventIndex = processor.events.length;
    const groupInfo = getGroupInfo(eventIndex);
    
    processor.events.push({
      type: 'orphan_group_created',
      marker: leader.domainIndex,
      position: leader.position,
      orphanGroupType: 'LEADING',
      memberCount: orphans.length - 1,
      reason: 'no_preceding_match',
      detectedBetween: `Leading orphan group with ${orphans.length} members`,
      group: groupInfo.groupNumber,
      eventIndex: eventIndex
    });
  }
};

/**
 * Handle gap orphans - merge backward into preceding match
 */
const handleGapOrphans = (processor, orphans, precedingMatch) => {
  orphans.forEach(orphan => {
    mergeOrphanToPreceding(processor, orphan, precedingMatch);
  });
};

/**
 * Handle trailing orphans - create self-contained group
 */
const handleTrailingOrphans = (processor, orphans) => {
  if (orphans.length === 0) return;
  
  const leader = orphans[0];
  leader.status = "ORPHAN_GROUP";
  leader.orphanGroupType = "TRAILING";
  leader.groupMembers = [];
  processor.stats.orphaned++;
  
  console.log(`👑 Trailing orphan group: ${leader.domainIndex} (#${leader.position})`);
  
  if (!leader.utterances) leader.utterances = [];
  
  for (let i = 1; i < orphans.length; i++) {
    const orphan = orphans[i];
    
    orphan.status = "MERGED";
    orphan.mergedInto = leader.domainIndex;
    orphan.mergeDirection = "ORPHAN_GROUP";
    processor.stats.merged++;
    
    const orphanStats = getInstanceStats(orphan);
    leader.groupMembers.push({
      domainIndex: orphan.domainIndex,
      position: orphan.position,
      content: orphan.content,
      utterances: orphan.utterances || [],
      contentLength: orphanStats.contentLength,
      totalUtteranceWords: orphanStats.totalUtteranceWords
    });
    
    if (orphan.utterances && orphan.utterances.length > 0) {
      orphan.utterances.forEach(utt => {
        utt._mergedFrom = orphan.domainIndex;
      });
      leader.utterances.push(...orphan.utterances);
    }
    
    console.log(`  ↳ Merged ${orphan.domainIndex} (#${orphan.position}) into orphan group`);
  }
  
  if (processor.events.length < processor.maxEvents) {
    const eventIndex = processor.events.length;
    const groupInfo = getGroupInfo(eventIndex);
    
    processor.events.push({
      type: 'orphan_group_created',
      marker: leader.domainIndex,
      position: leader.position,
      orphanGroupType: 'TRAILING',
      memberCount: orphans.length - 1,
      reason: 'no_following_match',
      detectedBetween: `Trailing orphan group with ${orphans.length} members`,
      group: groupInfo.groupNumber,
      eventIndex: eventIndex
    });
  }
};

/**
 * Merge orphan backward into preceding match
 */
export const mergeOrphanToPreceding = (processor, orphanInstance, precedingMatch = null) => {
  const targetMatch = precedingMatch || processor.lastMatchedInstance;
  
  if (!targetMatch) {
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
  orphanInstance.mergedInto = targetMatch.domainIndex;
  orphanInstance.mergeDirection = "BACKWARD";
  processor.stats.merged++;
  
  if (!targetMatch.mergedOrphans) {
    targetMatch.mergedOrphans = [];
  }
  
  const orphanStats = getInstanceStats(orphanInstance);
  
  targetMatch.mergedOrphans.push({
    domainIndex: orphanInstance.domainIndex,
    position: orphanInstance.position,
    content: orphanInstance.content,
    utterances: orphanInstance.utterances,
    contentLength: orphanStats.contentLength,
    totalUtteranceWords: orphanStats.totalUtteranceWords,
    overallLength: orphanInstance.overallLength,  // ✅ Include overallLength
    mergeDirection: "BACKWARD"
  });
  
  if (orphanInstance.utterances && orphanInstance.utterances.length > 0) {
    if (!targetMatch.utterances) {
      targetMatch.utterances = [];
    }
    
    orphanInstance.utterances.forEach(utt => {
      utt._mergedFrom = orphanInstance.domainIndex;
    });
    
    targetMatch.utterances.push(...orphanInstance.utterances);
  }
  
  // ✅ Update target's overallLength
  if (targetMatch.overallLength !== undefined && orphanInstance.overallLength !== undefined) {
    targetMatch.overallLength += orphanInstance.overallLength;
  }
  
  if (processor.events.length < processor.maxEvents) {
    const eventIndex = processor.events.length;
    const groupInfo = getGroupInfo(eventIndex);
    
    processor.events.push({
      type: 'marker_merged',
      marker: orphanInstance.domainIndex,
      position: orphanInstance.position,
      mergedInto: targetMatch.domainIndex,
      mergeDirection: 'BACKWARD',
      reason: 'backward_merge',
      detectedBetween: `Backward-merged into ${targetMatch.domainIndex}`,
      group: groupInfo.groupNumber,
      eventIndex: eventIndex
    });
  }
  
  console.log(`🔗 Backward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${targetMatch.domainIndex}`);
};

export const mergeOrphanForward = (processor, orphanInstance, targetInstance) => {
  orphanInstance.status = "MERGED";
  orphanInstance.mergedInto = targetInstance.domainIndex;
  orphanInstance.mergeDirection = "FORWARD";
  processor.stats.merged++;
  
  if (!targetInstance.mergedOrphans) {
    targetInstance.mergedOrphans = [];
  }
  
  const orphanStats = getInstanceStats(orphanInstance);
  
  targetInstance.mergedOrphans.unshift({
    domainIndex: orphanInstance.domainIndex,
    position: orphanInstance.position,
    content: orphanInstance.content,
    utterances: orphanInstance.utterances,
    contentLength: orphanStats.contentLength,
    totalUtteranceWords: orphanStats.totalUtteranceWords,
    overallLength: orphanInstance.overallLength,  // ✅ Include overallLength
    mergeDirection: "FORWARD"
  });
  
  if (orphanInstance.utterances && orphanInstance.utterances.length > 0) {
    if (!targetInstance.utterances) {
      targetInstance.utterances = [];
    }
    
    orphanInstance.utterances.forEach(utt => {
      utt._mergedFrom = orphanInstance.domainIndex;
    });
    
    targetInstance.utterances.unshift(...orphanInstance.utterances);
  }
  
  // ✅ Update target's overallLength
  if (targetInstance.overallLength !== undefined && orphanInstance.overallLength !== undefined) {
    targetInstance.overallLength += orphanInstance.overallLength;
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