// modules/config.js: Central configuration for AI platforms

const POST_FILE_TEXT = "This is the text after Ctrl V file";

const AI_PLATFORMS = {
  'gemini.google.com': {
    apiEndpoint: 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
    urlToOpen: 'https://gemini.google.com/app',
    inputSelector: 'div[role="textbox"]',
    submitSelector: 'button[aria-label*="Send"], button[data-testid="send-button"]',
  },
  'chatgpt.com': {
    apiEndpoint: 'https://chatgpt.com/backend-api/f/conversation',
    urlToOpen: 'https://chatgpt.com/',
    inputSelector: 'div[contenteditable="true"]',
    submitSelector: 'button[data-testid="send-button"], button[aria-label*="Send"]',
  },
  'chat.mistral.ai': {
    apiEndpoint: 'https://chat.mistral.ai/api/chat',
    urlToOpen: 'https://chat.mistral.ai/chat/',
    inputSelector: 'textarea, div[contenteditable="true"]',
    submitSelector: 'button[type="submit"], button[aria-label*="Send"]',
  },
  'chat.deepseek.com': {
    apiEndpoint: 'https://chat.deepseek.com/api/v0/chat/completion',
    urlToOpen: 'https://chat.deepseek.com/',
    inputSelector: 'textarea, div[contenteditable="true"]',
    submitSelector: 'button[type="submit"], button[aria-label*="Send"]',
  },
  'copilot.microsoft.com': {
    inputSelector: 'textarea[data-testid="chat-input"]',
    submitSelector: 'button[aria-label*="Submit"], button[data-testid="submit-button"]',
  }
};

const GENERAL_SELECTORS = {
  input: 'div[role="textbox"], textarea, div[contenteditable="true"], textarea[placeholder*="message"]',
  submit: 'button[type="submit"], button[aria-label*="Send"], button[data-testid*="send"]',
};