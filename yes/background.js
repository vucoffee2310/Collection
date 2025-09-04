// Background script (Service Worker) for Chrome Extension
// This monitors all web requests across all tabs

let lastRequestTime = 0;
const REQUEST_COOLDOWN = 1000; // 1 second cooldown to avoid duplicate logs

// List of endpoints to detect (exact matches)
const TARGET_ENDPOINTS = [
  'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
  'https://chat.mistral.ai/api/chat',
  'https://chat.deepseek.com/api/v0/chat/completion',
  'https://chatgpt.com/backend-api/f/conversation'
];

// Function to check if URL exactly matches any target endpoint
function isExactMatch(url) {
  return TARGET_ENDPOINTS.some(endpoint => {
    // Remove query parameters and fragments from the URL for comparison
    const cleanUrl = url.split('?')[0].split('#')[0];
    return cleanUrl === endpoint;
  });
}

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // Check if the request URL exactly matches any of the target endpoints
    if (isExactMatch(details.url)) {
      const currentTime = Date.now();
      
      // Only log if this is a new request (not within cooldown period)
      if (currentTime - lastRequestTime > REQUEST_COOLDOWN) {
        console.log('yes');
        lastRequestTime = currentTime;
        
        // Send message to content script for the latest request
        try {
          if (details.tabId && details.tabId > 0) {
            chrome.tabs.sendMessage(details.tabId, {
              type: 'LATEST_AI_REQUEST_DETECTED',
              url: details.url,
              timestamp: currentTime
            }).catch(() => {
              // Ignore errors if content script is not available
            });
          }
        } catch (error) {
          // Ignore messaging errors
        }
      }
    }
  },
  {
    urls: ["<all_urls>"]
  }
);

// Optional: Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Request Detector extension installed');
  lastRequestTime = 0; // Reset on installation
});