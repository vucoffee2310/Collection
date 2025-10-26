/**
 * Time Formatter Utility
 * Format timestamps for SRT/VTT subtitle formats
 */

/**
 * Pad number with leading zeros
 * @private
 */
const pad = (num, length = 2) => {
  return num.toString().padStart(length, '0');
};

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
 * 
 * @param {number} seconds - Time in seconds
 * @returns {string} - SRT formatted timestamp
 * 
 * @example
 * formatSRTTime(65.500)
 * // => "00:01:05,500"
 */
export const formatSRTTime = (seconds) => {
  if (typeof seconds !== 'number' || !isFinite(seconds)) {
    return '00:00:00,000';
  }
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
};

/**
 * Format seconds to VTT timestamp (HH:MM:SS.mmm)
 * 
 * @param {number} seconds - Time in seconds
 * @returns {string} - VTT formatted timestamp
 * 
 * @example
 * formatVTTTime(65.500)
 * // => "00:01:05.500"
 */
export const formatVTTTime = (seconds) => {
  if (typeof seconds !== 'number' || !isFinite(seconds)) {
    return '00:00:00.000';
  }
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
};

/**
 * Parse SRT timestamp to seconds
 * @param {string} timestamp - SRT timestamp
 * @returns {number} - Seconds
 */
export const parseSRTTime = (timestamp) => {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) return 0;
  
  const [, h, m, s, ms] = match.map(Number);
  return h * 3600 + m * 60 + s + ms / 1000;
};

/**
 * Parse VTT timestamp to seconds
 * @param {string} timestamp - VTT timestamp
 * @returns {number} - Seconds
 */
export const parseVTTTime = (timestamp) => {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) return 0;
  
  const [, h, m, s, ms] = match.map(Number);
  return h * 3600 + m * 60 + s + ms / 1000;
};

/**
 * Format duration in human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration
 * 
 * @example
 * formatDuration(3665)
 * // => "1h 1m 5s"
 */
export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || !isFinite(seconds)) {
    return '0s';
  }
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  
  return parts.join(' ');
};