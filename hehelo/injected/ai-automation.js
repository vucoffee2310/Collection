(function() {
  'use strict';
  
  // ⭐ FIX: Add a singleton guard to prevent re-execution.
  if (window.aiStudioAutomation) {
    console.warn('⚠️ AI Automation script already loaded. Aborting.');
    return;
  }

  // Helper: Wait for element
  const waitForElement = (selector, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const getElement = typeof selector === 'function' ? selector : () => document.querySelector(selector);
      
      const element = getElement();
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = getElement();
        if (element) {
          observer.disconnect();
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          observer.disconnect();
          reject(new Error('Element timeout'));
        }
      });

      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
  };

  // Helper: Wait for attribute change
  const waitForAttribute = (element, attribute, expectedValue = null, timeout = 300) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      if (expectedValue !== null && element.getAttribute(attribute) === String(expectedValue)) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        if (expectedValue === null || element.getAttribute(attribute) === String(expectedValue) || Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(element, { attributes: true, attributeFilter: [attribute] });
    });
  };

  // Helper: Wait for value change
  const waitForValue = (element, expectedValue, timeout = 500) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      if (element.value === String(expectedValue)) {
        resolve(element);
        return;
      }

      const check = setInterval(() => {
        if (element.value === String(expectedValue) || Date.now() - startTime > timeout) {
          clearInterval(check);
          resolve(element);
        }
      }, 20);
    });
  };

  // Helper: Dispatch events
  const dispatchEvents = (element, value) => {
    element.value = value;
    ['input', 'change', 'blur', 'keyup'].forEach(type => {
      element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    });
  };

  // Helper: Post message
  const postMsg = (type, data = {}) => {
    window.postMessage({ source: 'ai-automation', type, ...data, timestamp: new Date().toISOString() }, '*');
  };

  // Set slider
  const setSlider = async (container, value) => {
    const rangeInput = container.querySelector('input[type="range"]');
    const numberInput = container.querySelector('input[type="number"].slider-number-input');

    if (rangeInput) {
      rangeInput.focus();
      dispatchEvents(rangeInput, value);
    }

    if (numberInput) {
      numberInput.focus();
      dispatchEvents(numberInput, value);
      await waitForValue(numberInput, value).catch(() => {});
    }
  };

  // Set toggle
  const setToggle = async (toggleElement, shouldBeOn) => {
    const button = toggleElement.querySelector('button[role="switch"]');
    const isOn = button.getAttribute('aria-checked') === 'true';

    if (isOn !== shouldBeOn) {
      button.focus();
      button.click();
      await waitForAttribute(button, 'aria-checked', String(shouldBeOn)).catch(() => {});
    }
  };

  // Expand section
  const expandSection = async (titleText) => {
    const headers = Array.from(document.querySelectorAll('.settings-group-header'));
    const header = headers.find(h => h.querySelector('.group-title')?.textContent.trim() === titleText);

    if (header && !header.classList.contains('expanded')) {
      header.querySelector('button').click();
      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (header.classList.contains('expanded')) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(header, { attributes: true, attributeFilter: ['class'] });
        setTimeout(() => { observer.disconnect(); resolve(); }, 300);
      });
    }
  };

  // Send message
  const sendMessage = async (text) => {
    postMsg('action', { action: 'sending-message', message: text });

    const textarea = await waitForElement('ms-autosize-textarea textarea.textarea');
    textarea.focus();
    textarea.click();
    textarea.value = text;
    
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new Event('blur', { bubbles: true }));

    const sendButton = await waitForElement(() => document.querySelector('ms-run-button button.run-button:not([disabled])'), 10000);
    
    sendButton.focus();
    await new Promise(resolve => setTimeout(resolve, 200));
    sendButton.click();
    
    postMsg('action', { action: 'message-sent', message: text });
  };

  // Main configuration function
  const configureAndSendMessage = async (messageText = "Hello! Please test these settings.") => {
    try {
      console.time('⏱️ Config');
      postMsg('start', { message: 'Configuration started' });

      // Temperature
      postMsg('action', { action: 'setting-temperature', value: 1.5 });
      const tempSlider = await waitForElement('[data-test-id="temperatureSliderContainer"] .ms-slider');
      await setSlider(tempSlider, 1.5);
      console.log('✅ Temperature: 1.5');

      // Thinking budget
      postMsg('action', { action: 'setting-thinking-budget', value: 300 });
      const manualBudgetToggle = await waitForElement('[data-test-toggle="manual-budget"]');
      await setToggle(manualBudgetToggle.closest('mat-slide-toggle'), true);
      const budgetInput = await waitForElement(() => {
        const wrapper = document.querySelector('[data-test-id="user-setting-budget-animation-wrapper"]');
        return wrapper?.style.opacity !== '0' && wrapper?.style.height !== '0px' ? wrapper.querySelector('input[type="number"]') : null;
      });
      budgetInput.focus();
      dispatchEvents(budgetInput, 500);
      await waitForValue(budgetInput, 500).catch(() => {});
      console.log('✅ Budget: 500');

      // Google Search
      postMsg('action', { action: 'setting-google-search', value: false });
      await expandSection('Tools');
      const searchToggle = await waitForElement('.search-as-a-tool-toggle');
      await setToggle(searchToggle, false);
      console.log('✅ Search: OFF');

      // Top P
      postMsg('action', { action: 'setting-top-p', value: 0.5 });
      await expandSection('Advanced settings');
      const topPItem = await waitForElement(() => {
        const items = Array.from(document.querySelectorAll('.settings-item-column'));
        return items.find(item => item.querySelector('.item-description-title')?.textContent.trim() === 'Top P');
      });
      await setSlider(topPItem.querySelector('.ms-slider'), 0.5);
      console.log('✅ Top P: 0.5');

      console.timeEnd('⏱️ Config');

      // Send message
      await sendMessage(messageText);
      postMsg('complete', { message: 'Configuration complete' });

    } catch (error) {
      console.error('❌ Error:', error);
      postMsg('error', { message: error.message });
      throw error;
    }
  };

  // Expose API
  window.aiStudioAutomation = {
    run: configureAndSendMessage,
    sendMessage,
    setSlider,
    setToggle,
    expandSection
  };

  // Signal ready
  postMsg('ready', { message: 'AI Studio Automation ready' });

  // Auto-run when XHR ready
  let xhrReady = false;
  let autoRunDone = false;
  
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data.source === 'xhr-interceptor' && event.data.type === 'interceptor-ready') {
      xhrReady = true;
      if (!autoRunDone) {
        autoRunDone = true;
        setTimeout(() => configureAndSendMessage("Hello! Please test these settings."), 100);
      }
    }
  });
  
  // Fallback
  setTimeout(() => {
    if (!autoRunDone) {
      autoRunDone = true;
      configureAndSendMessage("Hello! Please test these settings.");
    }
  }, 3000);

})();