// background.js: Service Worker for integrated Chrome Extension
// Monitors web requests and manages paste state

let lastRequestTime = 0;
const REQUEST_COOLDOWN = 1000; // 1-second cooldown to prevent log spam

// Map API endpoints to target URLs
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

    // Check if the request URL is one of our targets
    const urlToOpen = TARGET_MAP.get(cleanUrl);

    if (urlToOpen) {
      const currentTime = Date.now();
      
      // Apply cooldown
      if (currentTime - lastRequestTime > REQUEST_COOLDOWN) {
        lastRequestTime = currentTime;
        
        // Check if we should open a new tab (based on paste state)
        chrome.storage.local.get(['shouldOpenTab'], (result) => {
          if (result.shouldOpenTab) {
            // Open new tab
            chrome.tabs.create({ url: urlToOpen });
            
            // Reset the flag
            chrome.storage.local.set({ shouldOpenTab: false });
            
            console.log(`AI request detected after paste. Opened new tab: ${urlToOpen}`);
          }
        });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PASTE_COMPLETED') {
    // Set flag to indicate we should open tab on next AI request
    chrome.storage.local.set({ shouldOpenTab: true });
    console.log('Paste completed, ready to open tab on next AI request');
  }
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Paster with Auto-Tab extension installed.');
});