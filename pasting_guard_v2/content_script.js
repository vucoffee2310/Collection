let isFileReadyToPaste = false;

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
  const selectors = {
    'gemini.google.com': 'div[role="textbox"]',
    'chatgpt.com': 'div[contenteditable="true"]',
    'copilot.microsoft.com': 'textarea[data-testid="chat-input"]'
  };
  
  return document.querySelector(selectors[window.location.hostname] || 'div[role="textbox"], textarea, div[contenteditable="true"]') ||
         document.querySelector('textarea[placeholder*="message"], div[contenteditable="true"]');
}

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
    } catch (e) {
      alert('Error pasting content. Please try again.');
      return;
    }

    const newIndex = nextItemIndex + 1;
    if (newIndex >= itemQueue.length) {
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
    } else {
      chrome.storage.local.set({ 
        nextItemIndex: newIndex,
        lastPastedType: isFile ? 'file' : 'text'
      });
    }
  });
}, true);