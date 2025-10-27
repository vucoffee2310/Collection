/**
 * Tab Handlers - Tab switching and processing logic
 * ✅ FIXED: Shared buildEventsFromJSON + AI error handling + structuredClone
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
 * ✅ Fast deep clone
 */
const deepClone = (obj) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};

export const setupTabSwitching = (tabs, manualTab, aiTab, startBtn) => {
  tabs.querySelector('#manualTabBtn').onclick = () => {
    tabs.querySelector('#manualTabBtn').style.background = '#000';
    tabs.querySelector('#manualTabBtn').style.color = '#fff';
    tabs.querySelector('#aiTabBtn').style.background = 'white';
    tabs.querySelector('#aiTabBtn').style.color = '#000';
    manualTab.style.display = 'block';
    aiTab.style.display = 'none';
    startBtn.style.display = 'inline-block';
  };
  
  tabs.querySelector('#aiTabBtn').onclick = () => {
    tabs.querySelector('#aiTabBtn').style.background = '#000';
    tabs.querySelector('#aiTabBtn').style.color = '#fff';
    tabs.querySelector('#manualTabBtn').style.background = 'white';
    tabs.querySelector('#manualTabBtn').style.color = '#000';
    manualTab.style.display = 'none';
    aiTab.style.display = 'block';
    startBtn.style.display = 'none';
  };
};

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
    
    // Mark modal as processing
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
      
      // ✅ Use fast clone
      const sourceJSON = deepClone(cachedJSON);
      btn.textContent = 'Streaming...';
      
      const processor = new StreamingTranslationProcessor(sourceJSON);
      
      // ✅ AI error handling
      await sendToAI(
        result.content,
        async (chunk) => {
          const result = processor.processChunk(chunk);
          updateStats(statsDisplay, result.stats, sourceJSON);
          updateCards(cardsWrapper, processor.events, sourceJSON);
        },
        (errorMessage, error) => {
          // ✅ Error callback
          streamDisplay.textContent = `❌ ${errorMessage}`;
          streamDisplay.style.color = '#d32f2f';
          btn.textContent = 'Failed - Retry';
          btn.disabled = false;
          console.error('AI Error:', error);
        }
      );
      
      processor.finalize();
      const updatedJSON = processor.getUpdatedJSON();
      
      // ✅ Only re-render if needed
      const hasMergesOrOrphans = processor.stats.merged > 0 || processor.stats.orphaned > 0;
      
      if (hasMergesOrOrphans) {
        console.log('🔄 Re-rendering cards from final JSON state...');
        
        requestAnimationFrame(() => {
          cardsWrapper.innerHTML = '';
          resetCardGrouping();
          
          // ✅ Use shared function
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
      // Unmark processing state
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