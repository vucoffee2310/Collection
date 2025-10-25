/**
 * Stream Cards UI - Card creation and rendering functions
 */

export const createCardsContainer = () => {
  const container = document.createElement('div');
  container.id = 'cardsContainer';
  container.style.cssText = `
    display: none; background: #f8f9fa; border: 1px solid #dee2e6;
    padding: 16px; border-radius: 4px; margin: 16px 0;
    max-height: 400px; overflow-y: auto;
  `;
  
  const title = document.createElement('div');
  title.id = 'cardsContainerTitle';
  title.style.cssText = 'font-weight: bold; color: #333; margin-bottom: 12px; font-size: 14px;';
  title.textContent = '📋 Processing Results';
  
  const cardsWrapper = document.createElement('div');
  cardsWrapper.id = 'cardsWrapper';
  
  container.append(title, cardsWrapper);
  return container;
};

export const createEventCard = (event, sourceJSON) => {
  const card = document.createElement('div');
  card.className = 'card-item';
  
  if (event.type === 'marker_merged') {
    card.classList.add('merged');
    
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
      <div class="content-grid">
        <div class="content-label">Type</div>
        <div class="content-value">${event.mergeDirection || 'N/A'} merge</div>
        
        <div class="content-label">Reason</div>
        <div class="content-value">${event.reason || 'Marker skipped in translation'}</div>
      </div>
    `;
    
    card.append(header, content);
    
  } else if (event.type === 'marker_orphaned') {
    card.classList.add('orphaned');
    
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
      <div class="content-grid">
        <div class="content-label">Status</div>
        <div class="content-value">No preceding match found</div>
        
        <div class="content-label">Reason</div>
        <div class="content-value">${escapeHtml(event.detectedBetween || event.reason || 'Unable to merge')}</div>
      </div>
    `;
    
    card.append(header, content);
    
  } else if (event.matched) {
    card.classList.add('matched');
    
    const instance = findInstance(sourceJSON, event.sourcePosition);
    const originalText = instance?.utterances?.[0]?.utterance || instance?.content || '';
    const translationText = instance?.overallTranslation || '';
    const utterances = instance?.utterances || [];
    const utteranceCount = utterances.length;
    
    const cardId = `streamCard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <span class="card-marker">${event.marker}</span>
      <span class="card-info">Trans #${event.position} → Source #${event.sourcePosition}</span>
      <span class="card-status">✓ ${event.method}</span>
    `;
    
    const content = document.createElement('div');
    content.className = 'card-content';
    
    const grid = document.createElement('div');
    grid.className = 'content-grid';
    
    if (originalText) {
      grid.innerHTML += `
        <div class="content-label">Original</div>
        <div class="content-value original">${escapeHtml(originalText.substring(0, 150))}${originalText.length > 150 ? '...' : ''}</div>
      `;
    }
    
    if (translationText) {
      grid.innerHTML += `
        <div class="content-label">Translation</div>
        <div class="content-value translation">${escapeHtml(translationText.substring(0, 150))}${translationText.length > 150 ? '...' : ''}</div>
      `;
    }
    
    content.appendChild(grid);
    
    if (utteranceCount > 0) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'utterances-toggle';
      toggleBtn.id = `${cardId}_toggleBtn`;
      toggleBtn.innerHTML = `<span>🔍</span><span>Show ${utteranceCount} Utterances</span>`;
      
      const utterancesDiv = document.createElement('div');
      utterancesDiv.id = `${cardId}_utterances`;
      utterancesDiv.style.display = 'none';
      utterancesDiv.className = 'utterances-container';
      
      const title = document.createElement('div');
      title.className = 'utterances-title';
      title.textContent = `🔍 Utterance Breakdown (${utteranceCount} segments)`;
      utterancesDiv.appendChild(title);
      
      utterances.forEach((utt, idx) => {
        const item = createUtteranceItem(utt, idx);
        utterancesDiv.appendChild(item);
      });
      
      content.append(toggleBtn, utterancesDiv);
      
      setTimeout(() => {
        toggleBtn.onclick = () => {
          if (utterancesDiv.style.display === 'none') {
            utterancesDiv.style.display = 'block';
            toggleBtn.classList.add('expanded');
            toggleBtn.innerHTML = `<span>🔼</span><span>Hide ${utteranceCount} Utterances</span>`;
          } else {
            utterancesDiv.style.display = 'none';
            toggleBtn.classList.remove('expanded');
            toggleBtn.innerHTML = `<span>🔍</span><span>Show ${utteranceCount} Utterances</span>`;
          }
        };
      }, 0);
    }
    
    card.append(header, content);
    
  } else {
    card.classList.add('failed');
    
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
      <div class="content-grid">
        <div class="content-label">Reason</div>
        <div class="content-value">${escapeHtml(event.reason || 'No match found')}</div>
      </div>
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

// Helper functions
const createUtteranceItem = (utt, idx) => {
  const item = document.createElement('div');
  item.className = 'utterance-item';
  
  const meta = document.createElement('div');
  meta.className = 'utterance-meta';
  meta.innerHTML = `
    <span class="utterance-index">#${utt.index !== undefined ? utt.index + 1 : idx + 1}</span>
    <span class="utterance-timestamp">${utt.timestamp || 'N/A'}</span>
    <span class="utterance-words">${utt.wordLength || 0} words</span>
  `;
  
  const originalDiv = document.createElement('div');
  originalDiv.className = 'utterance-text original';
  originalDiv.innerHTML = `
    <div class="utterance-label">Original:</div>
    <div>${escapeHtml(utt.utterance || '')}</div>
  `;
  
  item.append(meta, originalDiv);
  
  if (utt.elementTranslation && utt.elementTranslation.trim()) {
    const translationDiv = document.createElement('div');
    translationDiv.className = 'utterance-text translation';
    translationDiv.innerHTML = `
      <div class="utterance-label">Translation:</div>
      <div>${escapeHtml(utt.elementTranslation)}</div>
    `;
    item.appendChild(translationDiv);
  } else {
    const missingDiv = document.createElement('div');
    missingDiv.className = 'utterance-text missing';
    missingDiv.innerHTML = `<div class="utterance-label">⚠️ No translation assigned yet</div>`;
    item.appendChild(missingDiv);
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