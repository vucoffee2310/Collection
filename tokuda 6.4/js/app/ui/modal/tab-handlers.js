/**
 * Tab Handlers - Tab switching and processing logic
 * ✅ COMPLETE with marker count validation
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
 * ✅ Setup Open by Web Tab - FIXED with marker count validation
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
          // ✅ Show marker progress
          let progressText = `Received ${request.currentText.length} chars...`;
          if (request.markerCount !== undefined && request.expectedMarkerCount !== undefined) {
            const percentage = (request.markerCount / request.expectedMarkerCount * 100).toFixed(1);
            progressText = `${request.markerCount}/${request.expectedMarkerCount} markers (${percentage}%) - ${request.currentText.length} chars`;
          }
          
          console.log(`📨 Modal received aiStudioUpdate: ${progressText}`);
          
          if (request.currentText && !request.currentText.match(/\([a-z]\)/)) {
            console.warn('⚠️ Received text without markers, waiting for more...');
            return;
          }
          
          const chunk = request.currentText.substring(request.previousText.length);
          
          if (chunk) {
            try {
              const result = processor.processChunk(chunk);
              updateStats(statsDisplay, result.stats, sourceJSON);
              updateCards(cardsWrapper, processor.events, sourceJSON);
              
              streamDisplay.textContent = progressText + ` (${processor.stats.matched} matched)`;
            } catch (error) {
              console.error('❌ Error processing chunk:', error);
              streamDisplay.textContent = `⚠️ Processing error: ${error.message}`;
              streamDisplay.style.color = '#ff9800';
            }
          }
          
          if (request.isComplete) {
            try {
              // ✅ Check marker count before finalizing
              if (request.markerCount && request.expectedMarkerCount) {
                const completionRate = (request.markerCount / request.expectedMarkerCount * 100).toFixed(1);
                console.log(`📊 Marker completion: ${request.markerCount}/${request.expectedMarkerCount} (${completionRate}%)`);
                
                if (request.markerCount < request.expectedMarkerCount) {
                  const missing = request.expectedMarkerCount - request.markerCount;
                  streamDisplay.textContent = `⚠️ Warning: Missing ${missing} markers (${completionRate}% complete). Proceeding...`;
                  streamDisplay.style.color = '#ff9800';
                  console.warn(`⚠️ Missing ${missing} markers!`);
                }
              }
              
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
              
              // ✅ Show completion summary
              const totalMarkers = sourceJSON.totalMarkers || 0;
              const successRate = totalMarkers > 0 
                ? ((processor.stats.matched + processor.stats.merged) / totalMarkers * 100).toFixed(1)
                : 0;
              
              streamDisplay.textContent = `✅ Complete: ${processor.stats.matched} matched, ${processor.stats.merged} merged, ${processor.stats.orphaned} orphaned (${successRate}% success)`;
              streamDisplay.style.color = '#27ae60';
              
              cleanup();
              
              setTimeout(() => {
                btn.disabled = false;
                btn.textContent = 'Open AI Studio & Process';
              }, 3000);
            } catch (error) {
              console.error('❌ Error finalizing:', error);
              streamDisplay.textContent = `❌ Finalization error: ${error.message}`;
              streamDisplay.style.color = '#d32f2f';
              btn.textContent = 'Error - Retry';
              btn.disabled = false;
              cleanup();
            }
          }
        }
        
        if (request.action === 'aiStudioError') {
          console.log(`❌ Modal received error: ${request.error}`);
          streamDisplay.textContent = `❌ ${request.error}`;
          streamDisplay.style.color = '#d32f2f';
          btn.textContent = 'Error - Retry';
          btn.disabled = false;
          cleanup();
        }
        
        if (request.action === 'aiStudioStarted') {
          console.log('✅ Modal received aiStudioStarted');
          streamDisplay.textContent = 'AI Studio automation started, waiting for response...';
          btn.textContent = 'Processing...';
        }
        
        if (request.action === 'aiStudioClosed') {
          if (btn.textContent.includes('Processing')) {
            console.log('⚠️ Modal received aiStudioClosed');
            streamDisplay.textContent = '⚠️ AI Studio tab was closed';
            streamDisplay.style.color = '#ff9800';
            btn.textContent = 'Tab Closed - Retry';
            btn.disabled = false;
            cleanup();
          }
        }
      };
      
      window.addEventListener('aiStudioMessage', messageHandler);
      
      chrome.runtime.sendMessage({
        action: 'openAIStudio',
        promptText: result.content,
        cardName: `Translation: ${track.languageCode || 'Unknown'}`
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          streamDisplay.textContent = '❌ Failed to communicate with background script';
          streamDisplay.style.color = '#d32f2f';
          btn.textContent = 'Error - Retry';
          btn.disabled = false;
          cleanup();
          return;
        }
        
        if (response?.success) {
          console.log('✅ AI Studio tab opened:', response.tabId);
          streamDisplay.textContent = 'AI Studio tab opened, waiting for automation to start...';
        } else {
          streamDisplay.textContent = '❌ Failed to open AI Studio';
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