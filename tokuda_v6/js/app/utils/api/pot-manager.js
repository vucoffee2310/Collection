/**
 * POT Manager
 * Retrieves POT (Proof of Origin Token) from background script
 */

/**
 * Get POT from background script
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} - POT response
 */
export const getPot = (videoId) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getPot', videoId },
      (response) => {
        resolve(response || {});
      }
    );
  });
};