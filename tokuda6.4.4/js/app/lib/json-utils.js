/**
 * JSON Data Manipulation Utilities
 */

import { detectLanguage } from './helpers.js';

// ===== Position Mapping =====
export const getPositionMap = (jsonData) => {
  if (!jsonData?.markers) return new Map();

  const positionMap = new Map();

  Object.values(jsonData.markers).forEach((instances) => {
    instances.forEach((instance) => {
      positionMap.set(instance.position, instance);
    });
  });

  return positionMap;
};

// ===== Instance Lookup =====
export const findInstanceByPosition = (jsonData, position) => {
  const positionMap = getPositionMap(jsonData);
  return positionMap.get(position) || null;
};

export const findInstanceByDomainIndex = (jsonData, domainIndex) => {
  if (!jsonData?.markers || !domainIndex) return null;

  const letter = domainIndex.charAt(1);
  const markerKey = `(${letter})`;
  const instances = jsonData.markers[markerKey];

  return instances?.find((inst) => inst.domainIndex === domainIndex) || null;
};

export const findInstance = (jsonData, position) => {
  if (!jsonData?.markers) return null;

  for (const instances of Object.values(jsonData.markers)) {
    const found = instances.find((inst) => inst.position === position);
    if (found) return found;
  }

  return null;
};

// ===== Utterance Aggregation =====
const getAllUtterancesInternal = (jsonData) => {
  if (!jsonData?.markers) return [];

  const allUtterances = [];

  Object.values(jsonData.markers).forEach((instances) => {
    instances.forEach((instance) => {
      if (instance.utterances) {
        allUtterances.push(...instance.utterances);
      }
    });
  });

  allUtterances.sort((a, b) => (a.start || 0) - (b.start || 0));

  return allUtterances;
};

// ===== Language Statistics =====
export const getLanguageStats = (jsonData) => {
  const allUtterances = getAllUtterancesInternal(jsonData);

  const languageStats = {};
  allUtterances.forEach((utt) => {
    const lang = detectLanguage(utt.utterance);
    languageStats[lang] = (languageStats[lang] || 0) + 1;
  });

  const primaryLanguage =
    Object.entries(languageStats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';

  return {
    primaryLanguage,
    languageStats
  };
};

// ===== Global Statistics =====
export const getGlobalStats = (jsonData) => {
  if (!jsonData?.markers) return null;

  const allUtterances = getAllUtterancesInternal(jsonData);
  const totalWords = allUtterances.reduce((sum, u) => sum + (u.wordLength || 0), 0);
  const totalDuration =
    allUtterances.length > 0
      ? (allUtterances[allUtterances.length - 1].end || 0) - (allUtterances[0].start || 0)
      : 0;

  const { primaryLanguage, languageStats } = getLanguageStats(jsonData);

  return {
    totalUtterances: allUtterances.length,
    totalWords: totalWords,
    totalDuration: totalDuration,
    averageWordsPerUtterance:
      allUtterances.length > 0 ? (totalWords / allUtterances.length).toFixed(2) : 0,
    primaryLanguage: primaryLanguage,
    languageStats: languageStats,
    startTime: allUtterances[0]?.start || 0,
    endTime: allUtterances[allUtterances.length - 1]?.end || 0
  };
};