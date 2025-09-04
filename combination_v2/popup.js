// popup.js: Handles file selection and queue setup
const POST_FILE_TEXT = "This is the text after Ctrl V file";

// Clear any existing paste state when popup opens
chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType', 'shouldOpenTab']);

document.getElementById('fileInput').addEventListener('change', async (event) => {
  const files = event.target.files;
  const status = document.getElementById('status');
  
  if (!files?.length) {
    status.textContent = 'No files selected.';
    return;
  }

  status.textContent = `Processing ${files.length} file(s)...`;
  
  try {
    // readFileAsDataURL is available globally from modules/utils.js
    const dataUrls = await Promise.all(Array.from(files).map(readFileAsDataURL));
    const mixedQueue = dataUrls.flatMap(url => [url, POST_FILE_TEXT]);

    chrome.storage.local.set({
      itemQueue: mixedQueue,
      nextItemIndex: 0,
      lastPastedType: null,
      shouldOpenTab: false  // Initialize auto-tab flag
    }, () => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Storage error. Please try again.';
        status.style.color = '#F44336';
        return;
      }
      status.innerHTML = `
        <div style="color: #4CAF50; font-size: 14px; margin-bottom: 5px;">
          ✅ ${mixedQueue.length} paste actions ready!
        </div>
        <div style="color: #666; font-size: 11px;">
          Auto-tab opening enabled for AI services
        </div>
      `;
      setTimeout(() => window.close(), 3000);
    });
  } catch (error) {
    status.textContent = 'Error reading files.';
    status.style.color = '#F44336';
    console.error('File reading error:', error);
  }
});