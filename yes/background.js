// background.js: Service Worker for Chrome Extension
// Monitors web requests and notifies the content script upon detection.

let lastRequestTime = 0;
const REQUEST_COOLDOWN = 1000; // 1-second cooldown to prevent log spam

// Use a Set for efficient lookups (O(1) average time complexity)
const TARGET_ENDPOINTS = new Set([
  'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
  'https://chat.mistral.ai/api/chat',
  'https://chat.deepseek.com/api/v0/chat/completion',
  'https://chatgpt.com/backend-api/f/conversation'
]);

// Listen for web requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Remove query parameters and fragments from the URL for a clean comparison
    const cleanUrl = details.url.split('?')[0].split('#')[0];

    // Check if the request URL is one of our targets
    if (TARGET_ENDPOINTS.has(cleanUrl)) {
      const currentTime = Date.now();
      
      // Apply cooldown
      if (currentTime - lastRequestTime > REQUEST_COOLDOWN) {
        lastRequestTime = currentTime;
        
        // Notify the content script in the relevant tab.
        // Check for tabId > 0 to ignore non-tab requests (e.g., from other extensions).
        if (details.tabId > 0) {
          chrome.tabs.sendMessage(details.tabId, { type: 'AI_REQUEST_DETECTED' })
            .catch(() => {
              // This catch is necessary to prevent errors if the content script
              // isn't available on the page (e.g., chrome:// pages, or if it hasn't loaded yet).
            });
        }
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Log a message when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Request Detector extension installed.');
});