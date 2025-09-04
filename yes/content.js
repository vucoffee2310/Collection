// Content script - runs on all pages
// This provides additional monitoring within the page context

let lastContentRequestTime = 0;
const CONTENT_REQUEST_COOLDOWN = 1000; // 1 second cooldown

// List of endpoints to detect (exact matches)
const TARGET_ENDPOINTS = [
  'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
  'https://chat.mistral.ai/api/chat',
  'https://chat.deepseek.com/api/v0/chat/completion',
  'https://chatgpt.com/backend-api/f/conversation'
];

// Function to check if URL exactly matches any target endpoint
function isExactMatch(url) {
  if (!url) return false;
  return TARGET_ENDPOINTS.some(endpoint => {
    // Remove query parameters and fragments from the URL for comparison
    const cleanUrl = url.split('?')[0].split('#')[0];
    return cleanUrl === endpoint;
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LATEST_AI_REQUEST_DETECTED') {
    console.log('yes');
  }
});

// Additional method: Intercept requests at the page level
(function() {
  try {
    // Intercept XMLHttpRequests
    const originalXMLHttpRequest = window.XMLHttpRequest;
    const originalOpen = originalXMLHttpRequest.prototype.open;
    
    originalXMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (isExactMatch(url)) {
        const currentTime = Date.now();
        if (currentTime - lastContentRequestTime > CONTENT_REQUEST_COOLDOWN) {
          console.log('yes');
          lastContentRequestTime = currentTime;
        }
      }
      return originalOpen.apply(this, [method, url, ...args]);
    };

    // Intercept Fetch requests
    const originalFetch = window.fetch;
    
    window.fetch = function(input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        
        if (isExactMatch(url)) {
          const currentTime = Date.now();
          if (currentTime - lastContentRequestTime > CONTENT_REQUEST_COOLDOWN) {
            console.log('yes');
            lastContentRequestTime = currentTime;
          }
        }
      } catch (e) {
        // Ignore errors in URL checking
      }
      
      return originalFetch.apply(this, arguments);
    };
  } catch (error) {
    // Ignore errors in request interception setup
  }
})();