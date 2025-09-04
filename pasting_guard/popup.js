/**
 * Sends a message to the content script on the active tab to "arm" or "disarm"
 * the custom paste functionality.
 * @param {boolean} isReady - True to arm, false to disarm.
 */
async function notifyContentScript(isReady) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { fileIsReady: isReady });
    }
  } catch (error) {
    console.warn("Could not send message to content script.", error);
  }
}

/**
 * Reads a single File object and returns a Promise that resolves with its Data URI.
 * @param {File} file - The file to read.
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// The predefined text string to be pasted after each file.
const POST_FILE_TEXT = "This is the text after Ctrl V file";

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const statusMessage = document.getElementById('status');

  fileInput.addEventListener('change', async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      statusMessage.textContent = 'No files selected.';
      return;
    }

    statusMessage.textContent = `Processing ${files.length} file(s)...`;
    statusMessage.style.color = '#333';

    try {
      const readPromises = Array.from(files).map(readFileAsDataURL);
      const dataUrls = await Promise.all(readPromises);

      // Create the mixed queue: [file1_uri, text, file2_uri, text, ...]
      const mixedQueue = dataUrls.flatMap(url => [url, POST_FILE_TEXT]);

      // Initialize storage for a new sequence.
      const dataToStore = {
        itemQueue: mixedQueue,
        nextItemIndex: 0,
        lastPastedType: null // Reset the sequence guard for the content script.
      };

      chrome.storage.local.set(dataToStore, () => {
        console.log(`${mixedQueue.length} items (files and text) saved to storage.`);
        
        // Arm the content script, telling it a paste sequence is ready.
        notifyContentScript(true);
        
        statusMessage.textContent = `${mixedQueue.length} paste actions ready!`;
        statusMessage.style.color = '#4CAF50';
        
        setTimeout(() => window.close(), 2500);
      });

    } catch (error) {
      statusMessage.textContent = 'Error reading files.';
      statusMessage.style.color = '#F44336';
      console.error('One or more files could not be read:', error);
    }
  });
});