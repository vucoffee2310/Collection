/**
 * Tab Handlers - Tab switching and processing logic
 * ✅ Receives deltas from AI Studio automation
 */

import { StreamingTranslationProcessor } from '../../core/stream-processor/index.js';
import { sendToAI } from '../../utils/api.js';
import { updateCards, resetCardGrouping, getGroupsData } from '../cards/index.js';
import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { showResultButtons } from './export-ui.js';
import { processManualInput, updateStats } from './processors.js';
import { buildEventsFromJSON } from '../../utils/json-helpers.js';
import { getVideoId } from '../../utils/dom.js';

const deepClone = (obj) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Setup Tab Switching
 */
export const setupTabSwitching = (tabs, manualTab, aiTab, webTab, startBtn) => {
  tabs.querySelector('#manualTabBtn').onclick = () => {
    tabs.querySelector('#manualTabBtn').style.background = '#000';
    tabs.querySelector('#manualTabBtn').style.color = '#fff';
    tabs.querySelector('#aiTabBtn').style.background = 'white';
    tabs.querySelector('#aiTabBtn').style.color = '#000';
    tabs.querySelector('#webTabBtn').style.background = 'white';
    tabs.querySelector('#webTabBtn').style.color = '#000';
    manualTab.style.display = 'block';
    aiTab.style.display = 'none';
    webTab.style.display = 'none';
    startBtn.style.display = 'inline-block';
  };
  
  tabs.querySelector('#aiTabBtn').onclick = () => {
    tabs.querySelector('#aiTabBtn').style.background = '#000';
    tabs.querySelector('#aiTabBtn').style.color = '#fff';
    tabs.querySelector('#manualTabBtn').style.background = 'white';
    tabs.querySelector('#manualTabBtn').style.color = '#000';
    tabs.querySelector('#webTabBtn').style.background = 'white';
    tabs.querySelector('#webTabBtn').style.color = '#000';
    manualTab.style.display = 'none';
    aiTab.style.display = 'block';
    webTab.style.display = 'none';
    startBtn.style.display = 'none';
  };
  
  tabs.querySelector('#webTabBtn').onclick = () => {
    tabs.querySelector('#webTabBtn').style.background = '#000';
    tabs.querySelector('#webTabBtn').style.color = '#fff';
    tabs.querySelector('#manualTabBtn').style.background = 'white';
    tabs.querySelector('#manualTabBtn').style.color = '#000';
    tabs.querySelector('#aiTabBtn').style.background = 'white';
    tabs.querySelector('#aiTabBtn').style.color = '#000';
    manualTab.style.display = 'none';
    aiTab.style.display = 'none';
    webTab.style.display = 'block';
    startBtn.style.display = 'none';
  };
};

/**
 * Setup AI Tab
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
 * Setup Web Tab - Receives DELTA updates from AI Studio
 */
