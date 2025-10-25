/**
 * Export Helper Utilities
 * Common utilities for export operations
 */

/**
 * Download file to user's system
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Get current video ID from URL
 * @returns {string} - Video ID or 'video' fallback
 */
export const getVideoId = () => {
  const url = new URL(location.href);
  return url.searchParams.get('v') || 'video';
};

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Estimate file size for content
 * @param {string} content - File content
 * @returns {number} - Estimated size in bytes
 */
export const estimateFileSize = (content) => {
  return new Blob([content]).size;
};

/**
 * Validate export data
 * @param {Object} jsonData - JSON data to validate
 * @returns {Object} - {valid: boolean, errors: Array}
 */
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

/**
 * Get export statistics
 * @param {Object} jsonData - Processed JSON data
 * @returns {Object} - Export statistics
 */
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

/**
 * Generate export metadata
 * @param {string} format - Export format (srt, vtt, txt, json)
 * @param {Object} jsonData - Processed JSON data
 * @returns {Object} - Export metadata
 */
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

/**
 * Create export manifest (for batch exports)
 * @param {Array} exports - Array of export objects
 * @returns {Object} - Export manifest
 */
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

/**
 * Sanitize filename
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9_\-\.]/gi, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

/**
 * Generate timestamp suffix for filenames
 * @returns {string} - Timestamp string (YYYYMMDD_HHMMSS)
 */
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