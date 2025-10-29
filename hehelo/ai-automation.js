(function() {
  'use strict';

  console.log('🤖 Loading AI Studio Automation...');

  // Helper functions
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const element = typeof selector === 'function' 
        ? selector() 
        : document.querySelector(selector);
      
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = typeof selector === 'function' 
          ? selector() 
          : document.querySelector(selector);
        
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
      element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
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
        observer.observe(header, { attributes: true, attributeFilter: ['class'] });
        
        setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 2000);
      });
    }
  }

  function extractTextFromCmark(container) {
    if (!container) return '';
    
    let text = '';
    const blocks = container.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6');
    
    blocks.forEach((block) => {
      let blockText = '';
      
      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          blockText += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'STRONG' || node.tagName === 'EM' || 
              node.tagName === 'CODE' || node.tagName === 'SPAN') {
            Array.from(node.childNodes).forEach(processNode);
          }
        }
      };
      
      Array.from(block.childNodes).forEach(processNode);
      
      blockText = blockText.trim();
      if (blockText) {
        text += blockText + '\n';
      }
    });
    
    return text.trim();
  }

  function countModelTurns() {
    const turns = Array.from(document.querySelectorAll('ms-chat-turn'));
    let count = 0;
    turns.forEach(turn => {
      if (turn.querySelector('.model-prompt-container')) {
        count++;
      }
    });
    return count;
  }

  async function waitForNewModelTurn(initialCount, timeout = 30000) {
    return waitForElement(() => {
      const turns = Array.from(document.querySelectorAll('ms-chat-turn'));
      let currentCount = 0;
      let lastModelTurn = null;
      
      turns.forEach(turn => {
        if (turn.querySelector('.model-prompt-container')) {
          currentCount++;
          lastModelTurn = turn;
        }
      });
      
      if (currentCount > initialCount) {
        return lastModelTurn;
      }
      return null;
    }, timeout);
  }

  async function monitorResponse(initialTurnCount, callbacks = {}) {
    const {
      onThinkingUpdate = (text) => console.log('💭 Thinking:', text.length, 'chars'),
      onAnswerUpdate = (text) => console.log('💬 Answer:', text.length, 'chars'),
      onComplete = (data) => console.log('✅ Complete:', data),
      onError = (error) => console.error('❌ Error:', error)
    } = callbacks;
    
    try {
      const modelTurn = await waitForNewModelTurn(initialTurnCount);
      
      let lastThinkingText = '';
      let lastAnswerText = '';
      let isComplete = false;
      let hasSeenContent = false;
      let lastUpdateTime = Date.now();
      
      const updateContent = () => {
        if (isComplete) return;
        
        try {
          const thinkingBody = modelTurn.querySelector('ms-thought-chunk .mat-expansion-panel-body');
          let currentThinking = '';
          
          if (thinkingBody) {
            const thinkingCmark = thinkingBody.querySelector('ms-text-chunk ms-cmark-node');
            currentThinking = extractTextFromCmark(thinkingCmark);
          }
          
          if (currentThinking && currentThinking !== lastThinkingText) {
            lastThinkingText = currentThinking;
            hasSeenContent = true;
            lastUpdateTime = Date.now();
            onThinkingUpdate(currentThinking);
          }
          
          const turnContent = modelTurn.querySelector('.turn-content');
          let currentAnswer = '';
          
          if (turnContent) {
            const promptChunks = turnContent.querySelectorAll('ms-prompt-chunk.text-chunk');
            
            promptChunks.forEach(chunk => {
              if (chunk.closest('ms-thought-chunk')) {
                return;
              }
              
              const cmarkNode = chunk.querySelector('ms-text-chunk ms-cmark-node');
              const chunkText = extractTextFromCmark(cmarkNode);
              
              if (chunkText) {
                currentAnswer += chunkText + '\n\n';
              }
            });
            
            currentAnswer = currentAnswer.trim();
          }
          
          if (currentAnswer && currentAnswer !== lastAnswerText) {
            lastAnswerText = currentAnswer;
            hasSeenContent = true;
            lastUpdateTime = Date.now();
            onAnswerUpdate(currentAnswer);
          }
          
          if (hasSeenContent) {
            const timeIndicator = modelTurn.querySelector('.turn-footer .model-run-time-pill');
            
            if (timeIndicator) {
              const timeText = timeIndicator.textContent?.trim();
              const isDisabled = timeIndicator.getAttribute('data-disabled') === 'true';
              
              if (timeText && !isDisabled && timeText.match(/[\d.]+s/)) {
                const timeSinceLastUpdate = Date.now() - lastUpdateTime;
                
                if (timeSinceLastUpdate > 500) {
                  isComplete = true;
                  observer.disconnect();
                  
                  onComplete({
                    thinking: lastThinkingText,
                    answer: lastAnswerText,
                    time: timeText
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Error in updateContent:', err);
        }
      };
      
      const observer = new MutationObserver(() => {
        updateContent();
      });
      
      observer.observe(modelTurn, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
      
      updateContent();
      
      setTimeout(() => {
        if (!isComplete) {
          observer.disconnect();
          onComplete({
            thinking: lastThinkingText,
            answer: lastAnswerText,
            time: 'timeout',
            note: 'Monitoring timed out'
          });
        }
      }, 300000);
      
    } catch (error) {
      onError(error);
    }
  }

  async function sendMessage(text) {
    const textarea = await waitForElement('ms-autosize-textarea textarea.textarea');
    
    textarea.focus();
    textarea.value = text;
    
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    const sendButton = await waitForElement(() => {
      const btn = document.querySelector('ms-run-button button.run-button:not([disabled])');
      return btn;
    }, 5000);
    
    sendButton.click();
  }

  async function configureSettingsAndSendWithMonitoring(messageText = "Hello! Please test these settings.") {
    try {
      console.log('⚙️ Starting configuration...');
      console.time('⏱️ Configuration time');
      
      // Temperature
      const tempSlider = await waitForElement('[data-test-id="temperatureSliderContainer"] .ms-slider');
      await setSlider(tempSlider, 1.5);
      console.log('✅ Temperature: 1.5');
      window.postMessage({ source: 'ai-monitor', type: 'log', message: '✅ Temperature: 1.5' }, '*');
      
      // Thinking budget
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
      window.postMessage({ source: 'ai-monitor', type: 'log', message: '✅ Thinking budget: 500' }, '*');
      
      // Google Search
      await expandSection('Tools');
      const searchToggle = await waitForElement('.search-as-a-tool-toggle');
      await setToggle(searchToggle, false);
      console.log('✅ Google Search: OFF');
      window.postMessage({ source: 'ai-monitor', type: 'log', message: '✅ Google Search: OFF' }, '*');
      
      // Top P
      await expandSection('Advanced settings');
      const topPItem = await waitForElement(() => {
        const items = Array.from(document.querySelectorAll('.settings-item-column'));
        return items.find(item => 
          item.querySelector('.item-description-title')?.textContent.trim() === 'Top P'
        );
      });
      
      await setSlider(topPItem.querySelector('.ms-slider'), 0.5);
      console.log('✅ Top P: 0.5');
      window.postMessage({ source: 'ai-monitor', type: 'log', message: '✅ Top P: 0.5' }, '*');
      
      console.timeEnd('⏱️ Configuration time');
      
      // Send message and monitor
      const initialTurnCount = countModelTurns();
      console.log('🚀 Sending message...\n');
      window.postMessage({ source: 'ai-monitor', type: 'log', message: '🚀 Sending message...' }, '*');
      
      const monitorPromise = monitorResponse(initialTurnCount, {
        onThinkingUpdate: (text) => {
          console.log(`💭 DOM Thinking: ${text.length} chars`);
          window.postMessage({ 
            source: 'ai-monitor', 
            type: 'thinking', 
            message: `💭 DOM Thinking: ${text.length} chars`,
            content: text.substring(0, 200)
          }, '*');
        },
        onAnswerUpdate: (text) => {
          console.log(`💬 DOM Answer: ${text.length} chars`);
          window.postMessage({ 
            source: 'ai-monitor', 
            type: 'answer', 
            message: `💬 DOM Answer: ${text.length} chars`,
            content: text.substring(0, 200)
          }, '*');
        },
        onComplete: (data) => {
          console.log('\n' + '='.repeat(60));
          console.log('✅ DOM MONITORING COMPLETE!');
          console.log('='.repeat(60));
          console.log('⏱️  Time:', data.time);
          console.log('\n💭 THINKING (' + data.thinking.length + ' chars):');
          console.log(data.thinking);
          console.log('\n💬 ANSWER (' + data.answer.length + ' chars):');
          console.log(data.answer);
          console.log('='.repeat(60));
          
          window.postMessage({ 
            source: 'ai-monitor', 
            type: 'complete', 
            message: `✅ Complete! Time: ${data.time} | Thinking: ${data.thinking.length} chars | Answer: ${data.answer.length} chars`,
            data: data
          }, '*');
        }
      });
      
      await sendMessage(messageText);
      await monitorPromise;
      
    } catch (error) {
      console.error('❌ Error:', error);
      window.postMessage({ 
        source: 'ai-monitor', 
        type: 'error', 
        message: `❌ Error: ${error.message}`
      }, '*');
      throw error;
    }
  }

  // Expose API
  window.aiStudioMonitor = {
    run: configureSettingsAndSendWithMonitoring,
    sendMessage: sendMessage,
    countTurns: countModelTurns,
    setSlider: setSlider,
    setToggle: setToggle,
    expandSection: expandSection
  };

  console.log('✅ AI Studio Automation loaded');
  console.log('📋 Available: window.aiStudioMonitor.run("your message")');
  
  // Auto-run after 3 seconds
  setTimeout(() => {
    console.log('🚀 Auto-running configuration...');
    configureSettingsAndSendWithMonitoring("Hello! Please test these settings.");
  }, 3000);

})();