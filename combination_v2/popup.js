// popup.js: Handles file selection, queue setup, and process control.

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const fileInput = document.getElementById('fileInput');
  const uploadControls = document.getElementById('upload-controls');
  const stopButton = document.getElementById('stopButton');
  const stopControls = document.getElementById('stop-controls');
  const statusDiv = document.getElementById('status');
  const instructionText = document.getElementById('instructionText');

  /**
   * Updates the popup's UI based on the current state in chrome.storage.
   */
  const updatePopupState = () => {
    chrome.storage.local.get(['isProcessActive', 'totalItems', 'nextItemIndex'], (result) => {
      const { isProcessActive = false, totalItems = 0, nextItemIndex = 0 } = result;

      if (isProcessActive && totalItems > 0) {
        uploadControls.style.display = 'none';
        stopControls.style.display = 'block';
        instructionText.textContent = 'Pasting process is active.';
        statusDiv.innerHTML = `
          <div style="color: #007bff;">
            Pasting item ${nextItemIndex + 1} of ${totalItems}.
          </div>
          <div style="color: #666; font-size: 11px;">
            Use Ctrl+V in the chat window.
          </div>
        `;
      } else {
        uploadControls.style.display = 'block';
        stopControls.style.display = 'none';
        instructionText.textContent = 'Select files to prepare them for pasting with Ctrl+V.';
        if (!statusDiv.dataset.locked) {
          statusDiv.innerHTML = '';
        }
      }
    });
  };

  /**
   * Handles the file selection event.
   */
  const handleFileSelection = async (event) => {
    const files = event.target.files;
    if (!files?.length) {
      statusDiv.textContent = 'No files selected.';
      return;
    }

    statusDiv.textContent = `Processing ${files.length} file(s)...`;
    
    try {
      // Step 1: Read all files into dataURLs here in the popup. This can take a moment for many files.
      const dataUrls = await Promise.all(Array.from(files).map(readFileAsDataURL));
      // Step 2: Create the mixed queue of strings.
      const mixedQueue = dataUrls.flatMap(url => [url, POST_FILE_TEXT]);

      // Step 3: Send this serializable array of strings to the background script.
      chrome.runtime.sendMessage({ type: 'SETUP_QUEUE', queue: mixedQueue }, (response) => {
        if (!response?.success) {
          statusDiv.textContent = 'Error sending queue to background service.';
          statusDiv.style.color = '#F44336';
          return;
        }
        
        // Step 4: Set the state in storage (without file content).
        chrome.storage.local.set({
          isProcessActive: true,
          totalItems: mixedQueue.length,
          nextItemIndex: 0
        }, () => {
          if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Storage state error. Please try again.';
            statusDiv.style.color = '#F44336';
            return;
          }
          statusDiv.innerHTML = `
            <div style="color: #4CAF50; font-size: 14px; margin-bottom: 5px;">
              ✅ ${mixedQueue.length} paste actions ready!
            </div>
            <div style="color: #666; font-size: 11px;">
              Now use Ctrl+V in the target chat.
            </div>
          `;
          statusDiv.dataset.locked = 'true';
          updatePopupState();
          setTimeout(() => window.close(), 3000);
        });
      });
    } catch (error) {
        statusDiv.textContent = 'Error reading files.';
        statusDiv.style.color = '#F44336';
        console.error('File reading error:', error);
    }
  };

  /**
   * Handles the stop button click event.
   */
  const handleStopClick = () => {
    chrome.storage.local.remove(['isProcessActive', 'totalItems', 'nextItemIndex'], () => {
      chrome.runtime.sendMessage({ type: 'STOP_PROCESS' });
      statusDiv.textContent = 'Pasting process stopped.';
      statusDiv.style.color = '#F44336';
      statusDiv.dataset.locked = 'true';
      updatePopupState();
      setTimeout(() => {
        delete statusDiv.dataset.locked;
        updatePopupState();
      }, 2000);
    });
  };

  // --- Initialize Event Listeners and State ---
  fileInput.addEventListener('change', handleFileSelection);
  stopButton.addEventListener('click', handleStopClick);
  updatePopupState();
});