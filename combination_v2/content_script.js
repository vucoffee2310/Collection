// content_script.js: Handles user interaction events for pasting and submission detection.
let isFileReadyToPaste = false;
let lastPasteTime = 0;
let submissionNotified = false; // Flag to prevent duplicate submission notifications
const SUBMISSION_COOLDOWN = 1000; // 1 second cooldown

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
    } catch (e) {
      console.error('Error pasting content:', e);
      alert('Error pasting content. Please try again.');
      return;
    }

    const newIndex = nextItemIndex + 1;
    if (newIndex >= itemQueue.length) {
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
      // We send the message via the submission handlers now, not here.
    } else {
      chrome.storage.local.set({ 
        nextItemIndex: newIndex,
        lastPastedType: isFile ? 'file' : 'text'
      });
    }
  });
}, true);

// Unified function to notify background script of submission
function notifyOnSubmit() {
  // If we've already sent a notification recently, do nothing.
  if (submissionNotified) {
    return;
  }

  const input = findInput();
  if (input && (input.value?.trim() || input.textContent?.trim() || input.innerText?.trim())) {
    // Set the flag immediately to prevent duplicates from other events (like click).
    submissionNotified = true;

    setTimeout(() => chrome.runtime.sendMessage({ type: 'PASTE_COMPLETED' }), 100);

    // Reset the flag after the cooldown period.
    setTimeout(() => {
      submissionNotified = false;
    }, SUBMISSION_COOLDOWN);
  }
}

// Handle Enter key to detect form submission
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && (Date.now() - lastPasteTime < 5000)) {
    const input = findInput();
    if (input && (input === document.activeElement || input.contains(document.activeElement))) {
      notifyOnSubmit();
    }
  }
}, true);

// Listen for clicks on submit buttons
document.addEventListener('click', (event) => {
  if (Date.now() - lastPasteTime < 5000) {
    const submitButton = findSubmitButton();
    if (submitButton && (event.target === submitButton || submitButton.contains(event.target))) {
      notifyOnSubmit();
    }
  }
}, true);