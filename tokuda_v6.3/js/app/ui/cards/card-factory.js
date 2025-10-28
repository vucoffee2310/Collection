/**
 * Card Factory - Create event cards and utterance items
 */

import { getGroupInfo, updateGroupStats, getGroups } from './group-manager.js';
import { formatCompoundsForDisplay } from '../../utils/compounds/index.js';
import { countWordsConsistent } from '../../utils/text/index.js';
import { formatSRTTime, escapeHtml } from '../../utils/helpers.js';
import { findInstance, getCardDisplayData, getUtteranceDisplayData } from '../../utils/json-helpers.js';

let totalCardCount = 0;

export const createEventCard = (event, sourceJSON) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  const cardNumber = totalCardCount + 1;
  const groupInfo = getGroupInfo(totalCardCount);
  
  card.dataset.cardNumber = cardNumber;
  card.dataset.group = groupInfo.groupNumber;
  
  if (!event.group) {
    event.group = groupInfo.groupNumber;
  }
  
  if (event.type === 'orphan_group_created') {
    createOrphanGroupCard(card, event, cardNumber, groupInfo, sourceJSON);
  } else if (event.type === 'marker_merged') {
    createMergedCard(card, event, cardNumber, groupInfo);
  } else if (event.type === 'marker_orphaned') {
    createOrphanedCard(card, event, cardNumber, groupInfo);
  } else if (event.matched) {
    createMatchedCard(card, event, cardNumber, groupInfo, sourceJSON);
  } else {
    createFailedCard(card, event, cardNumber, groupInfo);
  }
  
  totalCardCount++;
  
  return card;
};

