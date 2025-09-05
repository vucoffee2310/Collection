// modules/paste-handler.js: Handles the logic for pasting content into input fields.

/**
 * Pastes a file into the chat input, either by simulating a clipboard event
 * or by directly manipulating a hidden file input element.
 * @param {string} dataUrl - The data URL of the file to paste.
 */
async function pasteFile(dataUrl) {
  const file = await dataURLtoFile(dataUrl);
  const platform = AI_PLATFORMS[window.location.hostname];

  // Case 1: The platform has a dedicated, hidden file input element.
  if (platform?.fileInputSelector) {
    const fileInput = document.querySelector(platform.fileInputSelector);
    if (fileInput) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      // Dispatch a 'change' event to notify the website of the new file.
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      return; // Successfully handled via specific file input
    }
    console.warn(`Specific file input "${platform.fileInputSelector}" not found. Falling back to default paste method.`);
  }

  // Case 2: Default method - paste into the main chat input via clipboard event.
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

/**
 * Pastes text content into the chat input.
 * @param {string} text - The text to paste.
 */
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