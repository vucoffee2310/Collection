// background.js: Service Worker for Chrome Extension
// Monitors web requests and notifies the content script with the specific service detected.

let lastRequestTime = 0;
const REQUEST_COOLDOWN = 1000; // 1-second cooldown to prevent log spam

// Use a Map to associate API endpoints with the target URLs to open.
// This makes it easy to look up the correct URL for each service.
const TARGET_MAP = new Map([
  ['https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate', 'https://gemini.google.com/app'],
  ['https://chat.mistral.ai/api/chat', 'https://chat.mistral.ai/chat/'],
  ['https://chat.deepseek.com/api/v0/chat/completion', 'https://chat.deepseek.com/'],
  ['https://chatgpt.com/backend-api/f/conversation', 'https://chatgpt.com/']
]);

// Listen for web requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Remove query parameters and fragments from the URL for a clean comparison
    const cleanUrl = details.url.split('?')[0].split('#')[0];

    // Check if the request URL is one of our targets and get the corresponding URL to open
    const urlToOpen = TARGET_MAP.get(cleanUrl);

    if (urlToOpen) {
      const currentTime = Date.now();
      
      // Apply cooldown
      if (currentTime - lastRequestTime > REQUEST_COOLDOWN) {
        lastRequestTime = currentTime;
        
        // Notify the content script, now sending the specific URL to open.
        if (details.tabId > 0) {
          chrome.tabs.sendMessage(details.tabId, {
            type: 'AI_REQUEST_DETECTED',
            urlToOpen: urlToOpen // Pass the target URL in the message
          })
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