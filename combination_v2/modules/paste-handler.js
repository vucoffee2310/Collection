// modules/paste-handler.js: Handles the logic for pasting content into input fields.

/**
 * Pastes a file into the chat input by simulating a clipboard event.
 * @param {string} dataUrl - The data URL of the file to paste.
 */
async function pasteFile(dataUrl) {
  const file = await dataURLtoFile(dataUrl);
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