/**
 * Tab Handlers - Tab switching and processing logic
 */

import { StreamingTranslationProcessor } from '../../core/stream-processor/index.js';
import { sendToAI } from '../../utils/api.js';
import { updateCards, resetCardGrouping, getGroupsData } from '../cards/index.js';
import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { showResultButtons } from './export-ui.js';
import { processManualInput, updateStats } from './processors.js';

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
    
    try {
      const result = await processTrack(track);
      const cachedJSON = await getOrCreateJSON(track);
      
      if (!result || !cachedJSON) {
        alert('Failed to load data');
        btn.disabled = false;
        btn.textContent = 'Send to AI & Process';
        return;
      }
      
      const sourceJSON = JSON.parse(JSON.stringify(cachedJSON));
      btn.textContent = 'Streaming...';
      
      const processor = new StreamingTranslationProcessor(sourceJSON);
      
      await sendToAI(result.content, async (chunk) => {
        const result = processor.processChunk(chunk);
        updateStats(statsDisplay, result.stats, sourceJSON);
        updateCards(cardsWrapper, processor.events, sourceJSON);
      });
      
      processor.finalize();
      const updatedJSON = processor.getUpdatedJSON();
      
      // ✅ ROOT FIX: Re-render all cards from final state
      console.log('🔄 Re-rendering cards from final JSON state...');
      cardsWrapper.innerHTML = '';
      resetCardGrouping();
      
      const finalEvents = buildEventsFromJSON(updatedJSON);
      updateCards(cardsWrapper, finalEvents, updatedJSON);
      
      const groupsData = getGroupsData();
      console.log('Groups summary:', groupsData);
      
      setUpdatedData(updatedJSON, processor.events);
      
      copyToClipboard(formatJSON(updatedJSON));
      
      showResultButtons(exportSection);
      
      btn.textContent = 'Completed';
      
    } catch (error) {
      console.error(error);
      btn.textContent = 'Error';
    }
    
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Send to AI & Process';
    }, 3000);
  };
};

/**
 * ✅ ROOT FIX: Build events from final JSON state
 */
const buildEventsFromJSON = (jsonData) => {
  const events = [];
  
  const allInstances = [];
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(instance => {
      allInstances.push(instance);
    });
  });
  allInstances.sort((a, b) => a.position - b.position);
  
  allInstances.forEach(instance => {
    if (instance.status === 'MATCHED') {
      events.push({
        type: 'marker_completed',
        marker: `(${instance.domainIndex.charAt(1)})`,
        position: instance.position,
        matched: true,
        method: instance.matchMethod,
        sourcePosition: instance.position
      });
    } else if (instance.status === 'MERGED') {
      events.push({
        type: 'marker_merged',
        marker: instance.domainIndex,
        position: instance.position,
        mergedInto: instance.mergedInto,
        mergeDirection: instance.mergeDirection,
        reason: instance.mergeDirection === 'ORPHAN_GROUP' ? 'orphan_group_member' : 'backward_merge'
      });
    } else if (instance.status === 'ORPHAN_GROUP') {
      events.push({
        type: 'orphan_group_created',
        marker: instance.domainIndex,
        position: instance.position,
        orphanGroupType: instance.orphanGroupType,
        memberCount: instance.groupMembers?.length || 0
      });
    } else if (instance.status === 'ORPHAN') {
      events.push({
        type: 'marker_orphaned',
        marker: instance.domainIndex,
        position: instance.position,
        reason: 'no_match_found'
      });
    }
  });
  
  return events;
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