/**
 * Card Updater - Update cards display
 */

import { createEventCard, resetTotalCardCount, getTotalCardCount } from './card-factory.js';
import { getGroupInfo, createGroupContainer, updateGroupCount, updateGroupStats, getGroups, clearGroups } from './group-manager.js';

let currentGroup = null;
let currentGroupCardCount = 0;

export const updateCards = (cardsWrapper, events, sourceJSON) => {
  if (!events || events.length === 0) return;
  
  const existingCount = cardsWrapper.querySelectorAll('.card-item').length;
  const newEvents = events.slice(existingCount);
  
  newEvents.forEach(event => {
    const card = createEventCard(event, sourceJSON);
    if (card) {
      const totalCardCount = getTotalCardCount();
      const groupInfo = getGroupInfo(totalCardCount - 1); // -1 because createEventCard already incremented
      
      // Check if we need a new group
      if (!currentGroup || 
          (totalCardCount === 4) || // Start group 2 after first 3 cards (totalCardCount is already incremented)
          (totalCardCount > 4 && currentGroupCardCount >= 10)) {
        
        currentGroup = createGroupContainer(groupInfo.groupNumber, groupInfo);
        cardsWrapper.appendChild(currentGroup);
        currentGroupCardCount = 0;
      }
      
      // Add card to current group
      const groupCardsDiv = currentGroup.querySelector('.group-cards');
      groupCardsDiv.appendChild(card);
      
      currentGroupCardCount++;
      
      // Update group count display
      updateGroupCount(currentGroup, currentGroupCardCount);
      updateGroupStats(groupInfo.groupNumber);
    }
  });
  
  cardsWrapper.parentElement.scrollTop = cardsWrapper.parentElement.scrollHeight;
};

export const resetCardGrouping = () => {
  resetTotalCardCount();
  currentGroup = null;
  currentGroupCardCount = 0;
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