/**
 * Card Updater - Update cards display
 * ✅ OPTIMIZED: Track count in memory instead of DOM queries
 */

import { createEventCard, resetTotalCardCount, getTotalCardCount } from './card-factory.js';
import { getGroupInfo, createGroupContainer, updateGroupCount, updateGroupStats, getGroups, clearGroups } from './group-manager.js';

let currentGroup = null;
let currentGroupCardCount = 0;
let totalRenderedCards = 0; // ✅ Track in memory

export const updateCards = (cardsWrapper, events, sourceJSON) => {
  if (!events || events.length === 0) return;
  
  // ✅ Use memory counter instead of DOM query
  const existingCount = totalRenderedCards;
  const newEvents = events.slice(existingCount);
  
  if (newEvents.length === 0) return;
  
  // ✅ Batch DOM operations
  const fragment = document.createDocumentFragment();
  let pendingGroup = currentGroup;
  let batchStats = new Map(); // Batch stat updates
  
  newEvents.forEach(event => {
    const card = createEventCard(event, sourceJSON);
    if (!card) return;
    
    const totalCardCount = getTotalCardCount();
    const groupInfo = getGroupInfo(totalCardCount - 1);
    
    // Check if we need a new group
    if (!pendingGroup || 
        (totalCardCount === 4) || 
        (totalCardCount > 4 && currentGroupCardCount >= 10)) {
      
      // Add previous group to fragment
      if (pendingGroup && !cardsWrapper.contains(pendingGroup)) {
        fragment.appendChild(pendingGroup);
      }
      
      pendingGroup = createGroupContainer(groupInfo.groupNumber, groupInfo);
      currentGroup = pendingGroup;
      currentGroupCardCount = 0;
    }
    
    // Add card to pending group
    const groupCardsDiv = pendingGroup.querySelector('.group-cards');
    groupCardsDiv.appendChild(card);
    
    currentGroupCardCount++;
    totalRenderedCards++; // ✅ Increment counter
    
    // ✅ Batch stat updates
    if (!batchStats.has(groupInfo.groupNumber)) {
      batchStats.set(groupInfo.groupNumber, currentGroupCardCount);
    } else {
      batchStats.set(groupInfo.groupNumber, batchStats.get(groupInfo.groupNumber) + 1);
    }
  });
  
  // Add final pending group
  if (pendingGroup && !cardsWrapper.contains(pendingGroup)) {
    fragment.appendChild(pendingGroup);
  }
  
  // ✅ Single DOM write
  if (fragment.hasChildNodes()) {
    cardsWrapper.appendChild(fragment);
  }
  
  // ✅ Batch update group counts
  requestAnimationFrame(() => {
    batchStats.forEach((count, groupNum) => {
      const groupEl = cardsWrapper.querySelector(`[data-group-number="${groupNum}"]`);
      if (groupEl) {
        updateGroupCount(groupEl, count);
        updateGroupStats(groupNum);
      }
    });
    
    // Debounced scroll
    const container = cardsWrapper.parentElement;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isNearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  });
};

export const resetCardGrouping = () => {
  resetTotalCardCount();
  currentGroup = null;
  currentGroupCardCount = 0;
  totalRenderedCards = 0; // ✅ Reset counter
  clearGroups();
};

export const getGroupsData = () => {
  const groups = getGroups();
  const groupsArray = [];
  
  groups.forEach((data, number) => {
    groupsArray.push({
      number,
      cardCount: data.cards.length,
      stats: data.stats,
      cards: data.cards.map(c => c.event)
    });
  });
  
  return groupsArray;
};