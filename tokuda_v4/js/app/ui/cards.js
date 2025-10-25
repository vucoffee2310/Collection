/**
 * Stream Cards UI - Minimal Design
 */

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
    
    // Combine all utterances for original text
    const originalText = instance?.utterances && instance.utterances.length > 0
      ? instance.utterances.map(utt => utt.utterance).join(' ')
      : instance?.content || '';
    
    const translationText = instance?.overallTranslation || '';
    const utterances = instance?.utterances || [];
    const utteranceCount = utterances.length;
    
    const cardId = `streamCard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `
      <span class="card-marker">${event.marker}</span>
      <span class="card-info">Trans #${event.position} → Source #${event.sourcePosition}</span>
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
      content.innerHTML += `
        <div class="content-label">Translation</div>
        <div class="content-value">${escapeHtml(translationText)}</div>
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
      
      utterances.forEach((utt, idx) => {
        const item = createUtteranceItem(utt, idx);
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
const createUtteranceItem = (utt, idx) => {
  const item = document.createElement('div');
  item.className = 'utterance-item';
  
  const meta = document.createElement('div');
  meta.className = 'utterance-meta';
  meta.innerHTML = `
    <span class="utterance-index">#${utt.index !== undefined ? utt.index + 1 : idx + 1}</span>
    <span class="utterance-timestamp">${utt.timestamp || 'N/A'}</span>
    <span class="utterance-words">${utt.wordLength || 0}w</span>
  `;
  
  const originalDiv = document.createElement('div');
  originalDiv.className = 'utterance-text';
  originalDiv.innerHTML = `
    <div class="utterance-label">Original</div>
    <div>${escapeHtml(utt.utterance || '')}</div>
  `;
  
  item.append(meta, originalDiv);
  
  if (utt.elementTranslation && utt.elementTranslation.trim()) {
    const translationDiv = document.createElement('div');
    translationDiv.className = 'utterance-text';
    translationDiv.innerHTML = `
      <div class="utterance-label">Translation</div>
      <div>${escapeHtml(utt.elementTranslation)}</div>
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