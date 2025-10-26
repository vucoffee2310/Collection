/**
 * Stream Cards UI - With Grouped Display and Group Property
 */

import { formatCompoundsForDisplay, extractCompounds, removeCompoundMarkers } from '../utils/vietnamese-compounds.js';
import { countWordsConsistent } from '../utils/dom.js';

// Track card count and groups
let totalCardCount = 0;
let currentGroup = null;
let currentGroupCardCount = 0;
let groups = new Map(); // Store all groups

export const createCardsContainer = () => {
  const container = document.createElement('div');
  container.id = 'cardsContainer';
  container.style.display = 'none';
  
  const title = document.createElement('div');
  title.id = 'cardsContainerTitle';
  title.textContent = 'Processing Results';
  
  const cardsWrapper = document.createElement('div');
  cardsWrapper.id = 'cardsWrapper';
  
  container.append(title, cardsWrapper);
  return container;
};

/**
 * Get group number and size for a given card index
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
const createGroupContainer = (groupNumber, groupInfo) => {
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
const updateGroupStats = (groupNumber) => {
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
const updateGroupCount = (group, count) => {
  const countElement = group.querySelector('.group-count');
  if (countElement) {
    countElement.textContent = `${count} card${count !== 1 ? 's' : ''}`;
  }
};

export const createEventCard = (event, sourceJSON) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  // Add card number and group info
  const cardNumber = totalCardCount + 1;
  const groupInfo = getGroupInfo(totalCardCount);
  
  // Store group info in card dataset
  card.dataset.cardNumber = cardNumber;
  card.dataset.group = groupInfo.groupNumber;
  
  // Add group property to event if not already present
  if (!event.group) {
    event.group = groupInfo.groupNumber;
  }
  
  if (event.type === 'marker_merged') {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <span class="card-number">#${cardNumber}</span>
      <span class="card-group-badge">G${groupInfo.groupNumber}</span>
      <span class="card-marker">${event.marker}</span>
      <span class="card-info">Source #${event.position} → ${event.mergedInto}</span>
      <span class="card-status">MERGED</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'card-content';
    content.innerHTML = `
      <div class="content-label">Type</div>
      <div class="content-value">${event.mergeDirection || 'N/A'} merge</div>
      
      <div class="content-label">Reason</div>
      <div class="content-value">${event.reason || 'Marker skipped in translation'}</div>
    `;
    
    card.append(header, content);
    
    // Update group stats
    const groupData = groups.get(groupInfo.groupNumber);
    if (groupData) {
      groupData.stats.merged++;
      groupData.cards.push({ type: 'merged', event, card });
    }
    
  } else if (event.type === 'marker_orphaned') {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <span class="card-number">#${cardNumber}</span>
      <span class="card-group-badge">G${groupInfo.groupNumber}</span>
      <span class="card-marker">${event.marker}</span>
      <span class="card-info">Source #${event.position}</span>
      <span class="card-status">ORPHANED</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'card-content';
    content.innerHTML = `
      <div class="content-label">Status</div>
      <div class="content-value">No preceding match found</div>
      
      <div class="content-label">Reason</div>
      <div class="content-value">${escapeHtml(event.detectedBetween || event.reason || 'Unable to merge')}</div>
    `;
    
    card.append(header, content);
    
    // Update group stats
    const groupData = groups.get(groupInfo.groupNumber);
    if (groupData) {
      groupData.stats.orphaned++;
      groupData.cards.push({ type: 'orphaned', event, card });
    }
    
  } else if (event.matched) {
    const instance = findInstance(sourceJSON, event.sourcePosition);
    
    // BUILD COMPLETE ORIGINAL TEXT (merged + matched)
    let originalText = '';
    const forwardMerged = instance?.mergedOrphans?.filter(o => o.mergeDirection === 'FORWARD') || [];
    const backwardMerged = instance?.mergedOrphans?.filter(o => o.mergeDirection === 'BACKWARD') || [];
    
    // Add forward merged content
    if (forwardMerged.length > 0) {
      originalText += forwardMerged.map(o => o.content).join(' ') + ' ';
    }
    
    // Add matched content
    originalText += (instance?.content || '');
    
    // Add backward merged content
    if (backwardMerged.length > 0) {
      originalText += ' ' + backwardMerged.map(o => o.content).join(' ');
    }
    
    originalText = originalText.trim();
    
    // Use compound version if available
    const translationText = instance?.overallTranslationWithCompounds || instance?.overallTranslation || '';
    const translationPlain = instance?.overallTranslation || '';
    
    // Count compounds in translation
    const compounds = extractCompounds(translationText);
    const compoundCount = compounds.filter(c => c.isCompound).length;
    
    const utterances = instance?.utterances || [];
    const utteranceCount = utterances.length;
    
    const cardId = `streamCard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const header = document.createElement('div');
    header.className = 'card-header';
    
    // Add merge indicators to header
    let headerInfo = `Trans #${event.position} → Source #${event.sourcePosition}`;
    if (forwardMerged.length > 0 || backwardMerged.length > 0) {
      const mergeInfo = [];
      if (forwardMerged.length > 0) mergeInfo.push(`↑${forwardMerged.length}`);
      if (backwardMerged.length > 0) mergeInfo.push(`↓${backwardMerged.length}`);
      headerInfo += ` [${mergeInfo.join(' ')}]`;
    }
    
    header.innerHTML = `
      <span class="card-number">#${cardNumber}</span>
      <span class="card-group-badge">G${groupInfo.groupNumber}</span>
      <span class="card-marker">${event.marker}</span>
      <span class="card-info">${headerInfo}</span>
      <span class="card-status">${event.method}</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'card-content';
    
    if (originalText) {
      content.innerHTML += `
        <div class="content-label">Original</div>
        <div class="content-value">${escapeHtml(originalText)}</div>
      `;
    }
    
    if (translationText) {
      // Show compound info if any
      if (compoundCount > 0) {
        content.innerHTML += `
          <div class="compound-info">
            ✨ ${compoundCount} compound word${compoundCount > 1 ? 's' : ''} detected and merged
          </div>
        `;
      }
      
      content.innerHTML += `
        <div class="content-label">Translation ${compoundCount > 0 ? '(with compounds highlighted)' : ''}</div>
        <div class="content-value">${formatCompoundsForDisplay(translationText)}</div>
      `;
    }
    
    card.append(header, content);
    
    if (utteranceCount > 0) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'utterances-toggle';
      toggleBtn.id = `${cardId}_toggleBtn`;
      toggleBtn.textContent = `▸ ${utteranceCount} utterances`;
      
      const utterancesDiv = document.createElement('div');
      utterancesDiv.id = `${cardId}_utterances`;
      utterancesDiv.style.display = 'none';
      utterancesDiv.className = 'utterances-container';
      
      const title = document.createElement('div');
      title.className = 'utterances-title';
      title.textContent = `${utteranceCount} utterances`;
      utterancesDiv.appendChild(title);
      
      // CRITICAL: Calculate total translation words using consistent counting
      const totalTranslationWords = utterances.reduce((sum, utt) => {
        return sum + countWordsConsistent(utt.elementTranslation || '', 'vi');
      }, 0);
      
      utterances.forEach((utt, idx) => {
        const item = createUtteranceItem(utt, idx, instance, utterances, totalTranslationWords);
        utterancesDiv.appendChild(item);
      });
      
      card.append(toggleBtn, utterancesDiv);
      
      setTimeout(() => {
        toggleBtn.onclick = () => {
          if (utterancesDiv.style.display === 'none') {
            utterancesDiv.style.display = 'block';
            toggleBtn.textContent = `▾ ${utteranceCount} utterances`;
          } else {
            utterancesDiv.style.display = 'none';
            toggleBtn.textContent = `▸ ${utteranceCount} utterances`;
          }
        };
      }, 0);
    }
    
    // Update group stats
    const groupData = groups.get(groupInfo.groupNumber);
    if (groupData) {
      groupData.stats.matched++;
      groupData.cards.push({ type: 'matched', event, card });
    }
    
  } else {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <span class="card-number">#${cardNumber}</span>
      <span class="card-group-badge">G${groupInfo.groupNumber}</span>
      <span class="card-marker">${event.marker}</span>
      <span class="card-info">Translation #${event.position}</span>
      <span class="card-status">FAILED</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'card-content';
    content.innerHTML = `
      <div class="content-label">Reason</div>
      <div class="content-value">${escapeHtml(event.reason || 'No match found')}</div>
    `;
    
    card.append(header, content);
    
    // Update group stats
    const groupData = groups.get(groupInfo.groupNumber);
    if (groupData) {
      groupData.stats.failed++;
      groupData.cards.push({ type: 'failed', event, card });
    }
  }
  
  return card;
};

export const updateCards = (cardsWrapper, events, sourceJSON) => {
  if (!events || events.length === 0) return;
  
  const existingCount = cardsWrapper.querySelectorAll('.card-item').length;
  const newEvents = events.slice(existingCount);
  
  newEvents.forEach(event => {
    const card = createEventCard(event, sourceJSON);
    if (card) {
      // Determine which group this card belongs to
      const groupInfo = getGroupInfo(totalCardCount);
      
      // Check if we need a new group
      if (!currentGroup || 
          (totalCardCount === 3) || // Start group 2 after first 3 cards
          (totalCardCount > 3 && currentGroupCardCount >= 10)) { // New group every 10 cards after first group
        
        currentGroup = createGroupContainer(groupInfo.groupNumber, groupInfo);
        cardsWrapper.appendChild(currentGroup);
        currentGroupCardCount = 0;
      }
      
      // Add card to current group
      const groupCardsDiv = currentGroup.querySelector('.group-cards');
      groupCardsDiv.appendChild(card);
      
      currentGroupCardCount++;
      totalCardCount++;
      
      // Update group count display
      updateGroupCount(currentGroup, currentGroupCardCount);
      updateGroupStats(groupInfo.groupNumber);
    }
  });
  
  cardsWrapper.parentElement.scrollTop = cardsWrapper.parentElement.scrollHeight;
};

/**
 * Reset card grouping (call this when starting a new processing session)
 */
