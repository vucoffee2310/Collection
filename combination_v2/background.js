// background.js: Service Worker for integrated Chrome Extension
// Monitors web requests, manages paste state, and holds the file queue in memory.

importScripts('modules/config.js'); // We no longer need utils.js here

// --- State Management ---
let enabledUntil = 0;
// The queue of dataURLs and text strings will be held in memory here.
let itemContentQueue = [];

// --- Web Request Listener (for auto-tab opening) ---
const TARGET_MAP = new Map();
for (const host in AI_PLATFORMS) {
  const platform = AI_PLATFORMS[host];
  if (platform.apiEndpoint && platform.urlToOpen) {
    TARGET_MAP.set(platform.apiEndpoint, platform.urlToOpen);
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const cleanUrl = details.url.split('?')[0].split('#')[0];
    const urlToOpen = TARGET_MAP.get(cleanUrl);
    const now = Date.now();

    if (urlToOpen && now < enabledUntil) {
      chrome.tabs.create({ url: urlToOpen });
      enabledUntil = 0;
      console.log(`Opened new tab: ${urlToOpen}`);
    }
  },
  { urls: ["<all_urls>"] }
);

// --- Message Listener (for communication with popup and content scripts) ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // --- From Popup: Setting up the file queue ---
  if (message.type === 'SETUP_QUEUE') {
    // The queue received from the popup is already an array of strings (dataURLs and text).
    itemContentQueue = message.queue || [];
    console.log(`Queue set up in background with ${itemContentQueue.length} items.`);
    sendResponse({ success: true });
    return true; 
  }

  // --- From Content Script: Requesting the next item to paste ---
  if (message.type === 'GET_ITEM_CONTENT') {
    const index = message.index;
    if (index >= 0 && index < itemContentQueue.length) {
      const item = itemContentQueue[index];
      // The item is always a string, so we just send it back directly.
      sendResponse({ data: item });
    } else {
      sendResponse({ error: 'Index out of bounds.' });
    }
    return true; 
  }

  // --- From Content Script: Submission detected ---
  if (message.type === 'PASTE_COMPLETED') {
    enabledUntil = Date.now() + 5000;
    console.log('Tab opening enabled for the next 5 seconds.');
  }

  // --- From Popup: Stop command ---
  if (message.type === 'STOP_PROCESS') {
    itemContentQueue = []; // Clear the in-memory queue
    console.log('Pasting process stopped and queue cleared.');
    sendResponse({ success: true });
  }
});

// Log when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Chat Paster with Auto-Tab extension installed.');
});