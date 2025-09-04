// background.js: Service Worker for integrated Chrome Extension
// Monitors web requests and manages paste state

importScripts('modules/config.js');

// In-memory lock to prevent race conditions from multiple, near-simultaneous web requests for a single submission.
// This is reset by the 'PASTE_COMPLETED' message, ensuring it's ready for the next user action.
let isProcessingTabCreation = false;

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
    // If a tab is already being created for the current submission, ignore all subsequent requests.
    if (isProcessingTabCreation) {
      return;
    }

    const cleanUrl = details.url.split('?')[0].split('#')[0];
    const urlToOpen = TARGET_MAP.get(cleanUrl);

    if (urlToOpen) {
      chrome.storage.local.get(['shouldOpenTab'], (result) => {
        // Check if the trigger is armed and the lock is not already taken (double-check after async call).
        if (result.shouldOpenTab && !isProcessingTabCreation) {
          // Acquire the lock to prevent other concurrent requests from proceeding.
          isProcessingTabCreation = true;

          // Disarm the persistent trigger first, then create the tab.
          chrome.storage.local.set({ shouldOpenTab: false }, () => {
            chrome.tabs.create({ url: urlToOpen });
            console.log(`AI request detected after paste. Opened new tab: ${urlToOpen}`);
          });
        }
      });
    }
  },
  { urls: ["<all_urls>"] }
);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PASTE_COMPLETED') {
    // A new submission has been initiated. Reset the lock and arm the persistent trigger.
    isProcessingTabCreation = false;
    chrome.storage.local.set({ shouldOpenTab: true });
    console.log('Paste completed, ready to open tab on next AI request');
  }
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Paster with Auto-Tab extension installed.');
});