// background.js: Service Worker for integrated Chrome Extension
// Monitors web requests and manages paste state

importScripts('modules/config.js');

let lastRequestTime = 0;
const REQUEST_COOLDOWN = 1000; // 1-second cooldown

// Build the target map from the shared config
const TARGET_MAP = new Map();
for (const host in AI_PLATFORMS) {
  const platform = AI_PLATFORMS[host];
  if (platform.apiEndpoint && platform.urlToOpen) {
    TARGET_MAP.set(platform.apiEndpoint, platform.urlToOpen);
  }
}

// Listen for web requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const cleanUrl = details.url.split('?')[0].split('#')[0];
    const urlToOpen = TARGET_MAP.get(cleanUrl);

    if (urlToOpen) {
      const currentTime = Date.now();
      if (currentTime - lastRequestTime > REQUEST_COOLDOWN) {
        lastRequestTime = currentTime;
        
        chrome.storage.local.get(['shouldOpenTab'], (result) => {
          if (result.shouldOpenTab) {
            chrome.tabs.create({ url: urlToOpen });
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
    chrome.storage.local.set({ shouldOpenTab: true });
    console.log('Paste completed, ready to open tab on next AI request');
  }
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Paster with Auto-Tab extension installed.');
});