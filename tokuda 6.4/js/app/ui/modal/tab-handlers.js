/**
 * Tab Handlers - Tab switching and processing logic
 * ✅ DEFINITIVE FIX: Modal now manages its own state (`lastProcessedText`) to correctly diff sanitized text streams, fixing the leading orphan bug.
 */

import { StreamingTranslationProcessor } from '../../core/stream-processor/index.js';
import { sendToAI } from '../../utils/api.js';
import { updateCards, resetCardGrouping, getGroupsData } from '../cards/index.js';
import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { showResultButtons } from './export-ui.js';
import { processManualInput, updateStats } from './processors.js';
import { buildEventsFromJSON } from '../../utils/json-helpers.js';

/**
 * Fast deep clone
 */
const deepClone = (obj) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Tab switching for 3 tabs
 */
export const setupTabSwitching = (tabs, manualTab, aiTab, webTab, startBtn) => {
  const manualBtn = tabs.querySelector('#manualTabBtn');
  const aiBtn = tabs.querySelector('#aiTabBtn');
  const webBtn = tabs.querySelector('#webTabBtn');
  
  const activateTab = (activeBtn, activeTab, showStartBtn = true) => {
    [manualBtn, aiBtn, webBtn].forEach(btn => {
      btn.style.background = 'white';
      btn.style.color = '#000';
    });
    [manualTab, aiTab, webTab].forEach(tab => {
      tab.style.display = 'none';
    });
    
    activeBtn.style.background = '#000';
    activeBtn.style.color = '#fff';
    activeTab.style.display = 'block';
    startBtn.style.display = showStartBtn ? 'inline-block' : 'none';
  };
  
  manualBtn.onclick = () => activateTab(manualBtn, manualTab, true);
  aiBtn.onclick = () => activateTab(aiBtn, aiTab, false);
  webBtn.onclick = () => activateTab(webBtn, webTab, false);
};

/**
 * Setup AI Stream Tab
 */
export const setupAITab = (tab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, setUpdatedData) => {
  const btn = tab.querySelector('#aiTabStreamBtn');
  
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Initializing...';
    
    streamDisplay.style.display = 'block';
    statsDisplay.container.style.display = 'block';
    cardsContainer.style.display = 'block';
    
    const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
    cardsWrapper.innerHTML = '';
    resetCardGrouping();
    
    const modal = document.querySelector('#streamModal');
    if (modal?.setProcessing) modal.setProcessing(true);
    
    try {
      const result = await processTrack(track);
      const cachedJSON = await getOrCreateJSON(track);
      
      if (!result || !cachedJSON) {
        alert('Failed to load data');
        btn.disabled = false;
        btn.textContent = 'Send to AI & Process';
        return;
      }
      
      const sourceJSON = deepClone(cachedJSON);
      btn.textContent = 'Streaming...';
      
      const processor = new StreamingTranslationProcessor(sourceJSON);
      
      await sendToAI(
        result.content,
        async (chunk) => {
          const result = processor.processChunk(chunk);
          updateStats(statsDisplay, result.stats, sourceJSON);
          updateCards(cardsWrapper, processor.events, sourceJSON);
        },
        (errorMessage, error) => {
          streamDisplay.textContent = `❌ ${errorMessage}`;
          streamDisplay.style.color = '#d32f2f';
          btn.textContent = 'Failed - Retry';
          btn.disabled = false;
          console.error('AI Error:', error);
        }
      );
      
      processor.finalize();
      const updatedJSON = processor.getUpdatedJSON();
      
      const hasMergesOrOrphans = processor.stats.merged > 0 || processor.stats.orphaned > 0;
      
      if (hasMergesOrOrphans) {
        console.log('🔄 Re-rendering cards from final JSON state...');
        
        requestAnimationFrame(() => {
          cardsWrapper.innerHTML = '';
          resetCardGrouping();
          
          const finalEvents = buildEventsFromJSON(updatedJSON);
          updateCards(cardsWrapper, finalEvents, updatedJSON);
        });
      }
      
      const groupsData = getGroupsData();
      console.log('Groups summary:', groupsData);
      
      setUpdatedData(updatedJSON, processor.events);
      copyToClipboard(formatJSON(updatedJSON));
      showResultButtons(exportSection);
      
      btn.textContent = 'Completed ✓';
      streamDisplay.style.color = '#000';
      
    } catch (error) {
      console.error('Processing error:', error);
      btn.textContent = 'Error - Retry';
      streamDisplay.textContent = `❌ ${error.message}`;
      streamDisplay.style.color = '#d32f2f';
    } finally {
      if (modal?.setProcessing) modal.setProcessing(false);
      
      setTimeout(() => {
        btn.disabled = false;
        if (btn.textContent.includes('Completed') || btn.textContent.includes('Error')) {
          btn.textContent = 'Send to AI & Process';
        }
      }, 3000);
    }
  };
};

/**
 * Setup Open by Web Tab
 */