const createMergedCard = (card, event, cardNumber, groupInfo) => {
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
    <div class="content-value">${escapeHtml(event.reason || 'Marker skipped in translation')}</div>
  `;
  
  card.append(header, content);
  
  const groups = getGroups();
  const groupData = groups.get(groupInfo.groupNumber);
  if (groupData) {
    groupData.stats.merged++;
    groupData.cards.push({ type: 'merged', event, card });
    updateGroupStats(groupInfo.groupNumber);
  }
};

const createOrphanedCard = (card, event, cardNumber, groupInfo) => {
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
  
  const groups = getGroups();
  const groupData = groups.get(groupInfo.groupNumber);
  if (groupData) {
    groupData.stats.orphaned++;
    groupData.cards.push({ type: 'orphaned', event, card });
    updateGroupStats(groupInfo.groupNumber);
  }
};

const createOrphanGroupCard = (card, event, cardNumber, groupInfo, sourceJSON) => {
  const instance = findInstance(sourceJSON, event.position);
  const displayData = getCardDisplayData(instance, sourceJSON);
  
  if (!displayData) return;
  
  const header = document.createElement('div');
  header.className = 'card-header';
  header.innerHTML = `
    <span class="card-number">#${cardNumber}</span>
    <span class="card-group-badge">G${groupInfo.groupNumber}</span>
    <span class="card-marker">${event.marker}</span>
    <span class="card-info">Orphan Group (${displayData.groupMembers.length + 1} markers)</span>
    <span class="card-status">${displayData.orphanGroupType}</span>
  `;
  
  const content = document.createElement('div');
  content.className = 'card-content';
  
  const membersList = [displayData.domainIndex, ...displayData.groupMembers.map(m => m.domainIndex)].join(', ');
  
  content.innerHTML = `
    <div class="content-label">Type</div>
    <div class="content-value">${displayData.orphanGroupType} orphan group</div>
    
    <div class="content-label">Members</div>
    <div class="content-value">${escapeHtml(membersList)}</div>
    
    <div class="content-label">Original (${displayData.totalWords} words)</div>
    <div class="content-value">${escapeHtml(displayData.originalText)}</div>
    
    <div class="content-label">Status</div>
    <div class="content-value" style="color: #f57c00;">⚠️ Not translated (no matching translation found)</div>
  `;
  
  card.append(header, content);
  
  if (displayData.utteranceCount > 0) {
    createUtterancesSection(card, displayData, cardNumber);
  }
  
  const groups = getGroups();
  const groupData = groups.get(groupInfo.groupNumber);
  if (groupData) {
    groupData.stats.orphaned++;
    groupData.cards.push({ type: 'orphan_group', event, card });
    updateGroupStats(groupInfo.groupNumber);
  }
};

const createMatchedCard = (card, event, cardNumber, groupInfo, sourceJSON) => {
  const instance = findInstance(sourceJSON, event.sourcePosition);
  const displayData = getCardDisplayData(instance, sourceJSON);
  
  if (!displayData) {
    console.warn('No display data for matched card');
    return;
  }
  
  const header = document.createElement('div');
  header.className = 'card-header';
  
  let headerInfo = `Trans #${event.position} → Source #${event.sourcePosition}`;
  if (displayData.hasMerges) {
    const mergeInfo = [];
    if (displayData.forwardMerged.length > 0) mergeInfo.push(`↑${displayData.forwardMerged.length}`);
    if (displayData.backwardMerged.length > 0) mergeInfo.push(`↓${displayData.backwardMerged.length}`);
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
  
  if (displayData.originalText) {
    content.innerHTML += `
      <div class="content-label">Original (${displayData.totalWords} words)</div>
      <div class="content-value">${escapeHtml(displayData.originalText)}</div>
    `;
  }
  
  if (displayData.hasTranslation) {
    if (displayData.hasCompounds) {
      content.innerHTML += `
        <div class="compound-info">
          ✨ ${displayData.compoundCount} compound word${displayData.compoundCount > 1 ? 's' : ''} detected
        </div>
      `;
    }
    
    content.innerHTML += `
      <div class="content-label">Translation</div>
      <div class="content-value">${formatCompoundsForDisplay(displayData.translationText)}</div>
    `;
  }
  
  card.append(header, content);
  
  if (displayData.utteranceCount > 0) {
    createUtterancesSection(card, displayData, cardNumber);
  }
  
  const groups = getGroups();
  const groupData = groups.get(groupInfo.groupNumber);
  if (groupData) {
    groupData.stats.matched++;
    groupData.cards.push({ type: 'matched', event, card });
    updateGroupStats(groupInfo.groupNumber);
  }
};

const createFailedCard = (card, event, cardNumber, groupInfo) => {
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
  
  const groups = getGroups();
  const groupData = groups.get(groupInfo.groupNumber);
  if (groupData) {
    groupData.stats.failed++;
    groupData.cards.push({ type: 'failed', event, card });
    updateGroupStats(groupInfo.groupNumber);
  }
};

const createUtterancesSection = (card, displayData, cardNumber) => {
  const utterances = displayData.instance.utterances;
  
  if (!utterances || utterances.length === 0) return;
  
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'utterances-toggle';
  toggleBtn.textContent = `▸ ${displayData.utteranceCount} utterances`;
  
  const container = document.createElement('div');
  container.style.display = 'none';
  container.className = 'utterances-container';
  
  const title = document.createElement('div');
  title.className = 'utterances-title';
  title.textContent = `${displayData.utteranceCount} utterances`;
  container.appendChild(title);
  
  const totalTranslationWords = utterances.reduce((sum, utt) => 
    sum + countWordsConsistent(utt.elementTranslation || '', 'vi'), 0
  );
  
  utterances.forEach((utt, idx) => {
    const uttDisplay = getUtteranceDisplayData(utt, utterances, totalTranslationWords);
    const item = createUtteranceItem(uttDisplay, idx);
    container.appendChild(item);
  });
  
  toggleBtn.onclick = () => {
    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = `${isHidden ? '▾' : '▸'} ${displayData.utteranceCount} utterances`;
  };
  
  card.append(toggleBtn, container);
};

const createUtteranceItem = (uttDisplay, idx) => {
  const item = document.createElement('div');
  item.className = 'utterance-item';
  
  let mergedInfo = '';
  if (uttDisplay.isMerged) {
    mergedInfo = `<span style="background: #ffe0b2; padding: 2px 5px; border-radius: 2px; font-size: 9px; font-weight: bold; margin-left: 6px;">⤝ ${uttDisplay.mergedSource}</span>`;
  }
  
  const meta = document.createElement('div');
  meta.className = 'utterance-meta';
  meta.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center;">
      <span class="utterance-index" style="font-weight: bold; color: #000;">Seg #${idx + 1}</span>
      <span class="utterance-timestamp" style="font-family: monospace; color: #666;">⏱ ${uttDisplay.timestamp}</span>
      <span style="font-family: monospace; color: #999; font-size: 9px;">⏲ ${uttDisplay.durationMs}ms</span>
      ${mergedInfo}
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
      <span style="background: #e3f2fd; padding: 2px 6px; border-radius: 2px; font-size: 9px; font-weight: bold;">
        Src: ${uttDisplay.wordLength}w (${uttDisplay.originalPercentage}%)
      </span>
      <span style="background: #e8f5e9; padding: 2px 6px; border-radius: 2px; font-size: 9px; font-weight: bold;">
        Trans: ${uttDisplay.translationWords}w (${uttDisplay.translationPercentage}%)
      </span>
    </div>
  `;
  
  const ratioBar = document.createElement('div');
  ratioBar.style.cssText = 'margin-bottom: 8px;';
  ratioBar.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px;">
      <div style="font-size: 8px; color: #666; width: 60px;">Original:</div>
      <div style="flex: 1; background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
        <div style="width: ${uttDisplay.originalPercentage}%; height: 100%; background: #2196F3;"></div>
      </div>
      <div style="font-size: 8px; color: #666; width: 40px; text-align: right;">${uttDisplay.originalPercentage}%</div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <div style="font-size: 8px; color: #666; width: 60px;">Translation:</div>
      <div style="flex: 1; background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
        <div style="width: ${uttDisplay.translationPercentage}%; height: 100%; background: #4CAF50;"></div>
      </div>
      <div style="font-size: 8px; color: #666; width: 40px; text-align: right;">${uttDisplay.translationPercentage}%</div>
    </div>
  `;
  
  const originalDiv = document.createElement('div');
  originalDiv.className = 'utterance-text';
  originalDiv.innerHTML = `
    <div class="utterance-label">Original</div>
    <div>${escapeHtml(uttDisplay.originalText)}</div>
  `;
  
  item.append(meta, ratioBar, originalDiv);
  
  if (uttDisplay.translationText && uttDisplay.translationText.trim()) {
    const translationDiv = document.createElement('div');
    translationDiv.className = 'utterance-text';
    translationDiv.innerHTML = `
      <div class="utterance-label">Translation</div>
      <div>${formatCompoundsForDisplay(uttDisplay.translationText)}</div>
    `;
    item.appendChild(translationDiv);
  }
  
  return item;
};

export const getTotalCardCount = () => totalCardCount;
export const resetTotalCardCount = () => { totalCardCount = 0; };