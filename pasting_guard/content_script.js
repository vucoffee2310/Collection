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
  return document.querySelector('div[role="textbox"]');
}

async function pasteFile(dataUrl) {
  const file = await dataURLtoFile(dataUrl);
  const input = findInput();
  if (!input) return alert("Input not found.");
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.dispatchEvent(new ClipboardEvent('paste', {
    bubbles: true, cancelable: true, clipboardData: dataTransfer
  }));
}

function pasteText(text) {
  const input = findInput();
  if (!input) return alert("Input not found.");
  input.focus();
  document.execCommand('insertText', false, text);
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