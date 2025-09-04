let isFileReadyToPaste = false;

// Check for existing queue and listen for changes
chrome.storage.local.get(['itemQueue'], (result) => {
  isFileReadyToPaste = result.itemQueue?.length > 0;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.itemQueue) {
    isFileReadyToPaste = changes.itemQueue.newValue?.length > 0;
  }
});

async function dataURLtoFile(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const extension = blob.type.split('/')[1] || 'bin';
  return new File([blob], `file_${Date.now()}.${extension}`, { type: blob.type });
}

function findInput() {
  const hostname = window.location.hostname;
  
  // Platform-specific selectors
  const selectors = {
    'gemini.google.com': 'div[role="textbox"]',
    'chatgpt.com': 'div[contenteditable="true"]',
    'chat.qwen.ai': 'textarea, div[contenteditable="true"], div[role="textbox"]',
    'chat.deepseek.com': 'textarea, div[contenteditable="true"], div[role="textbox"]',
    'chat.z.ai': 'textarea, div[contenteditable="true"], div[role="textbox"]',
    'chat.mistral.ai': 'textarea, div[contenteditable="true"], div[role="textbox"]'
  };
  
  const selector = selectors[hostname] || 'div[role="textbox"], textarea, div[contenteditable="true"]';
  
  // Try the specific selector first, then fallback to common selectors
  let input = document.querySelector(selector);
  
  if (!input) {
    // Fallback selectors for various chat interfaces
    const fallbackSelectors = [
      'div[role="textbox"]',
      'textarea[placeholder*="message"], textarea[placeholder*="Message"]',
      'div[contenteditable="true"]',
      'input[type="text"]',
      '#prompt-textarea',
      '.chat-input textarea',
      '.input-area textarea'
    ];
    
    for (const fallbackSelector of fallbackSelectors) {
      input = document.querySelector(fallbackSelector);
      if (input) break;
    }
  }
  
  return input;
}

async function pasteFile(dataUrl) {
  const file = await dataURLtoFile(dataUrl);
  const input = findInput();
  if (!input) return alert("Input not found.");
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  
  // Focus the input first
  input.focus();
  
  // Try multiple paste approaches for better compatibility
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true, 
    cancelable: true, 
    clipboardData: dataTransfer
  });
  
  input.dispatchEvent(pasteEvent);
  
  // Fallback: try dispatching on document if input didn't work
  if (!pasteEvent.defaultPrevented) {
    document.dispatchEvent(pasteEvent);
  }
}

function pasteText(text) {
  const input = findInput();
  if (!input) return alert("Input not found.");
  
  input.focus();
  
  // Try different methods based on input type
  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    // For textarea/input elements
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const currentValue = input.value;
    
    input.value = currentValue.substring(0, start) + text + currentValue.substring(end);
    input.selectionStart = input.selectionEnd = start + text.length;
    
    // Trigger input events
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // For contenteditable divs
    try {
      // Modern approach
      if (document.execCommand) {
        document.execCommand('insertText', false, text);
      } else {
        // Fallback for newer browsers
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          input.textContent += text;
        }
      }
      
      // Trigger input events for contenteditable
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {
      // Final fallback
      input.textContent += text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'v' || !isFileReadyToPaste) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  chrome.storage.local.get(['itemQueue', 'nextItemIndex', 'lastPastedType'], async (result) => {
    const { itemQueue = [], nextItemIndex = 0, lastPastedType = null } = result;
    
    if (nextItemIndex >= itemQueue.length) {
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      navigator.clipboard.writeText('');
      return;
    }

    const item = itemQueue[nextItemIndex];
    const isFile = item.startsWith('data:');
    
    // Guard: enforce alternating order
    if ((isFile && lastPastedType === 'file') || (!isFile && lastPastedType !== 'file' && lastPastedType !== null)) {
      alert(`Order violation! Cannot paste ${isFile ? 'file' : 'text'} after ${lastPastedType || 'start'}`);
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      return;
    }

    // Paste the item
    if (isFile) {
      await pasteFile(item);
    } else {
      pasteText(item);
    }

    const newIndex = nextItemIndex + 1;
    if (newIndex >= itemQueue.length) {
      // Done - cleanup
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      navigator.clipboard.writeText('');
    } else {
      // Update for next paste
      chrome.storage.local.set({ 
        nextItemIndex: newIndex,
        lastPastedType: isFile ? 'file' : 'text'
      });
    }
  });
}, true);