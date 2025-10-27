/**
 * JSON Data Helpers - Single source of truth accessors
 */

import { detectLanguage, formatSRTTime } from './helpers.js';
import { countWordsConsistent } from './text/index.js';

export const getAllUtterancesSorted = (jsonData) => {
  if (!jsonData?.markers) return [];
  
  const allUtterances = [];
  
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(instance => {
      if (instance.utterances) {
        allUtterances.push(...instance.utterances);
      }
    });
  });
  
  allUtterances.sort((a, b) => (a.start || 0) - (b.start || 0));
  
  return allUtterances;
};

export const getPositionMap = (jsonData) => {
  if (!jsonData?.markers) return new Map();
  
  const positionMap = new Map();
  
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(instance => {
      positionMap.set(instance.position, instance);
    });
  });
  
  return positionMap;
};

export const findInstanceByPosition = (jsonData, position) => {
  const positionMap = getPositionMap(jsonData);
  return positionMap.get(position) || null;
};

export const findInstance = (jsonData, position) => {
  if (!jsonData?.markers) return null;
  
  for (const instances of Object.values(jsonData.markers)) {
    const found = instances.find(inst => inst.position === position);
    if (found) return found;
  }
  
  return null;
};

export const findInstanceByDomainIndex = (jsonData, domainIndex) => {
  if (!jsonData?.markers || !domainIndex) return null;
  
  const letter = domainIndex.charAt(1);
  const markerKey = `(${letter})`;
  const instances = jsonData.markers[markerKey];
  
  return instances?.find(inst => inst.domainIndex === domainIndex) || null;
};

export const getLanguageStats = (jsonData) => {
  const allUtterances = getAllUtterancesSorted(jsonData);
  
  const languageStats = {};
  allUtterances.forEach(utt => {
    const lang = detectLanguage(utt.utterance);
    languageStats[lang] = (languageStats[lang] || 0) + 1;
  });
  
  const primaryLanguage = Object.entries(languageStats)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';
  
  return {
    primaryLanguage,
    languageStats
  };
};

export const getInstanceStats = (instance) => {
  if (!instance) return null;
  
  const utterances = instance.utterances || [];
  
  return {
    contentLength: instance.content?.length || 0,
    utteranceCount: utterances.length,
    totalUtteranceWords: utterances.reduce((sum, u) => sum + (u.wordLength || 0), 0),
    totalDuration: utterances.reduce((sum, u) => sum + (u.duration || 0), 0),
    hasTranslation: !!instance.overallTranslation,
    translationLength: instance.overallTranslation?.length || 0
  };
};

export const getGlobalStats = (jsonData) => {
  if (!jsonData?.markers) return null;
  
  const allUtterances = getAllUtterancesSorted(jsonData);
  const totalWords = allUtterances.reduce((sum, u) => sum + (u.wordLength || 0), 0);
  const totalDuration = allUtterances.length > 0 
    ? (allUtterances[allUtterances.length - 1].end || 0) - (allUtterances[0].start || 0)
    : 0;
  
  const { primaryLanguage, languageStats } = getLanguageStats(jsonData);
  
  return {
    totalUtterances: allUtterances.length,
    totalWords: totalWords,
    totalDuration: totalDuration,
    averageWordsPerUtterance: allUtterances.length > 0 
      ? (totalWords / allUtterances.length).toFixed(2)
      : 0,
    primaryLanguage: primaryLanguage,
    languageStats: languageStats,
    startTime: allUtterances[0]?.start || 0,
    endTime: allUtterances[allUtterances.length - 1]?.end || 0
  };
};

export const getTranslatedUtterancesCount = (jsonData) => {
  if (!jsonData?.markers) return 0;
  
  const allUtterances = getAllUtterancesSorted(jsonData);
  
  return allUtterances.filter(utt => {
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  }).length;
};

export const getTranslationCoverage = (jsonData) => {
  const stats = getGlobalStats(jsonData);
  if (!stats || stats.totalUtterances === 0) return 0;
  
  const translated = getTranslatedUtterancesCount(jsonData);
  return ((translated / stats.totalUtterances) * 100).toFixed(1);
};

export const getInstancesByStatus = (jsonData, status) => {
  if (!jsonData?.markers) return [];
  
  const instances = [];
  Object.values(jsonData.markers).forEach(markerInstances => {
    markerInstances.forEach(inst => {
      if (inst.status === status) {
        instances.push(inst);
      }
    });
  });
  
  return instances;
};

