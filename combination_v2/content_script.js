// content_script.js: Handles user interaction events for pasting and submission detection.
let isFileReadyToPaste = false;
let lastPasteTime = 0;
let submissionHandled = false;

// Initialize and listen for storage changes
chrome.storage.local.get(['itemQueue'], (result) => {
  isFileReadyToPaste = result.itemQueue?.length > 0;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.itemQueue) {
    isFileReadyToPaste = changes.itemQueue.newValue?.length > 0;
  }
});

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
    
    if ((isFile && lastPastedType === 'file') || (!isFile && lastPastedType !== 'file' && lastPastedType !== null)) {
      alert(`Order violation! Cannot paste ${isFile ? 'file' : 'text'} after ${lastPastedType || 'start'}`);
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      return;
    }

    try {
      isFile ? await pasteFile(item) : pasteText(item);
      lastPasteTime = Date.now();
      submissionHandled = false; // Reset for new paste
    } catch (e) {
      console.error('Error pasting content:', e);
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

// Unified function to notify background script of submission
function handleSubmission() {
  // Prevent multiple notifications for the same submission
  if (submissionHandled) {
    return;
  }

  const input = findInput();
  if (!input) return;
  
  const hasContent = input.value?.trim() || input.textContent?.trim() || input.innerText?.trim();
  if (!hasContent) return;

  // Mark as handled immediately
  submissionHandled = true;
  
  // Send message to background
  chrome.runtime.sendMessage({ type: 'PASTE_COMPLETED' });
  
  // Reset after 5 seconds (allows for a new submission)
  setTimeout(() => {
    submissionHandled = false;
  }, 5000);
}

// Handle Enter key to detect form submission
document.addEventListener('keydown', (event) => {
  // Only handle if we recently pasted
  if (Date.now() - lastPasteTime > 5000) return;
  
  if (event.key === 'Enter' && !event.shiftKey) {
    const input = findInput();
    if (input && (input === document.activeElement || input.contains(document.activeElement))) {
      // Small delay to ensure the submission actually happens
      setTimeout(handleSubmission, 50);
    }
  }
}, true);

// Listen for clicks on submit buttons
document.addEventListener('click', (event) => {
  // Only handle if we recently pasted
  if (Date.now() - lastPasteTime > 5000) return;
  
  const submitButton = findSubmitButton();
  if (submitButton && (event.target === submitButton || submitButton.contains(event.target))) {
    // Small delay to ensure the submission actually happens
    setTimeout(handleSubmission, 50);
  }
}, true);