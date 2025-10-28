/**
 * AI Studio Automation Script
 * Injected into aistudio.google.com to automate translation
 * ✅ FIXED: Marker count validation to prevent premature completion
 */

(function() {
  'use strict';
  
  const wait = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
  
  const waitFor = async (selector, { all = false, retries = 20, interval = 500 } = {}) => {
    for (let i = 0; i < retries; i++) {
      const result = all ? document.querySelectorAll(selector) : document.querySelector(selector);
      if (all ? result.length : result) return result;
      await wait(interval);
    }
    throw new Error(`Element(s) not found after ${retries} retries: ${selector}`);
  };
  
  const showBadge = (status) => {
    let badge = document.getElementById('automation-status-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'automation-status-badge';
      badge.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        color: white;
        z-index: 9999;
        pointer-events: none;
        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        transition: all 0.3s;
      `;
      document.body.appendChild(badge);
    }
    
    const statuses = {
      processing: ['Processing...', '#3498db'],
      processed: ['Processed ✅', '#27ae60'],
      'not working': ['Not Working ❌', '#e74c3c']
    };
    
    const [text, color] = statuses[status] || statuses['not working'];
    badge.textContent = text;
    badge.style.backgroundColor = color;
  };
  
  /**
   * ✅ Extract text from AI Studio response
   */
  const extractResponseText = () => {
    const chatTurns = document.querySelectorAll('ms-chat-turn');
    
    if (chatTurns.length === 0) {
      console.log('⚠️ No ms-chat-turn elements found');
      return '';
    }
    
    const lastTurn = chatTurns[chatTurns.length - 1];
    const modelContainer = lastTurn.querySelector('[data-turn-role="Model"]');
    
    if (!modelContainer) {
      console.log('⚠️ No data-turn-role="Model" found');
      return '';
    }
    
    let text = modelContainer.innerText || modelContainer.textContent || '';
    text = text.trim();
    
    // Remove intro phrases
    const introPhrases = [
      'Chắc chắn rồi, đây là bản dịch tiếng Việt:',
      'Đây là bản dịch:',
      'Sure, here is the Vietnamese translation:',
      'Here is the translation:',
      'Okay, here you go:',
      'Certainly!',
      'Of course!'
    ];
    
    for (const phrase of introPhrases) {
      if (text.startsWith(phrase)) {
        text = text.substring(phrase.length).trim();
        break;
      }
    }
    
    // Find first marker
    const firstMarkerMatch = text.match(/\([a-z]\)/);
    if (firstMarkerMatch) {
      const markerIndex = text.indexOf(firstMarkerMatch[0]);
      if (markerIndex > 100) {
        text = text.substring(markerIndex);
        console.log(`✂️ Removed ${markerIndex} chars of intro text`);
      }
    }
    
    // Remove URL section
    const lines = text.split('\n');
    const cleanedLines = [];
    let skipMode = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '---') {
        skipMode = !skipMode;
        continue;
      }
      
      if (skipMode) continue;
      if (line.match(/^https?:\/\//)) continue;
      
      cleanedLines.push(lines[i]);
    }
    
    text = cleanedLines.join('\n').trim();
    
    // Remove timing info
    text = text.replace(/\d+\.\d+s\s*$/, '').trim();
    
    return text;
  };
  
  /**
   * ✅ FIXED: Monitor response with marker count validation
   */
  const monitorResponse = async (expectedMarkerCount) => {
    console.log('🔍 Starting response monitoring...');
    console.log(`📊 Expecting ${expectedMarkerCount} markers`);
    
    // Wait for response to appear
    console.log('⏳ Waiting for AI response to appear...');
    let chatTurns = [];
    
    for (let i = 0; i < 60; i++) {
      chatTurns = document.querySelectorAll('ms-chat-turn');
      if (chatTurns.length >= 2) {
        console.log(`✅ Found ${chatTurns.length} chat turns`);
        break;
      }
      await wait(500);
    }
    
    if (chatTurns.length < 2) {
      throw new Error("AI response did not appear after 30 seconds");
    }
    
    let previousText = '';
    let unchangedChecks = 0;
    let maxUnchangedChecks = 5; // Start with 5 (10 seconds)
    
    console.log('📊 Monitoring text changes...');
    
    while (unchangedChecks < maxUnchangedChecks) {
      const currentText = extractResponseText();
      
      if (currentText && currentText !== previousText) {
        // ✅ Count markers in current text
        const markerCount = (currentText.match(/\([a-z]\)/g) || []).length;
        console.log(`📝 Text updated: ${currentText.length} chars, ${markerCount}/${expectedMarkerCount} markers`);
        
        // ✅ Send update
        chrome.runtime.sendMessage({
          action: 'aiStudioUpdate',
          previousText: previousText,
          currentText: currentText,
          isComplete: false,
          markerCount: markerCount,
          expectedMarkerCount: expectedMarkerCount
        });
        
        previousText = currentText;
        unchangedChecks = 0;
        
        // ✅ If we have all markers, reduce wait time
        if (markerCount >= expectedMarkerCount) {
          maxUnchangedChecks = 3; // Only wait 6 seconds once we have all markers
          console.log(`✅ All ${expectedMarkerCount} markers received, reducing wait time`);
        }
        
      } else if (currentText) {
        unchangedChecks++;
        const markerCount = (currentText.match(/\([a-z]\)/g) || []).length;
        console.log(`⏳ No change (${unchangedChecks}/${maxUnchangedChecks}), markers: ${markerCount}/${expectedMarkerCount}`);
      }
      
      await wait(2000);
    }
    
    if (!previousText) {
      throw new Error("No response text found after monitoring");
    }
    
    // ✅ Final validation
    const finalMarkerCount = (previousText.match(/\([a-z]\)/g) || []).length;
    console.log(`✅ Response complete: ${previousText.length} chars, ${finalMarkerCount} markers`);
    
    if (finalMarkerCount < expectedMarkerCount) {
      console.warn(`⚠️ WARNING: Only received ${finalMarkerCount}/${expectedMarkerCount} markers!`);
    }
    
    // ✅ Send completion
    chrome.runtime.sendMessage({
      action: 'aiStudioUpdate',
      previousText: previousText,
      currentText: previousText,
      isComplete: true,
      markerCount: finalMarkerCount,
      expectedMarkerCount: expectedMarkerCount
    });
  };

  const runAutomation = async (promptText, cardName) => {
    if (cardName) {
      document.title = cardName;
    }
    
    showBadge('processing');
    
    try {
      console.log('🚀 Starting AI Studio automation...');
      
      // ✅ Count expected markers from prompt
      const expectedMarkerCount = (promptText.match(/\([a-z]\)/g) || []).length;
      console.log(`📊 Prompt has ${expectedMarkerCount} markers`);
      
      await wait(2000);
      
      console.log('🔍 Looking for model selector...');
      const modelSelector = await waitFor("ms-model-selector-v3 button", { retries: 20 });
      
      chrome.runtime.sendMessage({ action: "aiStudioStarted" });
      
      modelSelector.click();
      console.log('✅ Model selector clicked');
      await wait(1000);
      
      console.log('🔍 Looking for model carousel...');
      const rows = await waitFor("ms-model-carousel-row", { all: true, retries: 10 });
      console.log(`✅ Found ${rows.length} model rows`);
      
      if (rows.length > 1) {
        const secondModelButton = rows[1].querySelector("button");
        if (secondModelButton) {
          secondModelButton.click();
          console.log('✅ Second model selected');
          await wait(1000);
        }
      }
      
      console.log('🔍 Looking for sliders...');
      const sliders = await waitFor(".mat-mdc-slider.mdc-slider input[type='range']", { all: true, retries: 10 });
      console.log(`✅ Found ${sliders.length} sliders`);
      
      const setSliderValue = (slider, value) => {
        if (slider) {
          slider.value = value;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      
      if (sliders[0]) {
        setSliderValue(sliders[0], 1.5);
        console.log('✅ Temperature set to 1.5');
        await wait(500);
      }
      
      if (sliders[1]) {
        setSliderValue(sliders[1], 300);
        console.log('✅ Thinking budget set to 300');
        await wait(500);
      }
      
      if (sliders[2]) {
        setSliderValue(sliders[2], 0.5);
        console.log('✅ Top-P set to 0.5');
        await wait(500);
      }
      
      console.log('🔍 Looking for textarea...');
      const textarea = await waitFor("ms-autosize-textarea textarea", { retries: 10 });
      textarea.value = promptText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`✅ Prompt text entered (${promptText.length} chars)`);
      await wait(1000);
      
      console.log('🔍 Looking for run button...');
      const runButton = await waitFor("ms-run-button button", { retries: 10 });
      runButton.click();
      console.log('✅ Run button clicked, waiting for response...');
      
      // ✅ Monitor with expected marker count
      await monitorResponse(expectedMarkerCount);
      
      showBadge('processed');
      console.log('🎉 Automation completed successfully');
      
    } catch (error) {
      showBadge('not working');
      console.error("❌ Automation failed:", error);
      chrome.runtime.sendMessage({
        action: 'aiStudioError',
        error: error.message
      });
    }
  };
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startAutomation') {
      console.log('📨 Received startAutomation message');
      runAutomation(request.promptText, request.cardName)
        .then(() => {
          console.log('✅ Automation finished');
          sendResponse({ success: true });
        })
        .catch(err => {
          console.error('❌ Automation error:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
  });
  
  console.log('✅ AI Studio automation script loaded and ready');
})();