export const resetCardGrouping = () => {
  totalCardCount = 0;
  currentGroup = null;
  currentGroupCardCount = 0;
  groups.clear();
};

/**
 * Get all groups data
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

// Helpers
const createUtteranceItem = (utt, idx, instance, allUtterances, totalTranslationWords) => {
  const item = document.createElement('div');
  item.className = 'utterance-item';
  
  // CRITICAL: Calculate translation words using consistent counting
  const translationText = utt.elementTranslation || '';
  const translationWords = countWordsConsistent(translationText, 'vi');
  const percentage = totalTranslationWords > 0 ? ((translationWords / totalTranslationWords) * 100).toFixed(1) : 0;
  
  // Calculate original words ratio
  const totalOriginalWords = allUtterances.reduce((sum, u) => sum + (u.wordLength || 0), 0);
  const originalPercentage = totalOriginalWords > 0 ? ((utt.wordLength / totalOriginalWords) * 100).toFixed(1) : 0;
  
  // Check if this utterance is from a merged source
  const isMerged = !!utt.mergedSource;
  let mergedInfo = '';
  
  if (isMerged) {
    const orphan = instance?.mergedOrphans?.find(o => o.domainIndex === utt.mergedSource);
    if (orphan) {
      const direction = orphan.mergeDirection === 'FORWARD' ? '⬆' : '⬇';
      mergedInfo = `<span style="background: #ffe0b2; padding: 2px 5px; border-radius: 2px; font-size: 9px; font-weight: bold; margin-left: 6px;">${direction} ${utt.mergedSource}</span>`;
    }
  }
  
  const meta = document.createElement('div');
  meta.className = 'utterance-meta';
  meta.style.cssText = 'font-size: 10px; color: #333; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;';
  
  meta.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center;">
      <span class="utterance-index" style="font-weight: bold; color: #000;">Seg #${idx + 1}</span>
      <span class="utterance-timestamp" style="font-family: monospace; color: #666;">⏱ ${utt.timestamp || 'N/A'}</span>
      ${mergedInfo}
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
      <span style="background: #e3f2fd; padding: 2px 6px; border-radius: 2px; font-size: 9px; font-weight: bold;">
        Src: ${utt.wordLength || 0}w (${originalPercentage}%)
      </span>
      <span style="background: #e8f5e9; padding: 2px 6px; border-radius: 2px; font-size: 9px; font-weight: bold;">
        Trans: ${translationWords}w (${percentage}%)
      </span>
    </div>
  `;
  
  // Add ratio visualization bar
  const ratioBar = document.createElement('div');
  ratioBar.style.cssText = 'margin-bottom: 8px;';
  ratioBar.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px;">
      <div style="font-size: 8px; color: #666; width: 60px;">Original:</div>
      <div style="flex: 1; background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
        <div style="width: ${originalPercentage}%; height: 100%; background: #2196F3;"></div>
      </div>
      <div style="font-size: 8px; color: #666; width: 40px; text-align: right;">${originalPercentage}%</div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <div style="font-size: 8px; color: #666; width: 60px;">Translation:</div>
      <div style="flex: 1; background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
        <div style="width: ${percentage}%; height: 100%; background: #4CAF50;"></div>
      </div>
      <div style="font-size: 8px; color: #666; width: 40px; text-align: right;">${percentage}%</div>
    </div>
  `;
  
  const originalDiv = document.createElement('div');
  originalDiv.className = 'utterance-text';
  originalDiv.innerHTML = `
    <div class="utterance-label">Original (${utt.wordLength || 0} words)</div>
    <div>${escapeHtml(utt.utterance || '')}</div>
  `;
  
  item.append(meta, ratioBar, originalDiv);
  
  if (utt.elementTranslation && utt.elementTranslation.trim()) {
    const translationDiv = document.createElement('div');
    translationDiv.className = 'utterance-text';
    translationDiv.innerHTML = `
      <div class="utterance-label">Translation (${translationWords} words)</div>
      <div>${formatCompoundsForDisplay(utt.elementTranslation)}</div>
    `;
    item.appendChild(translationDiv);
  }
  
  return item;
};

const findInstance = (json, position) => {
  if (!json.markers) return null;
  for (const instances of Object.values(json.markers)) {
    const found = instances.find(inst => inst.position === position);
    if (found) return found;
  }
  return null;
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};