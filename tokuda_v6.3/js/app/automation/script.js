
/**
 * AI Studio Automation Script
 * Injected into aistudio.google.com to automate prompt submission
 * ✅ Sends ONLY deltas (incremental new text)
 */

export function automationScript(promptText, cardName) {
  'use strict';
  
  const wait = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
  
  const waitFor = async (selector, { all = false, retries = 10 } = {}) => {
    for (let i = 0; i < retries; i++) {
      const result = all ? document.querySelectorAll(selector) : document.querySelector(selector);
      if (all ? result.length : result) return result;
      await wait();
    }
    throw new Error(`Element(s) not found: ${selector}`);
  };
  
  const safeClick = (element, description = 'element') => {
    if (!element) {
      console.warn(`⚠️ Cannot click ${description}: element is null`);
      return false;
    }
    
    if (element._clicked) {
      console.log(`⏭️ Skipping ${description}: already clicked`);
      return false;
    }
    
    console.log(`🖱️ Clicking ${description}`);
    element.click();
    element._clicked = true;
    return true;
  };
  
  const report = (text, done, isError = false) => {
    console.log('📤 SENDING UPDATE:', {
      action: "updateDashboard",
      textLength: text.length,
      isComplete: done,
      isError: isError
    });
    
    chrome.runtime.sendMessage({
      action: "updateDashboard",
      responseText: isError ? `[AUTOMATION ERROR] ${text}` : text,
      isComplete: done,
      isError: isError,
      timestamp: new Date().toLocaleString()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('📤 Message send error:', chrome.runtime.lastError);
      } else {
        console.log('📤 Message sent, response:', response);
      }
    });
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
   * Extract complete markers from text
   * Returns the position up to which we can safely send
   */
  const extractCompleteMarkers = (text) => {
    const markerPattern = /\([a-z]\)/g;
    const markers = [];
    let match;
    
    // Find all markers
    while ((match = markerPattern.exec(text)) !== null) {
      markers.push({
        letter: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    if (markers.length === 0) return 0;
    
    // Find last complete marker
    for (let i = markers.length - 1; i >= 0; i--) {
      const marker = markers[i];
      const nextMarker = markers[i + 1];
      
      if (nextMarker) {
        // Has next marker, so this one is complete
        return marker.end;
      } else {
        // Last marker - check if has enough content after it
        const contentAfter = text.substring(marker.end).trim();
        
        // Consider complete if has at least 30 chars
        if (contentAfter.length >= 30) {
          return text.length;
        }
        
        // Not enough content, return previous marker's end if exists
        if (i > 0) {
          return markers[i - 1].end;
        }
        
        // Only one marker and not enough content - buffer it
        return 0;
      }
    }
    
    return 0;
  };
  
  /**
   * Monitor response with DELTA sending
   */
  const monitorResponse = async () => {
    console.log('👀 Monitoring response...');
    
    // Wait for response to appear
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      const chatTurns = document.querySelectorAll("ms-chat-turn");
      console.log(`🔍 Found ${chatTurns.length} chat turns (attempt ${attempts + 1}/${maxAttempts})`);
      
      if (chatTurns.length >= 3) {
        console.log('✅ Response elements found');
        break;
      }
      
      await wait(500);
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error("Response elements not found after 30 seconds");
    }
    
    console.log('📝 Starting response monitoring with DELTA mode...');
    
    let lastSentPosition = 0; // Track character position sent
    let unchangedChecks = 0;
    const maxUnchangedChecks = 5;
    let updateCount = 0;
    
    while (unchangedChecks < maxUnchangedChecks) {
      const chatTurns = document.querySelectorAll("ms-chat-turn");
      const lastTurn = Array.from(chatTurns).pop();
      const responseElement = lastTurn?.querySelector('[data-turn-role="Model"]');
      
      if (!responseElement) {
        console.warn('⚠️ Response element not found in last chat turn');
        await wait(1000);
        unchangedChecks++;
        continue;
      }
      
      const fullText = responseElement.innerText.trim() || '';
      
      // Find safe position to send (complete markers only)
      const safeCutPosition = extractCompleteMarkers(fullText);
      
      if (safeCutPosition > lastSentPosition) {
        // Extract ONLY the delta (new text)
        const delta = fullText.substring(lastSentPosition, safeCutPosition);
        
        unchangedChecks = 0;
        updateCount++;
        
        console.log(`📊 DELTA #${updateCount}:`);
        console.log(`   Full text: ${fullText.length} chars`);
        console.log(`   Last sent: ${lastSentPosition}`);
        console.log(`   Safe cut: ${safeCutPosition}`);
        console.log(`   Delta: ${delta.length} chars`);
        console.log(`   Buffered: ${fullText.length - safeCutPosition} chars`);
        console.log(`   Preview: "${delta.substring(0, 80)}..."`);
        
        // Send ONLY the delta
        report(delta, false);
        
        // Update tracking
        lastSentPosition = safeCutPosition;
      } else {
        unchangedChecks++;
        console.log(`⏸️ Buffering (${unchangedChecks}/${maxUnchangedChecks})`);
        console.log(`   Full: ${fullText.length} chars`);
        console.log(`   Sent: ${lastSentPosition} chars`);
        console.log(`   Buffered: ${fullText.length - lastSentPosition} chars`);
      }
      
      await wait(1000);
    }
    
    // Send final buffered text
    const chatTurns = document.querySelectorAll("ms-chat-turn");
    const lastTurn = Array.from(chatTurns).pop();
    const responseElement = lastTurn?.querySelector('[data-turn-role="Model"]');
    const finalText = responseElement?.innerText.trim() || '';
    
    if (finalText.length > lastSentPosition) {
      const finalDelta = finalText.substring(lastSentPosition);
      console.log(`📊 FINAL DELTA: ${finalDelta.length} chars`);
      console.log(`   Total updates sent: ${updateCount + 1}`);
      report(finalDelta, true);
    } else {
      console.log(`✅ Response complete (${updateCount} updates sent, no final buffer)`);
      report('', true);
    }
  };

  // Main execution
  (async () => {
    console.log('🚀 Starting automation script...');
    
    if (cardName) {
      document.title = cardName;
    }
    
    showBadge('processing');
    
    try {
      console.log('🔍 Finding model selector...');
      const modelSelector = await waitFor("ms-model-selector-v3 button");
      chrome.runtime.sendMessage({ action: "startPlaying" });
      safeClick(modelSelector, 'model selector');
      await wait(800);
      
      console.log('🔍 Finding model options...');
      const rows = await waitFor("ms-model-carousel-row", { all: true });
      if (rows.length > 1) {
        const modelButton = rows[1].querySelector("button");
        safeClick(modelButton, 'model option (Flash 2.0)');
        await wait(800);
      }
      
      console.log('🔍 Finding sliders...');
      const sliders = await waitFor(".mat-mdc-slider.mdc-slider input[type='range']", { all: true });
      
      const setSliderValue = (slider, value, name) => {
        if (slider && !slider._configured) {
          console.log(`🎚️ Setting ${name} to ${value}`);
          slider.value = value;
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider._configured = true;
        }
      };
      
      setSliderValue(sliders[0], 1.5, 'Temperature');
      await wait(300);
      setSliderValue(sliders[1], 300, 'Thinking');
      await wait(300);
      setSliderValue(sliders[2], 0.4, 'Top-P');
      await wait(300);
      
      console.log('🔍 Finding textarea...');
      const textarea = await waitFor("ms-autosize-textarea textarea");
      if (!textarea._filled) {
        console.log('✏️ Setting prompt text...');
        textarea.value = promptText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea._filled = true;
      }
      await wait(500);
      
      console.log('🔍 Finding run button...');
      const runButton = await waitFor("ms-run-button button");
      safeClick(runButton, 'run button');
      
      await monitorResponse();
      
      showBadge('processed');
      console.log('🎉 Automation completed successfully!');
      
    } catch (error) {
      showBadge('not working');
      console.error("❌ Automation failed:", error);
      report(error.message, true, true);
    }
  })();
}