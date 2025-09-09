let inspectModeActive = false;
let currentHoverElement = null;
let highlightDiv = null;

// Safety check: Turndown should be loaded by manifest
if (typeof window.TurndownService === 'undefined') {
  console.error('TurndownService not loaded. Make sure turndown.js is included in manifest.');
}

// Create simple highlight overlay
function createHighlight() {
  if (!highlightDiv) {
    highlightDiv = document.createElement('div');
    highlightDiv.style.cssText = `
      position: fixed;
      box-sizing: border-box;
      border: 2px solid #ff6b6b;
      pointer-events: none;
      z-index: 999999;
      background-color: rgba(255, 107, 107, 0.1);
    `;
    document.body.appendChild(highlightDiv);
  }
}

// Remove highlight overlay
function removeHighlight() {
  if (highlightDiv && highlightDiv.parentNode) {
    highlightDiv.parentNode.removeChild(highlightDiv);
    highlightDiv = null;
  }
}

// Update highlight position
function updateHighlight(element) {
  if (!element || !highlightDiv) return;

  const rect = element.getBoundingClientRect();

  highlightDiv.style.left = rect.left + 'px';
  highlightDiv.style.top = rect.top + 'px';
  highlightDiv.style.width = rect.width + 'px';
  highlightDiv.style.height = rect.height + 'px';
}

// Convert HTML to Markdown using local Turndown
function htmlToMarkdown(html) {
  if (!window.TurndownService) {
    throw new Error('Turndown not available');
  }

  const turndownService = new window.TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
  });

  // Optional: Remove script/style tags
  turndownService.addRule('removeScripts', {
    filter: ['script', 'style', 'noscript'],
    replacement: () => ''
  });

  return turndownService.turndown(html);
}

// Handle mouse movement
function handleMouseMove(event) {
  if (!inspectModeActive) return;

  const element = document.elementFromPoint(event.clientX, event.clientY);

  if (element === highlightDiv) return;

  currentHoverElement = element;

  if (element && element !== document.body && element !== document.documentElement) {
    createHighlight();
    updateHighlight(element);
  } else {
    removeHighlight();
  }
}

// Handle LEFT CLICK → convert to Markdown → copy → exit
function handleClick(event) {
  if (!inspectModeActive || !currentHoverElement) return;

  event.preventDefault();
  event.stopPropagation();

  const html = currentHoverElement.outerHTML;

  // Show "processing" feedback
  const processing = document.createElement('div');
  processing.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #ffc107;
    color: #212529;
    padding: 10px 16px;
    border-radius: 4px;
    z-index: 1000001;
    font-family: Arial, sans-serif;
    box-shadow: 0 3px 8px rgba(0,0,0,0.15);
    font-weight: 500;
    white-space: nowrap;
  `;
  processing.textContent = '⏳ Converting to Markdown...';
  document.body.appendChild(processing);

  try {
    // Convert to Markdown (Turndown already loaded via manifest)
    const markdown = htmlToMarkdown(html);

    // Copy to clipboard
    navigator.clipboard.writeText(markdown)
      .then(() => {
        // Replace processing with success
        processing.textContent = '✅ Copied as Markdown!';
        processing.style.backgroundColor = '#4CAF50';
        processing.style.color = 'white';

        setTimeout(() => {
          if (processing.parentNode) {
            document.body.removeChild(processing);
          }
        }, 1500);

        // ✅ EXIT INSPECT MODE
        stopInspectMode();

        // ✅ NOTIFY POPUP
        chrome.runtime.sendMessage({ type: 'inspectModeStopped' });
      })
      .catch(err => {
        throw err;
      });
  } catch (err) {
    console.error('Conversion or copy failed:', err);

    processing.textContent = '❌ Failed to convert';
    processing.style.backgroundColor = '#dc3545';
    processing.style.color = 'white';

    setTimeout(() => {
      if (processing.parentNode) {
        document.body.removeChild(processing);
      }
    }, 2500);
  }

  return false;
}

// Start inspect mode
function startInspectMode() {
  if (inspectModeActive) return;

  inspectModeActive = true;

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);

  document.body.style.cursor = 'crosshair';

  chrome.runtime.sendMessage({ type: 'inspectModeStarted' });
}

// Stop inspect mode
function stopInspectMode() {
  if (!inspectModeActive) return;

  inspectModeActive = false;

  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);

  document.body.style.cursor = '';

  removeHighlight();
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startInspectMode') {
    startInspectMode();
    sendResponse({ success: true });
  } else if (request.action === 'stopInspectMode') {
    stopInspectMode();
    sendResponse({ success: true });
  }

  return true;
});

// Clean up
window.addEventListener('beforeunload', () => {
  if (inspectModeActive) {
    stopInspectMode();
  }
});