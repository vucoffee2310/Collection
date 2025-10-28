/**
 * Orphan Merger - Handle skipped/orphaned markers
 */

// ❌ REMOVED: import { findInstanceByDomainIndex } from '../../utils/json-helpers.js';

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
    
    leader.groupMembers.push({
      domainIndex: orphan.domainIndex,
      position: orphan.position,
      content: orphan.content,
      utterances: orphan.utterances || [],
      contentLength: orphan.content?.length || 0,
      totalUtteranceWords: orphan.utterances?.reduce((sum, u) => sum + (u.wordLength || 0), 0) || 0
    });
    
    if (orphan.utterances && orphan.utterances.length > 0) {
      orphan.utterances.forEach(utt => {
        utt._mergedFrom = orphan.domainIndex;
      });
      leader.utterances.push(...orphan.utterances);
    }
    
    console.log(`  ↳ Merged ${orphan.domainIndex} (#${orphan.position}) into orphan group`);
  }
};

const handleGapOrphans = (processor, orphans, precedingMatch) => {
  if (orphans.length === 1) {
    mergeOrphanToPreceding(processor, orphans[0], precedingMatch);
    return;
  }

  console.log(`👑 Creating GAP orphan group with ${orphans.length} members.`);
  const leader = orphans[0];
  leader.status = "ORPHAN_GROUP";
  leader.orphanGroupType = "GAP";
  leader.groupMembers = [];
  processor.stats.orphaned++;

  if (!leader.utterances) leader.utterances = [];

  for (let i = 1; i < orphans.length; i++) {
    const orphan = orphans[i];

    orphan.status = "MERGED";
    orphan.mergedInto = leader.domainIndex;
    orphan.mergeDirection = "ORPHAN_GROUP";
    processor.stats.merged++;

    leader.groupMembers.push({
      domainIndex: orphan.domainIndex,
      position: orphan.position,
      content: orphan.content,
      utterances: orphan.utterances || [],
      contentLength: orphan.content?.length || 0,
      totalUtteranceWords: orphan.utterances?.reduce((sum, u) => sum + (u.wordLength || 0), 0) || 0
    });

    if (orphan.utterances && orphan.utterances.length > 0) {
      orphan.utterances.forEach(utt => {
        utt._mergedFrom = orphan.domainIndex;
      });
      leader.utterances.push(...orphan.utterances);
    }
  }
};

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
    
    leader.groupMembers.push({
      domainIndex: orphan.domainIndex,
      position: orphan.position,
      content: orphan.content,
      utterances: orphan.utterances || [],
      contentLength: orphan.content?.length || 0,
      totalUtteranceWords: orphan.utterances?.reduce((sum, u) => sum + (u.wordLength || 0), 0) || 0
    });
    
    if (orphan.utterances && orphan.utterances.length > 0) {
      orphan.utterances.forEach(utt => {
        utt._mergedFrom = orphan.domainIndex;
      });
      leader.utterances.push(...orphan.utterances);
    }
    
    console.log(`  ↳ Merged ${orphan.domainIndex} (#${orphan.position}) into orphan group`);
  }
};

export const mergeOrphanToPreceding = (processor, orphanInstance, precedingMatch = null) => {
  const targetMatch = precedingMatch || processor.lastMatchedInstance;
  
  if (!targetMatch) {
    orphanInstance.status = "ORPHAN";
    processor.stats.orphaned++;
    
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
  
  targetMatch.mergedOrphans.push({
    domainIndex: orphanInstance.domainIndex,
    position: orphanInstance.position,
    content: orphanInstance.content,
    utterances: orphanInstance.utterances,
    contentLength: orphanInstance.content?.length || 0,
    totalUtteranceWords: orphanInstance.utterances?.reduce((sum, u) => sum + (u.wordLength || 0), 0) || 0,
    overallLength: orphanInstance.overallLength,
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
  
  if (targetMatch.overallLength !== undefined && orphanInstance.overallLength !== undefined) {
    targetMatch.overallLength += orphanInstance.overallLength;
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
  
  targetInstance.mergedOrphans.unshift({
    domainIndex: orphanInstance.domainIndex,
    position: orphanInstance.position,
    content: orphanInstance.content,
    utterances: orphanInstance.utterances,
    contentLength: orphanInstance.content?.length || 0,
    totalUtteranceWords: orphanInstance.utterances?.reduce((sum, u) => sum + (u.wordLength || 0), 0) || 0,
    overallLength: orphanInstance.overallLength,
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
  
  if (targetInstance.overallLength !== undefined && orphanInstance.overallLength !== undefined) {
    targetInstance.overallLength += orphanInstance.overallLength;
  }
  
  console.log(`🔗 Forward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${targetInstance.domainIndex}`);
};