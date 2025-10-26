/**
 * Export Helper Utilities
 */

import { downloadFile } from '../utils/helpers.js';

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
  
  if (!jsonData._meta) {
    errors.push('Missing metadata');
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
  if (!jsonData || !jsonData._meta) {
    return {
      totalUtterances: 0,
      translatedUtterances: 0,
      totalDuration: 0,
      translationCoverage: 0
    };
  }
  
  const allUtterances = jsonData._meta.allUtterancesSorted || [];
  
  const translatedUtterances = allUtterances.filter(utt => {
    const parentMarker = jsonData.markers[`(${utt.markerDomainIndex?.charAt(1)})`]
      ?.find(m => m.domainIndex === utt.markerDomainIndex);
    return parentMarker?.status === 'MATCHED' && utt.elementTranslation;
  });
  
  const totalDuration = jsonData._meta.totalDuration || 0;
  const coverage = allUtterances.length > 0
    ? (translatedUtterances.length / allUtterances.length * 100).toFixed(1)
    : 0;
  
  return {
    totalUtterances: allUtterances.length,
    translatedUtterances: translatedUtterances.length,
    totalDuration: totalDuration,
    translationCoverage: coverage
  };
};

export const generateExportMetadata = (format, jsonData) => {
  const stats = getExportStats(jsonData);
  const videoId = getVideoId();
  const timestamp = new Date().toISOString();
  
  return {
    exportFormat: format,
    videoId: videoId,
    exportDate: timestamp,
    statistics: stats,
    version: '1.0'
  };
};

export const createExportManifest = (exports) => {
  return {
    version: '1.0',
    created: new Date().toISOString(),
    videoId: getVideoId(),
    exports: exports.map(exp => ({
      format: exp.format,
      filename: exp.filename,
      size: estimateFileSize(exp.content),
      stats: exp.stats
    })),
    totalFiles: exports.length
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