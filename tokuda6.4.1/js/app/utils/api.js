/**
 * API Integration - POT Token Only
 */

export const getPotWithRetry = async (videoId, maxRetries = 3) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await new Promise(resolve => 
        chrome.runtime.sendMessage({ action: 'getPot', videoId }, resolve)
      );
      
      if (response?.pot && response.valid) {
        console.log(`✅ Got valid POT (attempt ${attempt + 1})`);
        return response;
      }
      
      console.warn(`⚠️ POT invalid/expired (attempt ${attempt + 1}/${maxRetries})`);
      
      if (attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Failed to get valid POT token after ' + maxRetries + ' attempts');
  };
  
  export const getPot = (videoId) => new Promise(resolve => 
    chrome.runtime.sendMessage({ action: 'getPot', videoId }, response => {
      resolve(response || {});
    })
  );