/**
 * Video ID Utility
 * Extract YouTube video ID from URL
 */

/**
 * Get current YouTube video ID from URL
 * @returns {string|null} - Video ID or null
 */
export const getVideoId = () => {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('v');
  } catch (err) {
    console.error('Failed to parse URL:', err);
    return null;
  }
};

/**
 * Extract video ID from any YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 * 
 * @example
 * extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // => 'dQw4w9WgXcQ'
 * 
 * extractVideoId('https://youtu.be/dQw4w9WgXcQ')
 * // => 'dQw4w9WgXcQ'
 */
export const extractVideoId = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Standard format: youtube.com/watch?v=...
    if (urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }
    
    // Short format: youtu.be/...
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    
    // Embed format: youtube.com/embed/...
    const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) {
      return embedMatch[1];
    }
    
    return null;
  } catch (err) {
    console.error('Invalid URL:', err);
    return null;
  }
};

/**
 * Check if current page is a YouTube video page
 * @returns {boolean} - True if on video page
 */
export const isVideoPage = () => {
  return window.location.hostname.includes('youtube.com') && 
         getVideoId() !== null;
};