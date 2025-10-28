// tokuda6.4.4/js/app/lib/api.js
/**
 * API - LEAN
 */

export const getPot = (videoId) =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getPot', videoId }, (response) => {
      resolve(response || { pot: null, valid: false });
    });
  });

export const getPotWithRetry = async (videoId, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await getPot(videoId);

    if (response?.pot && response.valid) {
      return response;
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error(`Failed to get valid POT token after ${maxRetries} attempts`);
};