export const setupWebTab = (tab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, setUpdatedData) => {
  const btn = tab.querySelector('#webTabOpenBtn');
  const checkBtn = tab.querySelector('#webTabCheckBtn');
  const statusDiv = tab.querySelector('#webTabStatus');
  const statusText = tab.querySelector('#webTabStatusText');
  
  let aiStudioUpdateListener = null;
  let processor = null;
  let sourceJSON = null;
  let aiStudioTabId = null;
  
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Opening...';
    
    statusDiv.style.display = 'block';
    statusText.textContent = 'Preparing data...';
    statusText.style.color = '#000';
    
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
        throw new Error('Failed to load data');
      }
      
      sourceJSON = deepClone(cachedJSON);
      processor = new StreamingTranslationProcessor(sourceJSON);
      
      statusText.textContent = 'Opening AI Studio tab...';
      
      const videoId = getVideoId();
      
      chrome.runtime.sendMessage({
        action: 'openAIStudio',
        promptText: result.content,
        cardName: `YouTube Translation - ${videoId}`
      }, (response) => {
        if (response?.success) {
          aiStudioTabId = response.tabId;
          statusText.textContent = `AI Studio opened (Tab ID: ${response.tabId})\nWaiting for response...`;
          btn.textContent = 'Streaming...';
          checkBtn.style.display = 'inline-block';
        } else {
          throw new Error('Failed to open AI Studio');
        }
      });
      
      // ✅ Listen for DELTA updates from AI Studio
      aiStudioUpdateListener = (event) => {
        const { responseText, isComplete, isError } = event.detail;
        
        console.log('🎧 MODAL received:', {
          deltaLength: responseText?.length,
          isComplete: isComplete,
          isError: isError
        });
        
        if (isError) {
          console.error('❌ Error received:', responseText);
          statusText.style.color = '#d32f2f';
          statusText.textContent = responseText;
          streamDisplay.textContent = responseText;
          streamDisplay.style.color = '#d32f2f';
          btn.textContent = 'Error - Retry';
          btn.disabled = false;
          if (modal?.setProcessing) modal.setProcessing(false);
          return;
        }
        
        if (!isComplete) {
          // ✅ responseText is already a DELTA from AI Studio
          console.log(`🎧 Processing delta: ${responseText.length} chars`);
          
          // Update display
          const preview = responseText.substring(0, 200);
          streamDisplay.textContent = `Delta: ${preview}${responseText.length > 200 ? '...' : ''}`;
          statusText.textContent = `Processing chunk (${responseText.length} chars)...`;
          
          if (processor && responseText.length > 0) {
            try {
              // ✅ Direct pass-through - responseText is already a delta
              const result = processor.processChunk(responseText);
              updateStats(statsDisplay, result.stats, sourceJSON);
              updateCards(cardsWrapper, processor.events, sourceJSON);
              
              console.log(`🎧 Processed: ${result.newMarkers?.length || 0} new markers`);
              console.log(`🎧 Total completed: ${processor.completedMarkers.length} markers`);
            } catch (err) {
              console.error('❌ Error processing chunk:', err);
            }
          }
        } else {
          console.log('🎧 Response complete!');
          
          // ✅ Process final delta if any
          if (processor && responseText.length > 0) {
            console.log(`🎧 Processing final delta: ${responseText.length} chars`);
            try {
              const result = processor.processChunk(responseText);
              updateStats(statsDisplay, result.stats, sourceJSON);
              updateCards(cardsWrapper, processor.events, sourceJSON);
            } catch (err) {
              console.error('❌ Error processing final chunk:', err);
            }
          }
          
          statusText.textContent = 'Processing complete! Finalizing...';
          streamDisplay.textContent = 'Complete!';
          
          finalizeWebProcessing(processor, sourceJSON, cardsWrapper, statsDisplay, exportSection, setUpdatedData, btn, statusText, modal);
          checkBtn.style.display = 'none';
        }
      };
      
      console.log('🎧 Adding event listener for aiStudioUpdate');
      window.addEventListener('aiStudioUpdate', aiStudioUpdateListener);
      
    } catch (error) {
      console.error('Web automation error:', error);
      statusText.style.color = '#d32f2f';
      statusText.textContent = `Error: ${error.message}`;
      streamDisplay.textContent = `❌ ${error.message}`;
      streamDisplay.style.color = '#d32f2f';
      btn.textContent = 'Error - Retry';
      btn.disabled = false;
      if (modal?.setProcessing) modal.setProcessing(false);
    }
  };
  
  checkBtn.onclick = () => {
    if (aiStudioTabId) {
      chrome.tabs.get(aiStudioTabId, (tab) => {
        if (chrome.runtime.lastError) {
          statusText.textContent = `Tab closed or not found: ${chrome.runtime.lastError.message}`;
        } else {
          statusText.textContent = `Tab active: ${tab.url}\nTitle: ${tab.title}`;
        }
      });
    } else {
      statusText.textContent = 'No AI Studio tab ID stored';
    }
  };
  
  const modal = document.querySelector('#streamModal');
  if (modal) {
    const originalRemove = modal.remove.bind(modal);
    modal.remove = () => {
      if (aiStudioUpdateListener) {
        window.removeEventListener('aiStudioUpdate', aiStudioUpdateListener);
      }
      originalRemove();
    };
  }
};

/**
 * Finalize Web Processing
 */
const finalizeWebProcessing = (processor, sourceJSON, cardsWrapper, statsDisplay, exportSection, setUpdatedData, btn, statusText, modal) => {
  try {
    if (!processor) {
      throw new Error('Processor not initialized');
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
    
    statusText.style.color = '#27ae60';
    statusText.textContent = '✅ Processing complete! JSON copied to clipboard.';
    btn.textContent = 'Completed ✓';
    
  } catch (error) {
    console.error('Finalization error:', error);
    statusText.style.color = '#d32f2f';
    statusText.textContent = `Finalization error: ${error.message}`;
    btn.textContent = 'Error - Retry';
  } finally {
    if (modal?.setProcessing) modal.setProcessing(false);
    
    setTimeout(() => {
      btn.disabled = false;
      if (btn.textContent.includes('Completed') || btn.textContent.includes('Error')) {
        btn.textContent = 'Open AI Studio';
      }
    }, 3000);
  }
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