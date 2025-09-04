// background.js: Service Worker for integrated Chrome Extension
// Monitors web requests and manages paste state

importScripts('modules/config.js');

// A single timestamp is sufficient to manage the state.
// 0 means tab opening is disabled. A future timestamp means it's enabled until that time.
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
    const now = Date.now();

    // If a target URL is matched and we are within the enabled time window...
    if (urlToOpen && now < enabledUntil) {
      // Open the tab and immediately disable further tab opening to prevent duplicates.
      chrome.tabs.create({ url: urlToOpen });
      enabledUntil = 0; 
      console.log(`Opened new tab: ${urlToOpen}`);
    }
  },
  { urls: ["<all_urls>"] }
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PASTE_COMPLETED') {
    // Enable tab opening for the next 5 seconds.
    enabledUntil = Date.now() + 5000;
    console.log('Tab opening enabled for the next 5 seconds for any matching AI request.');
    // The state will automatically expire. No setTimeout is needed to clean it up.
  }
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Paster with Auto-Tab extension installed.');
});