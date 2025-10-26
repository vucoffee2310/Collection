/**
 * Group Manager
 * Manages card grouping logic
 */

/**
 * Track card count and groups
 */
let totalCardCount = 0;
let currentGroup = null;
let currentGroupCardCount = 0;
const groups = new Map();

/**
 * Get group number and size for a card index
 * @param {number} cardIndex - Card index (0-based)
 * @returns {Object} - Group info
 */
export const getGroupInfo = (cardIndex) => {
  if (cardIndex < 3) {
    // First 3 cards are group 1
    return {
      groupNumber: 1,
      groupSize: 3,
      startIndex: 0,
      endIndex: 2
    };
  } else {
    // After first 3, every 10 cards is a group
    const adjustedIndex = cardIndex - 3;
    const groupNumber = Math.floor(adjustedIndex / 10) + 2;
    const startIndex = 3 + (groupNumber - 2) * 10;
    const endIndex = Math.min(startIndex + 9, startIndex + 9);
    return {
      groupNumber,
      groupSize: 10,
      startIndex,
      endIndex
    };
  }
};

/**
 * Create group container
 * @param {number} groupNumber - Group number
 * @param {Object} groupInfo - Group information
 * @returns {HTMLElement} - Group container
 */
export const createGroupContainer = (groupNumber, groupInfo) => {
  const group = document.createElement('div');
  group.className = 'card-group';
  group.id = `cardGroup_${groupNumber}`;
  group.dataset.groupNumber = groupNumber;
  group.dataset.startIndex = groupInfo.startIndex;
  group.dataset.endIndex = groupInfo.endIndex;
  
  const header = document.createElement('div');
  header.className = 'group-header';
  
  const toggleIcon = document.createElement('span');
  toggleIcon.className = 'group-toggle-icon';
  toggleIcon.textContent = '▾';
  
  const title = document.createElement('span');
  title.className = 'group-title';
  title.textContent = `Group ${groupNumber}`;
  
  const count = document.createElement('span');
  count.className = 'group-count';
  count.textContent = '0 cards';
  
  const stats = document.createElement('span');
  stats.className = 'group-stats';
  
  header.append(toggleIcon, title, count, stats);
  
  const cardsDiv = document.createElement('div');
  cardsDiv.className = 'group-cards';
  
  group.append(header, cardsDiv);
  
  // Add toggle functionality
  header.style.cursor = 'pointer';
  header.onclick = () => {
    const isCollapsed = cardsDiv.style.display === 'none';
    cardsDiv.style.display = isCollapsed ? 'block' : 'none';
    toggleIcon.textContent = isCollapsed ? '▾' : '▸';
  };
  
  // Store group data
  groups.set(groupNumber, {
    element: group,
    cards: [],
    stats: {
      matched: 0,
      merged: 0,
      orphaned: 0,
      failed: 0
    }
  });
  
  return group;
};

/**
 * Update group statistics
 * @param {number} groupNumber - Group number
 */
export const updateGroupStats = (groupNumber) => {
  const groupData = groups.get(groupNumber);
  if (!groupData) return;
  
  const stats = groupData.stats;
  const statsElement = groupData.element.querySelector('.group-stats');
  
  if (statsElement) {
    const parts = [];
    if (stats.matched > 0) parts.push(`✓ ${stats.matched}`);
    if (stats.merged > 0) parts.push(`⤝ ${stats.merged}`);
    if (stats.orphaned > 0) parts.push(`⚠ ${stats.orphaned}`);
    if (stats.failed > 0) parts.push(`✗ ${stats.failed}`);
    
    statsElement.textContent = parts.length > 0 ? `(${parts.join(', ')})` : '';
  }
};

/**
 * Update group card count
 * @param {HTMLElement} group - Group element
 * @param {number} count - Card count
 */
export const updateGroupCount = (group, count) => {
  const countElement = group.querySelector('.group-count');
  if (countElement) {
    countElement.textContent = `${count} card${count !== 1 ? 's' : ''}`;
  }
};

/**
 * Add card to group
 * @param {HTMLElement} card - Card element
 * @param {Object} event - Event data
 * @param {string} type - Card type
 */
export const addCardToGroup = (card, event, type) => {
  const groupInfo = getGroupInfo(totalCardCount);
  
  // Check if we need a new group
  if (!currentGroup ||
      (totalCardCount === 3) ||
      (totalCardCount > 3 && currentGroupCardCount >= 10)) {
    currentGroup = createGroupContainer(groupInfo.groupNumber, groupInfo);
    currentGroupCardCount = 0;
  }
  
  // Add card to current group
  const groupCardsDiv = currentGroup.querySelector('.group-cards');
  groupCardsDiv.appendChild(card);
  
  currentGroupCardCount++;
  totalCardCount++;
  
  // Update group stats
  const groupData = groups.get(groupInfo.groupNumber);
  if (groupData) {
    groupData.cards.push({ type, event, card });
    groupData.stats[type]++;
    updateGroupStats(groupInfo.groupNumber);
  }
  
  // Update group count display
  updateGroupCount(currentGroup, currentGroupCardCount);
  
  return currentGroup;
};

/**
 * Reset card grouping
 */
export const resetCardGrouping = () => {
  totalCardCount = 0;
  currentGroup = null;
  currentGroupCardCount = 0;
  groups.clear();
};

/**
 * Get all groups data
 * @returns {Array} - Groups data
 */
export const getGroupsData = () => {
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

/**
 * Get current total card count
 * @returns {number} - Total cards
 */
export const getTotalCardCount = () => totalCardCount;