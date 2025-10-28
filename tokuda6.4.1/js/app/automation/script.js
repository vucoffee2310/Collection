/**
 * AI Studio Automation Script
 * Injected into aistudio.google.com to automate translation
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
          position: fixed; top: 20px; right: 20px; padding: 8px 12px;
          border-radius: 20px; font-size: 12px; font-weight: bold;
          color: white; z-index: 9999; pointer-events: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: all 0.3s;
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
    
    const extractResponseText = () => {
      const chatTurns = document.querySelectorAll('ms-chat-turn');
      if (chatTurns.length === 0) return '';
      const lastTurn = chatTurns[chatTurns.length - 1];
      const modelContainer = lastTurn.querySelector('[data-turn-role="Model"]');
      if (!modelContainer) return '';
      
      let text = (modelContainer.innerText || modelContainer.textContent || '').trim();
      
      const firstMarkerMatch = text.match(/\([a-z]\)/);
      if (firstMarkerMatch) {
        const markerIndex = text.indexOf(firstMarkerMatch[0]);
        if (markerIndex > 0) {
          const introText = text.substring(0, markerIndex).trim();
          if (introText.length < 200) {
              text = text.substring(markerIndex);
          }
        }
      }
      return text;
    };
  
    const monitorResponse = async (expectedMarkerCount) => {
      console.log(`🔍 Starting response monitoring, expecting ${expectedMarkerCount} markers.`);
      await waitFor('ms-chat-turn:nth-of-type(2)', { retries: 60 });
      
      let previousText = '';
      let unchangedChecks = 0;
      let maxUnchangedChecks = 5;
      
      while (unchangedChecks < maxUnchangedChecks) {
        const currentText = extractResponseText();
        
        if (currentText && currentText !== previousText) {
          const markerCount = (currentText.match(/\([a-z]\)/g) || []).length;
          console.log(`📝 Text updated: ${currentText.length} chars, ${markerCount}/${expectedMarkerCount} markers`);
          
          chrome.runtime.sendMessage({
            action: 'aiStudioUpdate',
            currentText: currentText,
            isComplete: false,
            markerCount: markerCount,
            expectedMarkerCount: expectedMarkerCount
          });
          
          previousText = currentText;
          unchangedChecks = 0;
          
          if (markerCount >= expectedMarkerCount) {
            maxUnchangedChecks = 3;
          }
        } else if (currentText) {
          unchangedChecks++;
        }
        
        await wait(2000);
      }
      
      if (!previousText) throw new Error("No response text found after monitoring");
      
      const finalMarkerCount = (previousText.match(/\([a-z]\)/g) || []).length;
      console.log(`✅ Response complete: ${previousText.length} chars, ${finalMarkerCount} markers`);
      
      chrome.runtime.sendMessage({
        action: 'aiStudioUpdate',
        currentText: previousText,
        isComplete: true,
        markerCount: finalMarkerCount,
        expectedMarkerCount: expectedMarkerCount
      });
    };
  
    const runAutomation = async (promptText, cardName) => {
      try {
        if (cardName) document.title = cardName;
        showBadge('processing');
        const expectedMarkerCount = (promptText.match(/\([a-z]\)/g) || []).length;
        await wait(2000);
        
        const modelSelector = await waitFor("ms-model-selector-v3 button");
        chrome.runtime.sendMessage({ action: "aiStudioStarted" });
        modelSelector.click();
        await wait(1000);
        
        const rows = await waitFor("ms-model-carousel-row", { all: true });
        if (rows.length > 1) {
          rows[1].querySelector("button")?.click();
          await wait(1000);
        }
        
        const sliders = await waitFor(".mat-mdc-slider.mdc-slider input[type='range']", { all: true });
        const setSlider = (slider, value) => {
          if (slider) {
            slider.value = value;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            slider.dispatchEvent(new Event('change', { bubbles: true }));
          }
        };
        if (sliders[0]) { setSlider(sliders[0], 1.5); await wait(500); }
        if (sliders[1]) { setSlider(sliders[1], 300); await wait(500); }
        if (sliders[2]) { setSlider(sliders[2], 0.5); await wait(500); }
        
        const textarea = await waitFor("ms-autosize-textarea textarea");
        textarea.value = promptText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(1000);
        
        const runButton = await waitFor("ms-run-button button");
        runButton.click();
        
        await monitorResponse(expectedMarkerCount);
        showBadge('processed');
      } catch (error) {
        showBadge('not working');
        console.error("❌ Automation failed:", error);
        chrome.runtime.sendMessage({ action: 'aiStudioError', error: error.message });
      }
    };
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'startAutomation') {
        runAutomation(request.promptText, request.cardName)
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }
    });
    
    console.log('✅ AI Studio automation script loaded and ready');
  })();