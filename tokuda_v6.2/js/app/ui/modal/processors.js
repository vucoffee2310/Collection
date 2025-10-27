/**
 * Processing Logic - Manual input and stats update
 */

import { simulateSSEStream } from '../../core/stream-processor/index.js';
import { updateCards, resetCardGrouping, getGroupsData } from '../cards/index.js';
import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { showResultButtons } from './export-ui.js';
import { getGlobalStats } from '../../utils/json-helpers.js';

export const processManualInput = async (text, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, startBtn, setUpdatedData) => {
  startBtn.disabled = true;
  startBtn.textContent = 'Processing...';
  
  streamDisplay.style.display = 'block';
  statsDisplay.container.style.display = 'block';
  cardsContainer.style.display = 'block';
  
  const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
  cardsWrapper.innerHTML = '';
  resetCardGrouping();
  
  const cachedJSON = await getOrCreateJSON(track);
  if (!cachedJSON) {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Processing';
    return;
  }
  
  const sourceJSON = JSON.parse(JSON.stringify(cachedJSON));
  
  // ✅ Process with incremental card updates (for progress feedback)
  const updatedJSON = await simulateSSEStream(text, sourceJSON, (progress) => {
    updateStats(statsDisplay, progress.stats, sourceJSON);
    updateCards(cardsWrapper, progress.events, sourceJSON);
  });
  
  // ✅ ROOT FIX: Clear and re-render ALL cards from final JSON state
  console.log('🔄 Re-rendering cards from final JSON state...');
  cardsWrapper.innerHTML = '';
  resetCardGrouping();
  
  // Create final events from updated JSON (not from stream events)
  const finalEvents = buildEventsFromJSON(updatedJSON);
  updateCards(cardsWrapper, finalEvents, updatedJSON);
  
  const groupsData = getGroupsData();
  console.log('Groups summary:', groupsData);
  
  const events = updatedJSON.events || [];
  setUpdatedData(updatedJSON, events);
  
  copyToClipboard(formatJSON(updatedJSON));
  
  showResultButtons(exportSection);
  
  startBtn.textContent = 'Done';
  setTimeout(() => {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Processing';
  }, 2000);
};

/**
 * ✅ ROOT FIX: Build events from final JSON state
 * This ensures cards reflect the actual data, not the streaming order
 */
const buildEventsFromJSON = (jsonData) => {
  const events = [];
  
  // Get all instances sorted by position
  const allInstances = [];
  Object.values(jsonData.markers).forEach(instances => {
    instances.forEach(instance => {
      allInstances.push(instance);
    });
  });
  allInstances.sort((a, b) => a.position - b.position);
  
  // Create events based on final status
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

export const updateStats = (statsDisplay, stats, sourceJSON = null) => {
  const { elements } = statsDisplay;
  
  requestAnimationFrame(() => {
    elements.matched.valueEl.textContent = stats.matched;
    elements.merged.valueEl.textContent = stats.merged;
    elements.orphaned.valueEl.textContent = stats.orphaned;
    
    if (sourceJSON && elements.words && elements.language) {
      const globalStats = getGlobalStats(sourceJSON);
      if (globalStats) {
        elements.words.valueEl.textContent = globalStats.totalWords;
        const langNames = { en: 'EN', ja: 'JA', zh: 'ZH', vi: 'VI', th: 'TH', lo: 'LO', km: 'KM' };
        elements.language.valueEl.textContent = langNames[globalStats.primaryLanguage] || globalStats.primaryLanguage.toUpperCase();
      }
    }
  });
};