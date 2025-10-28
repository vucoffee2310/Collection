/**
 * Group Manager - Group creation and management
 */

// Store all groups
let groups = new Map();

/**
 * Get group number and size for a given card index
 */
export const getGroupInfo = (cardIndex) => {
  if (cardIndex < 3) {
    return { 
      groupNumber: 1, 
      groupSize: 3,
      startIndex: 0,
      endIndex: 2
    };
  } else {
    const adjustedIndex = cardIndex - 3;
    const groupNumber = Math.floor(adjustedIndex / 10) + 2;
    const startIndex = 3 + (groupNumber - 2) * 10;
    const endIndex = Math.min(startIndex + 9, startIndex + (10 - 1));
    return { 
      groupNumber, 
      groupSize: 10,
      startIndex,
      endIndex
    };
  }
};

/**
 * Create a new group container
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
  
  const summary = document.createElement('div');
  summary.className = 'group-summary';
  summary.style.display = 'none';
  
  group.append(header, cardsDiv, summary);
  
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
 * Update group card count display
 */
export const updateGroupCount = (group, count) => {
  const countElement = group.querySelector('.group-count');
  if (countElement) {
    countElement.textContent = `${count} card${count !== 1 ? 's' : ''}`;
  }
};

/**
 * Get group data (for external access)
 */
export const getGroups = () => groups;

/**
 * Clear all groups
 */
export const clearGroups = () => {
  groups.clear();
};