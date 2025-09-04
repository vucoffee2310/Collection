// content.js: Runs on all pages.
// Listens for messages from the background script and logs to the console.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // When a message is received from our background script, log to the console.
  if (message.type === 'AI_REQUEST_DETECTED') {
    console.log('yes');
  }
});