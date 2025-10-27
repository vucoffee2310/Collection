/**
 * JSON Data Helpers - Single source of truth accessors
 * All data calculated on-demand from markers (no _meta)
 */

import { detectLanguage } from './helpers.js';

/**
 * Get all utterances sorted by start time
 */
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

/**
 * Get position map (built on-demand)
 */
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

/**
 * Find instance by position
 */
export const findInstanceByPosition = (jsonData, position) => {
  const positionMap = getPositionMap(jsonData);
  return positionMap.get(position) || null;
};

/**
 * Find instance by position (alternative method - search through markers)
 */
export const findInstance = (jsonData, position) => {
  if (!jsonData?.markers) return null;
  
  for (const instances of Object.values(jsonData.markers)) {
    const found = instances.find(inst => inst.position === position);
    if (found) return found;
  }
  
  return null;
};

/**
 * Get language statistics
 */
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

/**
 * Get instance-level stats (calculated on-demand from utterances)
 */
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

/**
 * Get global stats (calculated on-demand from markers)
 */
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

/**
 * Get translated utterances count
 */
export const getTranslatedUtterancesCount = (jsonData) => {
  if (!jsonData?.markers) return 0;
  
  const allUtterances = getAllUtterancesSorted(jsonData);
  
  return allUtterances.filter(utt => {
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  }).length;
};

/**
 * Get translation coverage percentage
 */
export const getTranslationCoverage = (jsonData) => {
  const stats = getGlobalStats(jsonData);
  if (!stats || stats.totalUtterances === 0) return 0;
  
  const translated = getTranslatedUtterancesCount(jsonData);
  return ((translated / stats.totalUtterances) * 100).toFixed(1);
};

/**
 * Get all instances with a specific status
 */
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

/**
 * Get processing statistics
 */
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