export const getProcessingStats = (jsonData) => {
  if (!jsonData?.markers) return null;
  
  const stats = {
    total: 0,
    matched: 0,
    merged: 0,
    orphaned: 0,
    gap: 0
  };
  
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(inst => {
      stats.total++;
      const status = inst.status?.toLowerCase() || 'gap';
      if (stats.hasOwnProperty(status)) {
        stats[status]++;
      }
    });
  });
  
  stats.successRate = stats.total > 0 
    ? (((stats.matched + stats.merged) / stats.total) * 100).toFixed(1)
    : 0;
  
  return stats;
};

/**
 * Get card display data for an instance
 * ✅ ROOT FIX: Simply reads fullTranslation from JSON
 */
export const getCardDisplayData = (instance, sourceJSON) => {
  if (!instance) return null;
  
  const stats = getInstanceStats(instance);
  
  // ✅ Simply read full translation from JSON (no reconstruction needed!)
  const fullTranslation = instance.fullTranslationWithCompounds || instance.fullTranslation || 
                          instance.overallTranslationWithCompounds || instance.overallTranslation || '';
  
  // Count compounds in full translation
  const hasCompounds = fullTranslation.includes('«') || fullTranslation.includes('»');
  let compoundCount = 0;
  if (hasCompounds) {
    const matches = fullTranslation.match(/«/g);
    compoundCount = matches ? matches.length : 0;
  }
  
  // Build original text
  let originalText = '';
  const forwardMerged = instance.mergedOrphans?.filter(o => o.mergeDirection === 'FORWARD') || [];
  const backwardMerged = instance.mergedOrphans?.filter(o => o.mergeDirection === 'BACKWARD') || [];
  
  if (forwardMerged.length > 0) {
    originalText += forwardMerged.map(o => o.content).join(' ') + ' ';
  }
  originalText += instance.content || '';
  if (backwardMerged.length > 0) {
    originalText += ' ' + backwardMerged.map(o => o.content).join(' ');
  }
  
  const isOrphanGroup = instance.status === 'ORPHAN_GROUP';
  if (isOrphanGroup && instance.groupMembers?.length > 0) {
    originalText = instance.content || '';
    instance.groupMembers.forEach(member => {
      originalText += ' ' + (member.content || '');
    });
  }
  
  return {
    domainIndex: instance.domainIndex,
    position: instance.position,
    status: instance.status,
    matchMethod: instance.matchMethod,
    
    originalText: originalText.trim(),
    translationText: fullTranslation,  // ✅ Just read from JSON
    
    hasTranslation: !!fullTranslation,
    hasCompounds: hasCompounds,
    compoundCount: compoundCount,
    utteranceCount: stats.utteranceCount,
    totalWords: stats.totalUtteranceWords,
    
    forwardMerged: forwardMerged,
    backwardMerged: backwardMerged,
    hasMerges: forwardMerged.length > 0 || backwardMerged.length > 0,
    
    isOrphanGroup: isOrphanGroup,
    orphanGroupType: instance.orphanGroupType,
    groupMembers: instance.groupMembers || [],
    
    instance: instance
  };
};

/**
 * Get utterance display data
 */
export const getUtteranceDisplayData = (utterance, allUtterances, totalTranslationWords) => {
  const translationWords = countWordsConsistent(utterance.elementTranslation || '', 'vi');
  const percentage = totalTranslationWords > 0 
    ? ((translationWords / totalTranslationWords) * 100).toFixed(1) 
    : 0;
  
  const totalOriginalWords = allUtterances.reduce((sum, u) => sum + (u.wordLength || 0), 0);
  const originalPercentage = totalOriginalWords > 0 
    ? ((utterance.wordLength / totalOriginalWords) * 100).toFixed(1) 
    : 0;
  
  return {
    index: utterance.index,
    markerDomainIndex: utterance.markerDomainIndex,
    
    originalText: utterance.utterance,
    translationText: utterance.elementTranslation || '',
    
    start: utterance.start,
    end: utterance.end,
    duration: utterance.duration,
    durationMs: utterance.duration ? (utterance.duration * 1000).toFixed(0) : 0,
    timestamp: formatSRTTime(utterance.start),
    
    wordLength: utterance.wordLength,
    translationWords: translationWords,
    originalPercentage: parseFloat(originalPercentage),
    translationPercentage: parseFloat(percentage),
    
    isMerged: !!utterance.mergedSource,
    mergedSource: utterance.mergedSource
  };
};