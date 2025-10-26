/**
 * Card Factory
 * Creates different types of cards
 */

import { escapeHTML } from '../../../utils/formatting/html-encoder.js';
import { formatCompoundsForDisplay, extractCompounds } from '../../../languages/vietnamese/compound-formatter.js';
import { createUtteranceItem } from './utterance-renderer.js';
import { countWordsConsistent } from '../../../core/translation/word-splitter.js';
import { getGroupInfo } from './group-manager.js';

/**
 * Find instance by position
 * @private
 */
const findInstance = (json, position) => {
  if (!json.markers) return null;
  for (const instances of Object.values(json.markers)) {
    const found = instances.find(inst => inst.position === position);
    if (found) return found;
  }
  return null;
};

/**
 * Create card header
 * @private
 */
const createCardHeader = (cardNumber, groupNumber, marker, info, status) => {
  const header = document.createElement('div');
  header.className = 'card-header';
  header.innerHTML = `
    <span class="card-number">#${cardNumber}</span>
    <span class="card-group-badge">G${groupNumber}</span>
    <span class="card-marker">${marker}</span>
    <span class="card-info">${info}</span>
    <span class="card-status">${status}</span>
  `;
  return header;
};

/**
 * Create matched card
 * @param {Object} event - Event data
 * @param {Object} sourceJSON - Source JSON
 * @param {number} cardNumber - Card number
 * @returns {HTMLElement} - Card element
 */
export const createMatchedCard = (event, sourceJSON, cardNumber) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  const groupInfo = getGroupInfo(cardNumber - 1);
  card.dataset.cardNumber = cardNumber;
  card.dataset.group = groupInfo.groupNumber;
  
  const instance = findInstance(sourceJSON, event.sourcePosition);
  
  // Build complete original text
  let originalText = '';
  const forwardMerged = instance?.mergedOrphans?.filter(o => o.mergeDirection === 'FORWARD') || [];
  const backwardMerged = instance?.mergedOrphans?.filter(o => o.mergeDirection === 'BACKWARD') || [];
  
  if (forwardMerged.length > 0) {
    originalText += forwardMerged.map(o => o.content).join(' ') + ' ';
  }
  originalText += (instance?.content || '');
  if (backwardMerged.length > 0) {
    originalText += ' ' + backwardMerged.map(o => o.content).join(' ');
  }
  originalText = originalText.trim();
  
  // Translation with compounds
  const translationText = instance?.overallTranslationWithCompounds || instance?.overallTranslation || '';
  
  // Count compounds
  const compounds = extractCompounds(translationText);
  const compoundCount = compounds.filter(c => c.isCompound).length;
  
  const utterances = instance?.utterances || [];
  const utteranceCount = utterances.length;
  
  // Header info
  let headerInfo = `Trans #${event.position} → Source #${event.sourcePosition}`;
  if (forwardMerged.length > 0 || backwardMerged.length > 0) {
    const mergeInfo = [];
    if (forwardMerged.length > 0) mergeInfo.push(`↑${forwardMerged.length}`);
    if (backwardMerged.length > 0) mergeInfo.push(`↓${backwardMerged.length}`);
    headerInfo += ` [${mergeInfo.join(' ')}]`;
  }
  
  const header = createCardHeader(
    cardNumber,
    groupInfo.groupNumber,
    event.marker,
    headerInfo,
    event.method
  );
  
  const content = document.createElement('div');
  content.className = 'card-content';
  
  if (originalText) {
    content.innerHTML += `
      <div class="content-label">Original</div>
      <div class="content-value">${escapeHTML(originalText)}</div>
    `;
  }
  
  if (translationText) {
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
  
  // Add utterances if present
  if (utteranceCount > 0) {
    const cardId = `streamCard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
    
    // Calculate total translation words
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
  
  return card;
};

/**
 * Create merged card
 * @param {Object} event - Event data
 * @param {number} cardNumber - Card number
 * @returns {HTMLElement} - Card element
 */
export const createMergedCard = (event, cardNumber) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  const groupInfo = getGroupInfo(cardNumber - 1);
  card.dataset.cardNumber = cardNumber;
  card.dataset.group = groupInfo.groupNumber;
  
  const header = createCardHeader(
    cardNumber,
    groupInfo.groupNumber,
    event.marker,
    `Source #${event.position} → ${event.mergedInto}`,
    'MERGED'
  );
  
  const content = document.createElement('div');
  content.className = 'card-content';
  content.innerHTML = `
    <div class="content-label">Type</div>
    <div class="content-value">${event.mergeDirection || 'N/A'} merge</div>
    
    <div class="content-label">Reason</div>
    <div class="content-value">${event.reason || 'Marker skipped in translation'}</div>
  `;
  
  card.append(header, content);
  return card;
};

/**
 * Create orphaned card
 * @param {Object} event - Event data
 * @param {number} cardNumber - Card number
 * @returns {HTMLElement} - Card element
 */
export const createOrphanedCard = (event, cardNumber) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  const groupInfo = getGroupInfo(cardNumber - 1);
  card.dataset.cardNumber = cardNumber;
  card.dataset.group = groupInfo.groupNumber;
  
  const header = createCardHeader(
    cardNumber,
    groupInfo.groupNumber,
    event.marker,
    `Source #${event.position}`,
    'ORPHANED'
  );
  
  const content = document.createElement('div');
  content.className = 'card-content';
  content.innerHTML = `
    <div class="content-label">Status</div>
    <div class="content-value">No preceding match found</div>
    
    <div class="content-label">Reason</div>
    <div class="content-value">${escapeHTML(event.detectedBetween || event.reason || 'Unable to merge')}</div>
  `;
  
  card.append(header, content);
  return card;
};

/**
 * Create failed card
 * @param {Object} event - Event data
 * @param {number} cardNumber - Card number
 * @returns {HTMLElement} - Card element
 */
export const createFailedCard = (event, cardNumber) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  const groupInfo = getGroupInfo(cardNumber - 1);
  card.dataset.cardNumber = cardNumber;
  card.dataset.group = groupInfo.groupNumber;
  
  const header = createCardHeader(
    cardNumber,
    groupInfo.groupNumber,
    event.marker,
    `Translation #${event.position}`,
    'FAILED'
  );
  
  const content = document.createElement('div');
  content.className = 'card-content';
  content.innerHTML = `
    <div class="content-label">Reason</div>
    <div class="content-value">${escapeHTML(event.reason || 'No match found')}</div>
  `;
  
  card.append(header, content);
  return card;
};