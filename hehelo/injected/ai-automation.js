(function() {
  'use strict';

  console.log('🤖 Loading AI Studio Automation...');

  // Helper functions
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const element = typeof selector === 'function' ?
        selector() :
        document.querySelector(selector);

      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = typeof selector === 'function' ?
          selector() :
          document.querySelector(selector);

        if (element) {
          observer.disconnect();
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          observer.disconnect();
          reject(new Error('Element not found within timeout'));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  }

  function waitForAttributeChange(element, attribute, expectedValue = null, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      if (expectedValue !== null && element.getAttribute(attribute) === String(expectedValue)) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        if (expectedValue === null) {
          observer.disconnect();
          resolve(element);
        } else if (element.getAttribute(attribute) === String(expectedValue)) {
          observer.disconnect();
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          observer.disconnect();
          reject(new Error('Attribute change timeout'));
        }
      });

      observer.observe(element, {
        attributes: true,
        attributeFilter: [attribute]
      });
    });
  }

  function waitForValueChange(element, expectedValue = null, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      if (expectedValue !== null && element.value === String(expectedValue)) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        if (expectedValue === null || element.value === String(expectedValue)) {
          observer.disconnect();
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(element, {
        attributes: true,
        attributeFilter: ['value']
      });

      const checkInterval = setInterval(() => {
        if (expectedValue === null || element.value === String(expectedValue)) {
          clearInterval(checkInterval);
          observer.disconnect();
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          observer.disconnect();
          resolve(element);
        }
      }, 50);
    });
  }

  function dispatchAllEvents(element, value) {
    element.value = value;

    ['input', 'change', 'blur', 'keyup'].forEach(eventType => {
      element.dispatchEvent(new Event(eventType, {
        bubbles: true,
        cancelable: true
      }));
    });
  }

  async function setSlider(container, value) {
    const rangeInput = container.querySelector('input[type="range"]');
    const numberInput = container.querySelector('input[type="number"].slider-number-input');

    if (rangeInput) {
      rangeInput.focus();
      dispatchAllEvents(rangeInput, value);
    }

    if (numberInput) {
      numberInput.focus();
      dispatchAllEvents(numberInput, value);
      await waitForValueChange(numberInput, value, 2000).catch(() => {});
    }
  }

  async function setToggle(toggleElement, shouldBeOn) {
    const button = toggleElement.querySelector('button[role="switch"]');
    const isOn = button.getAttribute('aria-checked') === 'true';

    if (isOn !== shouldBeOn) {
      button.focus();
      button.click();
      await waitForAttributeChange(button, 'aria-checked', String(shouldBeOn), 2000).catch(() => {});
    }
  }

  async function expandSection(titleText) {
    const headers = Array.from(document.querySelectorAll('.settings-group-header'));
    const header = headers.find(h => h.querySelector('.group-title')?.textContent.trim() === titleText);

    if (header && !header.classList.contains('expanded')) {
      const button = header.querySelector('button');
      button.focus();
      button.click();

      await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (header.classList.contains('expanded')) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(header, {
          attributes: true,
          attributeFilter: ['class']
        });

        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 2000);
      });
    }
  }

  async function sendMessage(text) {
    window.postMessage({
      source: 'ai-automation',
      type: 'action',
      action: 'sending-message',
      message: text,
      timestamp: new Date().toISOString()
    }, '*');

    const textarea = await waitForElement('ms-autosize-textarea textarea.textarea');

    textarea.focus();
    textarea.click();
    textarea.value = '';
    
    // Type character by character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      textarea.value += char;
      
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: char,
        inputType: 'insertText'
      });
      textarea.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new Event('blur', { bubbles: true }));
    
    console.log('⏳ Waiting for send button to be enabled...');
    
    const sendButton = await waitForElement(() => {
      const btn = document.querySelector('ms-run-button button.run-button:not([disabled])');
      return btn;
    }, 10000);
    
    console.log('✅ Send button is ready!');
    
    sendButton.focus();
    await new Promise(resolve => setTimeout(resolve, 200));
    sendButton.click();
    
    window.postMessage({
      source: 'ai-automation',
      type: 'action',
      action: 'message-sent',
      message: text,
      timestamp: new Date().toISOString()
    }, '*');
  }

  async function configureAndSendMessage(messageText = "Hello! Please test these settings.") {
    try {
      console.log('⚙️ Starting configuration...');
      console.time('⏱️ Configuration time');
      
      window.postMessage({
        source: 'ai-automation',
        type: 'start',
        message: 'Configuration started',
        timestamp: new Date().toISOString()
      }, '*');

      // Temperature
      window.postMessage({
        source: 'ai-automation',
        type: 'action',
        action: 'setting-temperature',
        value: 1.5,
        timestamp: new Date().toISOString()
      }, '*');
      
      const tempSlider = await waitForElement('[data-test-id="temperatureSliderContainer"] .ms-slider');
      await setSlider(tempSlider, 1.5);
      console.log('✅ Temperature: 1.5');

      // Thinking budget
      window.postMessage({
        source: 'ai-automation',
        type: 'action',
        action: 'setting-thinking-budget',
        value: 500,
        timestamp: new Date().toISOString()
      }, '*');
      
      const manualBudgetToggle = await waitForElement('[data-test-toggle="manual-budget"]');
      await setToggle(manualBudgetToggle.closest('mat-slide-toggle'), true);

      const budgetInput = await waitForElement(() => {
        const wrapper = document.querySelector('[data-test-id="user-setting-budget-animation-wrapper"]');
        if (wrapper && wrapper.style.opacity !== '0' && wrapper.style.height !== '0px') {
          return wrapper.querySelector('input[type="number"]');
        }
        return null;
      });

      budgetInput.focus();
      dispatchAllEvents(budgetInput, 500);
      await waitForValueChange(budgetInput, 500, 2000).catch(() => {});
      console.log('✅ Thinking budget: 500');

      // Google Search
      window.postMessage({
        source: 'ai-automation',
        type: 'action',
        action: 'setting-google-search',
        value: false,
        timestamp: new Date().toISOString()
      }, '*');
      
      await expandSection('Tools');
      const searchToggle = await waitForElement('.search-as-a-tool-toggle');
      await setToggle(searchToggle, false);
      console.log('✅ Google Search: OFF');

      // Top P
      window.postMessage({
        source: 'ai-automation',
        type: 'action',
        action: 'setting-top-p',
        value: 0.5,
        timestamp: new Date().toISOString()
      }, '*');
      
      await expandSection('Advanced settings');
      const topPItem = await waitForElement(() => {
        const items = Array.from(document.querySelectorAll('.settings-item-column'));
        return items.find(item =>
          item.querySelector('.item-description-title')?.textContent.trim() === 'Top P'
        );
      });

      await setSlider(topPItem.querySelector('.ms-slider'), 0.5);
      console.log('✅ Top P: 0.5');

      console.timeEnd('⏱️ Configuration time');

      // Send message
      console.log('🚀 Sending message...\n');
      await sendMessage(messageText);
      console.log('✅ Message Sent!');
      
      window.postMessage({
        source: 'ai-automation',
        type: 'complete',
        message: 'Configuration and message sent successfully',
        timestamp: new Date().toISOString()
      }, '*');

    } catch (error) {
      console.error('❌ Error:', error);
      
      window.postMessage({
        source: 'ai-automation',
        type: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }, '*');
      
      throw error;
    }
  }

  // Expose API
  window.aiStudioAutomation = {
    run: configureAndSendMessage,
    sendMessage: sendMessage,
    setSlider: setSlider,
    setToggle: setToggle,
    expandSection: expandSection
  };

  console.log('✅ AI Studio Automation loaded');
  console.log('📋 Available: window.aiStudioAutomation.run("your message")');
  
  window.postMessage({
    source: 'ai-automation',
    type: 'ready',
    message: 'AI Studio Automation ready',
    timestamp: new Date().toISOString()
  }, '*');

  // ⭐ AUTO-RUN: Wait for XHR interceptor, then run
  let xhrInterceptorReady = false;
  
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data.source === 'xhr-interceptor' && 
        event.data.type === 'interceptor-ready') {
      xhrInterceptorReady = true;
      console.log('✅ XHR Interceptor confirmed ready');
      
      console.log('⏰ Auto-run scheduled in 2 seconds...');
      setTimeout(() => {
        console.log('🚀 AUTO-RUNNING configuration and test...');
        configureAndSendMessage("Hello! Please test these settings.");
      }, 2000);
    }
  });
  
  // Fallback
  setTimeout(() => {
    if (!xhrInterceptorReady) {
      console.log('⚠️ XHR interceptor ready signal not received, starting anyway...');
      console.log('🚀 AUTO-RUNNING configuration and test...');
      configureAndSendMessage("Hello! Please test these settings.");
    }
  }, 5000);

})();