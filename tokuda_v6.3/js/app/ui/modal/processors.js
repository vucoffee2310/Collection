/**
 * Processing Logic - Manual input and stats update
 * ✅ OPTIMIZED: Only re-render if data actually changed + Throttled stats
 */

import { simulateSSEStream } from '../../core/stream-processor/index.js';
import { updateCards, resetCardGrouping, getGroupsData } from '../cards/index.js';
import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { showResultButtons } from './export-ui.js';
import { getGlobalStats } from '../../utils/json-helpers.js';

// ✅ NEW: Throttle tracking
let lastStatsUpdate = 0;
const STATS_UPDATE_INTERVAL = 50; // 50ms = max 20 updates/sec

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
  
  // ✅ NEW: Track if we need to re-render
  let needsRerender = false;
  
  // Process with incremental card updates
  const updatedJSON = await simulateSSEStream(text, sourceJSON, (progress) => {
    updateStats(statsDisplay, progress.stats, sourceJSON);
    updateCards(cardsWrapper, progress.events, sourceJSON);
    
    // Check if there were any merges/orphans (indicates final state might differ)
    if (progress.stats.merged > 0 || progress.stats.orphaned > 0) {
      needsRerender = true;
    }
  });
  
  // ✅ OPTIMIZED: Only re-render if there were merges/orphans
  if (needsRerender) {
    console.log('🔄 Re-rendering cards from final JSON state (merges detected)...');
    
    // Use requestAnimationFrame to batch the update
    requestAnimationFrame(() => {
      cardsWrapper.innerHTML = '';
      resetCardGrouping();
      
      const finalEvents = buildEventsFromJSON(updatedJSON);
      updateCards(cardsWrapper, finalEvents, updatedJSON);
    });
  }
  
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
 * ✅ Build events from final JSON state
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

/**
 * ✅ UPDATED: Throttled stats update (max 20 updates/sec)
 */
export const updateStats = (statsDisplay, stats, sourceJSON = null) => {
  const now = Date.now();
  
  // ✅ NEW: Skip update if called too frequently
  if (now - lastStatsUpdate < STATS_UPDATE_INTERVAL) {
    return;
  }
  
  lastStatsUpdate = now;
  
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