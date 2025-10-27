/**
 * Export Helper Utilities
 */

import { downloadFile } from '../utils/helpers.js';
import { getGlobalStats, getTranslatedUtterancesCount, getTranslationCoverage } from '../utils/json-helpers.js';

export { downloadFile };

export const getVideoId = () => {
  const url = new URL(location.href);
  return url.searchParams.get('v') || 'video';
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const estimateFileSize = (content) => {
  return new Blob([content]).size;
};

export const validateExportData = (jsonData) => {
  const errors = [];
  
  if (!jsonData) {
    errors.push('No data provided');
    return { valid: false, errors };
  }
  
  if (!jsonData.markers || typeof jsonData.markers !== 'object') {
    errors.push('Invalid markers structure');
  }
  
  if (jsonData.totalMarkers === undefined) {
    errors.push('Missing totalMarkers count');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const getExportStats = (jsonData) => {
  const globalStats = getGlobalStats(jsonData);
  
  if (!globalStats) {
    return {
      totalUtterances: 0,
      translatedUtterances: 0,
      totalDuration: 0,
      totalWords: 0,
      translationCoverage: 0,
      primaryLanguage: 'en'
    };
  }
  
  return {
    totalUtterances: globalStats.totalUtterances,
    translatedUtterances: getTranslatedUtterancesCount(jsonData),
    totalDuration: globalStats.totalDuration,
    totalWords: globalStats.totalWords,
    translationCoverage: getTranslationCoverage(jsonData),
    primaryLanguage: globalStats.primaryLanguage
  };
};

export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9_\-\.]/gi, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

export const getTimestampSuffix = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};