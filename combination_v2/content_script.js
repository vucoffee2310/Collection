// content_script.js: Handles user interaction events for pasting and submission detection.
let isProcessActive = false;
let lastPasteTime = 0;
let submissionHandled = false;

// Initialize and listen for storage changes
chrome.storage.local.get(['isProcessActive'], (result) => {
  isProcessActive = !!result.isProcessActive;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.isProcessActive) {
    isProcessActive = !!changes.isProcessActive.newValue;
  }
});

// Helper function to stop the process and clean up storage
function stopPastingProcess() {
  isProcessActive = false;
  chrome.storage.local.remove(['isProcessActive', 'totalItems', 'nextItemIndex']);
}

// Handle Ctrl+V pasting
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'v' || !isProcessActive) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  chrome.storage.local.get(['totalItems', 'nextItemIndex'], (result) => {
    const { totalItems = 0, nextItemIndex = 0 } = result;
    
    if (nextItemIndex >= totalItems) {
      stopPastingProcess();
      return;
    }

    // Request the content for the current item from the background script
    chrome.runtime.sendMessage({ type: 'GET_ITEM_CONTENT', index: nextItemIndex }, async (response) => {
      if (!response || response.error || !response.data) {
        console.error('Error getting item content from background:', response?.error || 'No response');
        alert('An error occurred. Stopping the paste process.');
        stopPastingProcess();
        return;
      }
      
      const item = response.data;

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
        stopPastingProcess();
        return;
      }

      const newIndex = nextItemIndex + 1;
      if (newIndex >= totalItems) {
        stopPastingProcess(); // All items pasted, clean up
      } else {
        chrome.storage.local.set({ nextItemIndex: newIndex });
      }
    });
  });
}, true);


// --- Submission Detection Logic (Unchanged) ---

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