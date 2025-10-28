// tokuda6.4.4/js/app/automation.js
/**
 * AI Studio Automation - FAST (Sweet Spot) ⚡
 */

(function () {
  'use strict';

  let automationStarted = false;

  // ===== Smart Wait Utilities =====
  
  /**
   * Wait for element using MutationObserver
   */
  const waitForElement = (selector, { all = false, timeout = 10000, parent = document.body } = {}) => {
    return new Promise((resolve, reject) => {
      const check = () => {
        const result = all ? document.querySelectorAll(selector) : document.querySelector(selector);
        if (all ? result.length : result) return result;
        return null;
      };

      const existing = check();
      if (existing) {
        resolve(existing);
        return;
      }

      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for: ${selector}`));
      }, timeout);

      const observer = new MutationObserver(() => {
        const result = check();
        if (result) {
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(result);
        }
      });

      observer.observe(parent, { childList: true, subtree: true });
    });
  };

  /**
   * Minimal wait (only when React needs it)
   */
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Wait for condition with adaptive polling
   */
  const waitForCondition = (conditionFn, { timeout = 10000, interval = 75 } = {}) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (conditionFn()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Condition timeout'));
        } else {
          setTimeout(check, interval);
        }
      };
      
      check();
    });
  };

  // ===== Badge UI =====
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

  // ===== Safe Message Sender =====
  const sendMessage = (msg) => {
    if (!chrome.runtime?.id) return Promise.resolve(false);
    return chrome.runtime.sendMessage(msg).catch(() => false);
  };

  // ===== Response Extraction =====
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

  // ===== Optimized Response Monitor =====
  const monitorResponse = async (expectedMarkerCount) => {
    await waitForElement('ms-chat-turn:nth-of-type(2)', { timeout: 60000 });

    return new Promise((resolve, reject) => {
      let prevText = '';
      let unchangedCount = 0;
      let maxUnchanged = 5;
      let checkInterval = 1000; // Start at 1s (faster than balanced)
      let pollTimer;
      let mutationObserver;

      const checkAndSend = async () => {
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

          // Adaptive interval (faster progression than balanced)
          const progress = markerCount / expectedMarkerCount;
          if (progress >= 0.9) {
            checkInterval = 400;  // Near end: 400ms
            maxUnchanged = 2;
          } else if (progress >= 0.7) {
            checkInterval = 600;  // 70%: 600ms
            maxUnchanged = 3;
          } else if (progress >= 0.4) {
            checkInterval = 800;  // 40%: 800ms
          }
        } else if (text) {
          unchangedCount++;
        }

        // Check completion
        if (unchangedCount >= maxUnchanged && prevText) {
          cleanup();
          
          await sendMessage({
            action: 'aiStudioUpdate',
            currentText: prevText,
            isComplete: true,
            markerCount: (prevText.match(/\([a-z]\)/g) || []).length,
            expectedMarkerCount
          });

          resolve();
          return;
        }

        pollTimer = setTimeout(checkAndSend, checkInterval);
      };

      // MutationObserver for real-time detection
      mutationObserver = new MutationObserver(() => {
        const text = extractResponseText();
        if (text && text !== prevText) {
          unchangedCount = 0;
          // Trigger immediate check on DOM change
          clearTimeout(pollTimer);
          checkAndSend();
        }
      });

      const observeTarget = document.querySelector('ms-chat-turn:last-of-type');
      if (observeTarget) {
        mutationObserver.observe(observeTarget, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }

      const cleanup = () => {
        if (pollTimer) clearTimeout(pollTimer);
        if (mutationObserver) mutationObserver.disconnect();
      };

      checkAndSend();

      setTimeout(() => {
        cleanup();
        if (unchangedCount < maxUnchanged) {
          reject(new Error('Response monitoring timeout (10min)'));
        }
      }, 600000);
    });
  };

  // ===== PARALLEL Slider Configuration =====
  const configureSliders = async () => {
    const sliders = await waitForElement('.mat-mdc-slider.mdc-slider input[type="range"]', { 
      all: true,
      timeout: 5000 
    });

    // Set all sliders at once (no sequential waiting)
    if (sliders[0]) {
      sliders[0].value = 1.5;
      sliders[0].dispatchEvent(new Event('input', { bubbles: true }));
      sliders[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    if (sliders[1]) {
      sliders[1].value = 300;
      sliders[1].dispatchEvent(new Event('input', { bubbles: true }));
      sliders[1].dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    if (sliders[2]) {
      sliders[2].value = 0.5;
      sliders[2].dispatchEvent(new Event('input', { bubbles: true }));
      sliders[2].dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Single wait for all React state updates
    await wait(250);
  };

  // ===== Main Automation (FAST Sweet Spot) =====
  const runAutomation = async (promptText, cardName) => {
    try {
      if (cardName) document.title = cardName;
      showBadge('processing');

      const expectedMarkerCount = (promptText.match(/\([a-z]\)/g) || []).length;

      // Wait for page ready (faster check interval)
      await waitForCondition(() => document.readyState === 'complete', { interval: 50 });
      await wait(600); // Sweet spot: not too fast, not too slow

      // Step 1: Open model selector
      const modelSelector = await waitForElement('ms-model-selector-v3 button');
      await sendMessage({ action: 'aiStudioStarted' });
      modelSelector.click();
      
      await wait(300); // Faster than 400ms, safer than dynamic

      // Step 2: Select model
      const rows = await waitForElement('ms-model-carousel-row', { all: true });
      if (rows.length > 1) {
        rows[1].querySelector('button')?.click();
        await wait(250); // Quick modal close
      }

      // Step 3: Configure sliders in parallel
      await configureSliders();

      // Step 4: Fill textarea
      const textarea = await waitForElement('ms-autosize-textarea textarea');
      textarea.value = promptText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Faster validation check (75ms interval vs 100ms)
      await waitForCondition(() => {
        const btn = document.querySelector('ms-run-button button');
        return btn && !btn.disabled;
      }, { timeout: 5000, interval: 75 });

      await wait(200); // Sweet spot between 150-300ms

      // Step 5: Run
      const runButton = document.querySelector('ms-run-button button');
      runButton.click();

      // Step 6: Monitor with optimized polling
      await monitorResponse(expectedMarkerCount);
      
      showBadge('processed');
    } catch (error) {
      showBadge('error');
      await sendMessage({ action: 'aiStudioError', error: error.message });
    }
  };

  // ===== Message Listener =====
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