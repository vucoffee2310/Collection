// content_script.js: Handles file/text pasting and detects form submissions
let isFileReadyToPaste = false;
let lastPasteTime = 0;

// Initialize paste state from storage
chrome.storage.local.get(['itemQueue'], (result) => {
  isFileReadyToPaste = result.itemQueue?.length > 0;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.itemQueue) {
    isFileReadyToPaste = changes.itemQueue.newValue?.length > 0;
  }
});

// Convert data URL to File object
async function dataURLtoFile(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const extension = blob.type.split('/')[1] || 'bin';
  return new File([blob], `file_${Date.now()}.${extension}`, { type: blob.type });
}

// Find the input element for different AI platforms
function findInput() {
  const selectors = {
    'gemini.google.com': 'div[role="textbox"]',
    'chatgpt.com': 'div[contenteditable="true"]',
    'copilot.microsoft.com': 'textarea[data-testid="chat-input"]',
    'chat.mistral.ai': 'textarea, div[contenteditable="true"]',
    'chat.deepseek.com': 'textarea, div[contenteditable="true"]'
  };
  
  return document.querySelector(selectors[window.location.hostname] || 'div[role="textbox"], textarea, div[contenteditable="true"]') ||
         document.querySelector('textarea[placeholder*="message"], div[contenteditable="true"]');
}

// Paste file content
async function pasteFile(dataUrl) {
  const file = await dataURLtoFile(dataUrl);
  const input = findInput();
  if (!input) return alert("Input not found.");
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.focus();
  
  input.dispatchEvent(new ClipboardEvent('paste', {
    bubbles: true, 
    cancelable: true, 
    clipboardData: dataTransfer
  }));
}

// Paste text content
function pasteText(text) {
  const input = findInput();
  if (!input) return alert("Input not found.");
  
  input.focus();
  
  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    const start = input.selectionStart;
    input.value = input.value.substring(0, start) + text + input.value.substring(input.selectionEnd);
    input.selectionStart = input.selectionEnd = start + text.length;
  } else {
    document.execCommand('insertText', false, text) || (input.textContent += text);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// Find submit button for different platforms
function findSubmitButton() {
  const selectors = {
    'gemini.google.com': 'button[aria-label*="Send"], button[data-testid="send-button"]',
    'chatgpt.com': 'button[data-testid="send-button"], button[aria-label*="Send"]',
    'copilot.microsoft.com': 'button[aria-label*="Submit"], button[data-testid="submit-button"]',
    'chat.mistral.ai': 'button[type="submit"], button[aria-label*="Send"]',
    'chat.deepseek.com': 'button[type="submit"], button[aria-label*="Send"]'
  };
  
  return document.querySelector(selectors[window.location.hostname] || 'button[type="submit"], button[aria-label*="Send"], button[data-testid*="send"]');
}

// Handle Ctrl+V pasting
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'v' || !isFileReadyToPaste) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  chrome.storage.local.get(['itemQueue', 'nextItemIndex', 'lastPastedType'], async (result) => {
    const { itemQueue = [], nextItemIndex = 0, lastPastedType = null } = result;
    
    if (nextItemIndex >= itemQueue.length) {
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      return;
    }

    const item = itemQueue[nextItemIndex];
    const isFile = item.startsWith('data:');
    
    // Enforce alternating order
    if ((isFile && lastPastedType === 'file') || (!isFile && lastPastedType !== 'file' && lastPastedType !== null)) {
      alert(`Order violation! Cannot paste ${isFile ? 'file' : 'text'} after ${lastPastedType || 'start'}`);
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      return;
    }

    try {
      isFile ? await pasteFile(item) : pasteText(item);
      lastPasteTime = Date.now(); // Record paste time
    } catch (e) {
      alert('Error pasting content. Please try again.');
      return;
    }

    const newIndex = nextItemIndex + 1;
    if (newIndex >= itemQueue.length) {
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      
      // Notify background script that pasting is complete
      chrome.runtime.sendMessage({ type: 'PASTE_COMPLETED' });
    } else {
      chrome.storage.local.set({ 
        nextItemIndex: newIndex,
        lastPastedType: isFile ? 'file' : 'text'
      });
    }
  });
}, true);

// Handle Enter key to detect form submission
document.addEventListener('keydown', (event) => {
  // Check if Enter was pressed and we recently pasted content
  if (event.key === 'Enter' && !event.shiftKey && (Date.now() - lastPasteTime < 5000)) {
    const input = findInput();
    
    // Check if the focus is on a chat input and there's content
    if (input && (input === document.activeElement || input.contains(document.activeElement))) {
      const hasContent = input.value?.trim() || input.textContent?.trim() || input.innerText?.trim();
      
      if (hasContent) {
        // Small delay to let the form submission happen first
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'PASTE_COMPLETED' });
        }, 100);
      }
    }
  }
}, true);

// Also listen for button clicks on submit buttons
document.addEventListener('click', (event) => {
  if (Date.now() - lastPasteTime < 5000) { // Within 5 seconds of paste
    const submitButton = findSubmitButton();
    
    if (submitButton && (event.target === submitButton || submitButton.contains(event.target))) {
      const input = findInput();
      const hasContent = input && (input.value?.trim() || input.textContent?.trim() || input.innerText?.trim());
      
      if (hasContent) {
        // Small delay to let the form submission happen first
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'PASTE_COMPLETED' });
        }, 100);
      }
    }
  }
}, true);