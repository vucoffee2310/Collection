// FILE: combination_v2/modules/config.js

// modules/config.js: Central configuration for AI platforms

const POST_FILE_TEXT = "This is the text after Ctrl V file";

const AI_PLATFORMS = {
  'gemini.google.com': {
    apiEndpoint: 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
    urlToOpen: 'https://gemini.google.com/app',
    inputSelector: 'rich-textarea div.ql-editor',
    submitSelector: 'button.send-button, button[aria-label="Send message"]',
  },
  'chatgpt.com': {
    apiEndpoint: 'https://chatgpt.com/backend-api/f/conversation',
    urlToOpen: 'https://chatgpt.com/',
    inputSelector: '#prompt-textarea',
    submitSelector: 'button[data-testid="send-button"], button[aria-label*="Send"]',
  },
  'chat.mistral.ai': {
    apiEndpoint: 'https://chat.mistral.ai/api/chat',
    urlToOpen: 'https://chat.mistral.ai/chat/',
    inputSelector: 'div.ProseMirror',
    submitSelector: 'button[aria-label="Send message"]',
  },
  'chat.deepseek.com': {
    apiEndpoint: 'https://chat.deepseek.com/api/v0/chat/completion',
    urlToOpen: 'https://chat.deepseek.com/',
    inputSelector: 'textarea#chat-input',
    submitSelector: 'div:has(> textarea#chat-input) + div button',
  },
  'copilot.microsoft.com': {
    apiEndpoint: 'wss://copilot.microsoft.com/c/api/chat',
    urlToOpen: 'https://copilot.microsoft.com/',
    inputSelector: 'textarea#userInput',
    submitSelector: 'button[aria-label*="Submit"], button[data-testid="submit-button"]',
  },
  'www.kimi.com': {
    apiEndpoint: 'https://www.kimi.com/apiv2/kimi.chat.v1.ChatService/Chat',
    urlToOpen: 'https://www.kimi.com/chat/',
    inputSelector: 'div.chat-input-editor[contenteditable="true"]',
    submitSelector: 'div.send-button',
  },
  'chat.z.ai': {
	apiEndpoint: 'https://chat.z.ai/api/chat/completions',
    urlToOpen: 'https://chat.z.ai/',
    inputSelector: 'textarea#chat-input',
    submitSelector: 'button#send-message-button',
  },
  'chat.qwen.ai': {
    apiEndpoint: 'https://chat.qwen.ai/api/v2/chat/completions',
    urlToOpen: 'https://chat.qwen.ai/',
    inputSelector: 'textarea#chat-input',
    submitSelector: 'button#send-message-button',
    fileInputSelector: '#filesUpload'
  }
};

const GENERAL_SELECTORS = {
  input: 'div[role="textbox"], textarea, div[contenteditable="true"], textarea[placeholder*="message"]',
  submit: 'button[type="submit"], button[aria-label*="Send"], button[data-testid*="send"]',
};