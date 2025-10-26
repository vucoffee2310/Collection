/**
 * Stream Cards UI - Minimal Design with Compound Support + Consistent Word Counting
 */

import { formatCompoundsForDisplay, extractCompounds, removeCompoundMarkers } from '../utils/vietnamese-compounds.js';
import { countWordsConsistent } from '../utils/dom.js';

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

export const createEventCard = (event, sourceJSON) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  if (event.type === 'marker_merged') {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
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
    
  } else if (event.type === 'marker_orphaned') {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
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
    
  } else {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
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
  }
  
  return card;
};

export const updateCards = (cardsWrapper, events, sourceJSON) => {
  if (!events || events.length === 0) return;
  
  const existingCount = cardsWrapper.children.length;
  const newEvents = events.slice(existingCount);
  
  newEvents.forEach(event => {
    const card = createEventCard(event, sourceJSON);
    if (card) {
      cardsWrapper.appendChild(card);
    }
  });
  
  cardsWrapper.parentElement.scrollTop = cardsWrapper.parentElement.scrollHeight;
};

// Helpers
const createUtteranceItem = (utt, idx, instance, allUtterances, totalTranslationWords) => {
  const item = document.createElement('div');
  item.className = 'utterance-item';
  
  // CRITICAL: Calculate translation words using consistent counting
  // This MUST match the counting logic in splitTranslationByWordRatio
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