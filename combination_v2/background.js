// background.js: Service Worker for integrated Chrome Extension
// Monitors web requests and manages paste state

importScripts('modules/config.js');

let tabOpeningEnabled = false;
let tabAlreadyOpened = false;
let enabledUntil = 0;

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
      const now = Date.now();
      
      // Check if we should open a tab
      if (tabOpeningEnabled && !tabAlreadyOpened && now < enabledUntil) {
        tabAlreadyOpened = true;
        chrome.tabs.create({ url: urlToOpen });
        console.log(`Opened new tab: ${urlToOpen}`);
        
        // Disable tab opening immediately after opening one
        tabOpeningEnabled = false;
        tabAlreadyOpened = false;
        enabledUntil = 0;
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PASTE_COMPLETED') {
    // Enable tab opening for the next 5 seconds
    tabOpeningEnabled = true;
    tabAlreadyOpened = false;
    enabledUntil = Date.now() + 5000;
    
    console.log('Tab opening enabled for next AI request');
    
    // Auto-disable after 5 seconds if no request came through
    setTimeout(() => {
      if (tabOpeningEnabled && Date.now() >= enabledUntil) {
        tabOpeningEnabled = false;
        tabAlreadyOpened = false;
        console.log('Tab opening window expired');
      }
    }, 5000);
  }
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Paster with Auto-Tab extension installed.');
});