export const setupWebTab = (tab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, setUpdatedData) => {
  const btn = tab.querySelector('#webTabStreamBtn');
  
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Opening AI Studio...';
    
    streamDisplay.style.display = 'block';
    streamDisplay.style.color = '#000';
    statsDisplay.container.style.display = 'block';
    cardsContainer.style.display = 'block';
    
    const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
    cardsWrapper.innerHTML = '';
    resetCardGrouping();
    
    const modal = document.querySelector('#streamModal');
    if (modal?.setProcessing) modal.setProcessing(true);
    
    // ✅ ROOT FIX: State variable to track sanitized text received by the modal.
    // This must be inside the click handler to reset on each run.
    let lastProcessedText = "";

    let timeoutId = null;
    let messageHandler = null;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (messageHandler) {
        window.removeEventListener('aiStudioMessage', messageHandler);
        messageHandler = null;
      }
      if (modal?.setProcessing) modal.setProcessing(false);
    };
    
    try {
      const result = await processTrack(track);
      const cachedJSON = await getOrCreateJSON(track);
      
      if (!result || !cachedJSON) {
        alert('Failed to load data');
        btn.disabled = false;
        btn.textContent = 'Open AI Studio & Process';
        cleanup();
        return;
      }
      
      const sourceJSON = deepClone(cachedJSON);
      btn.textContent = 'AI Studio opened...';
      streamDisplay.textContent = 'Waiting for AI Studio automation...';
      
      const processor = new StreamingTranslationProcessor(sourceJSON);
      
      timeoutId = setTimeout(() => {
        if (messageHandler) {
          streamDisplay.textContent = '⏱️ Timeout: AI Studio took too long (5 min)';
          streamDisplay.style.color = '#ff9800';
          btn.textContent = 'Timeout - Retry';
          btn.disabled = false;
          cleanup();
        }
      }, 300000); // 5 minutes
      
      messageHandler = (event) => {
        const request = event.detail;
        
        if (request.action === 'aiStudioUpdate') {
          let progressText = `Received ${request.currentText.length} chars...`;
          if (request.markerCount !== undefined && request.expectedMarkerCount !== undefined) {
            const percentage = (request.expectedMarkerCount > 0) ? (request.markerCount / request.expectedMarkerCount * 100).toFixed(1) : 0;
            progressText = `${request.markerCount}/${request.expectedMarkerCount} markers (${percentage}%) - ${request.currentText.length} chars`;
          }
          
          // ✅ ROOT FIX: Calculate chunk based on our own state, not the (now removed) previousText from the message.
          const chunk = request.currentText.substring(lastProcessedText.length);
          
          if (chunk) {
            try {
              const result = processor.processChunk(chunk);
              updateStats(statsDisplay, result.stats, sourceJSON);
              updateCards(cardsWrapper, processor.events, sourceJSON);
              
              streamDisplay.textContent = progressText + ` (${processor.stats.matched} matched)`;
            } catch (error) {
              console.error('❌ Error processing chunk:', error);
            }
          }

          // ✅ ROOT FIX: Update our state with the latest sanitized text.
          lastProcessedText = request.currentText;

          if (request.isComplete) {
            try {
              processor.finalize();
              const updatedJSON = processor.getUpdatedJSON();
              
              if (processor.stats.merged > 0 || processor.stats.orphaned > 0) {
                requestAnimationFrame(() => {
                  cardsWrapper.innerHTML = '';
                  resetCardGrouping();
                  const finalEvents = buildEventsFromJSON(updatedJSON);
                  updateCards(cardsWrapper, finalEvents, updatedJSON);
                });
              }
              
              setUpdatedData(updatedJSON, processor.events);
              copyToClipboard(formatJSON(updatedJSON));
              showResultButtons(exportSection);
              
              btn.textContent = 'Completed ✓';
              
              const totalMarkers = sourceJSON.totalMarkers || 0;
              const successRate = totalMarkers > 0 ? ((processor.stats.matched + processor.stats.merged) / totalMarkers * 100).toFixed(1) : 0;
              streamDisplay.textContent = `✅ Complete: ${processor.stats.matched} matched, ${processor.stats.merged} merged (${successRate}% success)`;
              streamDisplay.style.color = '#27ae60';
              
              cleanup();
              
              setTimeout(() => {
                btn.disabled = false;
                btn.textContent = 'Open AI Studio & Process';
              }, 3000);
            } catch (error) {
              console.error('❌ Error finalizing:', error);
            }
          }
        }
        
        if (request.action === 'aiStudioError' || request.action === 'aiStudioClosed') {
          const isError = request.action === 'aiStudioError';
          streamDisplay.textContent = isError ? `❌ ${request.error}` : '⚠️ AI Studio tab was closed';
          streamDisplay.style.color = isError ? '#d32f2f' : '#ff9800';
          btn.textContent = isError ? 'Error - Retry' : 'Tab Closed - Retry';
          btn.disabled = false;
          cleanup();
        }
        
        if (request.action === 'aiStudioStarted') {
          streamDisplay.textContent = 'AI Studio automation started, waiting for response...';
          btn.textContent = 'Processing...';
        }
      };
      
      window.addEventListener('aiStudioMessage', messageHandler);
      
      chrome.runtime.sendMessage({
        action: 'openAIStudio',
        promptText: result.content,
        cardName: `Translation: ${track.languageCode || 'Unknown'}`
      }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          streamDisplay.textContent = '❌ Failed to open AI Studio tab';
          streamDisplay.style.color = '#d32f2f';
          btn.textContent = 'Error - Retry';
          btn.disabled = false;
          cleanup();
        }
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      btn.textContent = 'Error - Retry';
      streamDisplay.textContent = `❌ ${error.message}`;
      streamDisplay.style.color = '#d32f2f';
      btn.disabled = false;
      cleanup();
    }
  };
};

/**
 * Setup Footer
 */
export const setupFooter = (footer, manualTab, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, setUpdatedData) => {
  const closeBtn = footer.querySelector('#streamModalFooterCloseBtn');
  const startBtn = footer.querySelector('#streamModalStartBtn');
  
  closeBtn.onclick = () => {
    const modal = footer.closest('#streamModal');
    if (modal) modal.remove();
  };
  
  startBtn.onclick = async () => {
    const textarea = manualTab.querySelector('#manualTabTextarea');
    const text = textarea.value.trim();
    if (!text) {
      alert('Please paste translation text');
      return;
    }
    
    await processManualInput(text, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, startBtn, setUpdatedData);
  };
};