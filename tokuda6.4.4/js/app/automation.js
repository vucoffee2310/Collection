// tokuda6.4.4/js/app/automation.js
/**
 * AI Studio Automation - LEAN BUT SAFE
 */

(function () {
  'use strict';

  let automationStarted = false; // Prevent duplicates

  const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitFor = async (selector, { all = false, retries = 20, interval = 500 } = {}) => {
    for (let i = 0; i < retries; i++) {
      const result = all ? document.querySelectorAll(selector) : document.querySelector(selector);
      if (all ? result.length : result) return result;
      await wait(interval);
    }
    throw new Error(`Element not found: ${selector}`);
  };

  const showBadge = (status) => {
    let badge = document.getElementById('automation-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'automation-badge';
      badge.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 8px 12px;
        border-radius: 20px; font-size: 12px; font-weight: bold;
        color: white; z-index: 9999; pointer-events: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(badge);
    }

    const colors = { processing: '#3498db', processed: '#27ae60', error: '#e74c3c' };
    const texts = { processing: 'Processing...', processed: 'Done ✅', error: 'Error ❌' };
    badge.textContent = texts[status] || texts.error;
    badge.style.backgroundColor = colors[status] || colors.error;
  };

  // Safe message sender (checks extension context)
  const sendMessage = (msg) => {
    if (!chrome.runtime?.id) return Promise.resolve(false);
    return chrome.runtime.sendMessage(msg).catch(() => false);
  };

  const extractResponseText = () => {
    const chatTurns = document.querySelectorAll('ms-chat-turn');
    if (!chatTurns.length) return '';

    const lastTurn = chatTurns[chatTurns.length - 1];
    const modelContainer = lastTurn.querySelector('[data-turn-role="Model"]');
    if (!modelContainer) return '';

    let text = (modelContainer.innerText || '').trim();
    const firstMarker = text.match(/\([a-z]\)/);
    if (firstMarker) {
      const idx = text.indexOf(firstMarker[0]);
      if (idx > 0 && text.substring(0, idx).length < 200) {
        text = text.substring(idx);
      }
    }
    return text;
  };

  const monitorResponse = async (expectedMarkerCount) => {
    await waitFor('ms-chat-turn:nth-of-type(2)', { retries: 60 });

    let prevText = '';
    let unchangedCount = 0;
    let maxUnchanged = 5;

    while (unchangedCount < maxUnchanged) {
      const text = extractResponseText();

      if (text && text !== prevText) {
        const markerCount = (text.match(/\([a-z]\)/g) || []).length;
        
        await sendMessage({
          action: 'aiStudioUpdate',
          currentText: text,
          isComplete: false,
          markerCount,
          expectedMarkerCount
        });

        prevText = text;
        unchangedCount = 0;

        if (markerCount >= expectedMarkerCount) maxUnchanged = 3;
      } else if (text) {
        unchangedCount++;
      }

      await wait(2000);
    }

    if (!prevText) throw new Error('No response found');

    await sendMessage({
      action: 'aiStudioUpdate',
      currentText: prevText,
      isComplete: true,
      markerCount: (prevText.match(/\([a-z]\)/g) || []).length,
      expectedMarkerCount
    });
  };

  const setSlider = (slider, value) => {
    if (slider) {
      slider.value = value;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const runAutomation = async (promptText, cardName) => {
    try {
      if (cardName) document.title = cardName;
      showBadge('processing');

      const expectedMarkerCount = (promptText.match(/\([a-z]\)/g) || []).length;
      await wait(2000);

      const modelSelector = await waitFor('ms-model-selector-v3 button');
      await sendMessage({ action: 'aiStudioStarted' });
      modelSelector.click();
      await wait(1000);

      const rows = await waitFor('ms-model-carousel-row', { all: true });
      if (rows.length > 1) {
        rows[1].querySelector('button')?.click();
        await wait(1000);
      }

      const sliders = await waitFor('.mat-mdc-slider.mdc-slider input[type="range"]', { all: true });
      if (sliders[0]) setSlider(sliders[0], 1.5);
      await wait(500);
      if (sliders[1]) setSlider(sliders[1], 300);
      await wait(500);
      if (sliders[2]) setSlider(sliders[2], 0.5);
      await wait(500);

      const textarea = await waitFor('ms-autosize-textarea textarea');
      textarea.value = promptText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(1000);

      const runButton = await waitFor('ms-run-button button');
      runButton.click();

      await monitorResponse(expectedMarkerCount);
      showBadge('processed');
    } catch (error) {
      showBadge('error');
      await sendMessage({ action: 'aiStudioError', error: error.message });
    }
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startAutomation') {
      if (automationStarted) {
        sendResponse({ success: false, error: 'Already running' });
        return false;
      }
      automationStarted = true;
      runAutomation(request.promptText, request.cardName);
      sendResponse({ success: true });
    }
    return false;
  });
})();
