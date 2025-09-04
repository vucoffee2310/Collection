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

  chrome.storage.local.get(['itemQueue', 'nextItemIndex'], async (result) => {
    const { itemQueue = [], nextItemIndex = 0 } = result;
    
    if (nextItemIndex >= itemQueue.length) {
      isFileReadyToPaste = false;
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex']);
      return;
    }

    const item = itemQueue[nextItemIndex];
    
    try {
      if (item.startsWith('data:')) {
        await pasteFile(item);
      } else {
        pasteText(item);
      }
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
      chrome.storage.local.remove(['itemQueue', 'nextItemIndex']);
    } else {
      chrome.storage.local.set({ nextItemIndex: newIndex });
    }
  });
}, true);


// --- Submission Detection Logic ---

// Unified function to notify background script of submission
function handleSubmission() {
  if (submissionHandled) return; // Prevent multiple notifications

  const input = findInput();
  if (!input || !(input.value?.trim() || input.textContent?.trim())) return;

  submissionHandled = true;
  chrome.runtime.sendMessage({ type: 'PASTE_COMPLETED' });
  
  // Reset after a delay to allow for a new, separate submission.
  setTimeout(() => { submissionHandled = false; }, 5000);
}

// Helper to attempt submission handling after a short delay
function attemptSubmissionHandling() {
  // Only handle if a paste happened recently
  if (Date.now() - lastPasteTime > 5000) return;
  // Use a small delay to ensure the submission event has been processed by the page
  setTimeout(handleSubmission, 50);
}

// Handle Enter key for form submission
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    const input = findInput();
    if (input && (input === document.activeElement || input.contains(document.activeElement))) {
      attemptSubmissionHandling();
    }
  }
}, true);

// Listen for clicks on submit buttons
document.addEventListener('click', (event) => {
  const submitButton = findSubmitButton();
  if (submitButton && (event.target === submitButton || submitButton.contains(event.target))) {
    attemptSubmissionHandling();
  }
}, true);