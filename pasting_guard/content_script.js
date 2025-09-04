console.log("Gemini File/Text Paster script active.");

let isFileReadyToPaste = false;

// Listen for the "arming" message from the popup.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.fileIsReady !== undefined) {
    isFileReadyToPaste = message.fileIsReady;
    console.log(`Custom paste armed: ${isFileReadyToPaste}`);
    sendResponse({ status: "acknowledged" });
  }
});

// Clears the system clipboard by writing an empty string.
function clearClipboard() {
  navigator.clipboard.writeText('').then(() => console.log('Clipboard cleared successfully.'));
}

// Converts a Data URI string into a File object.
async function dataURLtoFile(dataUrl) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mimeType = blob.type || 'application/octet-stream';
    const extension = mimeType.split('/')[1] || 'bin';
    const filename = `pasted_file_${Date.now()}.${extension}`;
    return new File([blob], filename, { type: mimeType });
  } catch (error) {
    console.error("Error converting Data URL to File:", error);
    return null;
  }
}

// Finds the rich text input element in the Gemini interface.
function findGeminiInputElement() {
  return document.querySelector('div[role="textbox"]');
}

// Pastes a FILE into the Gemini input by dispatching a synthetic event.
async function performCustomFilePaste(dataUrl) {
  const file = await dataURLtoFile(dataUrl);
  if (!file) return;

  const targetElement = findGeminiInputElement();
  if (!targetElement) {
    alert("Gemini input box not found.");
    return;
  }
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true, cancelable: true, clipboardData: dataTransfer
  });
  targetElement.dispatchEvent(pasteEvent);
}

// Pastes TEXT into the Gemini input.
function performCustomTextPaste(text) {
  const targetElement = findGeminiInputElement();
  if (!targetElement) {
    alert("Gemini input box not found.");
    return;
  }
  targetElement.focus();
  document.execCommand('insertText', false, text);
}

// Main event listener for the paste command.
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'v') {
    return;
  }

  if (isFileReadyToPaste) {
    console.log("Intercepting paste event for item queue.");
    event.preventDefault();
    event.stopImmediatePropagation();

    chrome.storage.local.get(['itemQueue', 'nextItemIndex', 'lastPastedType'], async (result) => {
      if (!result.itemQueue || result.itemQueue.length === 0) {
        isFileReadyToPaste = false;
        return;
      }

      const currentIndex = result.nextItemIndex || 0;
      if (currentIndex >= result.itemQueue.length) {
        isFileReadyToPaste = false;
        chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
        return;
      }

      const itemToPaste = result.itemQueue[currentIndex];
      const lastPastedType = result.lastPastedType || null; // Null for the very first paste
      const currentItemType = (typeof itemToPaste === 'string' && itemToPaste.startsWith('data:')) ? 'file' : 'text';

      // --- GUARD: Enforce alternating paste order ---
      let isOrderCorrect = false;
      if (currentItemType === 'file' && (lastPastedType === null || lastPastedType === 'text')) {
        // A file can be the first item, or can follow a text item.
        isOrderCorrect = true;
      } else if (currentItemType === 'text' && lastPastedType === 'file') {
        // A text item must follow a file item.
        isOrderCorrect = true;
      }

      if (!isOrderCorrect) {
        const errorMsg = `Paste order violation! Cannot paste a '${currentItemType}' after a '${lastPastedType || 'start'}'. Cancelling sequence.`;
        console.error(errorMsg);
        alert(errorMsg);
        // Abort and clean up on error
        isFileReadyToPaste = false;
        chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
        return;
      }
      // --- END GUARD ---

      // If guard passed, perform the paste.
      if (currentItemType === 'file') {
        await performCustomFilePaste(itemToPaste);
      } else {
        performCustomTextPaste(itemToPaste);
      }
      
      console.log(`Pasted item ${currentIndex + 1} (${currentItemType}) of ${result.itemQueue.length}.`);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= result.itemQueue.length) {
        // This was the last item. Clean up storage, disarm, and clear clipboard.
        console.log("All items from queue pasted. Cleaning up.");
        isFileReadyToPaste = false;
        chrome.storage.local.remove(['itemQueue', 'nextItemIndex', 'lastPastedType']);
        clearClipboard();
      } else {
        // More items remain, update the index and the type of the item we just pasted.
        chrome.storage.local.set({ 
          nextItemIndex: nextIndex,
          lastPastedType: currentItemType 
        });
      }
    });
  }
}, true);