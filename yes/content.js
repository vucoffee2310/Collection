// content.js: Runs on all pages.
// Listens for messages from the background script.
// If an AI request is detected, it opens the specific URL provided in the message.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check for the specific message type from our background script.
  if (message.type === 'AI_REQUEST_DETECTED' && message.urlToOpen) {
    
    // The background script told us which URL to open.
    console.log(`AI request detected. Opening: ${message.urlToOpen}`);
    
    // Open the specified URL in a new tab.
    window.open(message.urlToOpen, '_blank');
  }
});