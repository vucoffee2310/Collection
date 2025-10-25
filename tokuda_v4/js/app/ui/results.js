/**
 * Results Card UI
 * Detailed results modal showing matched/orphaned markers
 */

import { calculateStats } from './results-data.js';

/**
 * Create results card modal
 * @param {Object} updatedJSON - Processed JSON data
 * @param {string} translationText - Translation text (unused, kept for compatibility)
 * @returns {HTMLElement} - Modal element
 */
export const createResultsCard = (updatedJSON, translationText) => {
  const modal = document.createElement('div');
  modal.id = 'resultsCardModal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85); z-index: 10001;
    display: flex; align-items: center; justify-content: center;
  `;
  
  const panel = document.createElement('div');
  panel.id = 'resultsCardPanel';
  panel.style.cssText = `
    background: white; border-radius: 8px;
    max-width: 900px; width: 95%; max-height: 90vh;
    overflow: hidden; display: flex; flex-direction: column;
  `;
  
  const stats = calculateStats(updatedJSON);
  
  panel.appendChild(createHeader(stats, modal));
  panel.appendChild(createTabs(stats));
  
  modal.appendChild(panel);
  return modal;
};

/**
 * Create header section
 */
const createHeader = (stats, modal) => {
  const header = document.createElement('div');
  header.id = 'resultsCardHeader';
  header.style.cssText = `
    background: #6f42c1; color: white; padding: 20px;
    display: flex; justify-content: space-between; align-items: center;
  `;
  
  const successCount = stats.matched.length + stats.merged.length;
  const successRate = ((successCount / stats.total) * 100).toFixed(1);
  
  const info = document.createElement('div');
  info.id = 'resultsCardHeaderInfo';
  info.innerHTML = `
    <div style="font-size: 18px; font-weight: bold;">📊 Translation Results</div>
    <div style="font-size: 13px; opacity: 0.9; margin-top: 5px;">
      ✅ ${stats.matched.length} matched • 
      🔗 ${stats.merged.length} merged • 
      ❌ ${stats.orphaned.length} orphaned • 
      🎯 ${successRate}% success
    </div>
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.id = 'resultsCardCloseBtn';
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.2); border: none; color: white;
    font-size: 24px; width: 40px; height: 40px; border-radius: 50%;
    cursor: pointer; transition: background 0.2s;
  `;
  closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
  closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
  closeBtn.onclick = () => modal.remove();
  
  header.append(info, closeBtn);
  return header;
};

/**
 * Create tabs section
 */
const createTabs = (stats) => {
  const container = document.createElement('div');
  container.id = 'resultsCardTabsContainer';
  container.style.cssText = 'flex: 1; display: flex; flex-direction: column; overflow: hidden;';
  
  const tabButtons = document.createElement('div');
  tabButtons.id = 'resultsCardTabButtons';
  tabButtons.style.cssText = 'display: flex; background: #f5f5f5; border-bottom: 2px solid #ddd;';
  
  const tabContent = document.createElement('div');
  tabContent.id = 'resultsCardTabContent';
  tabContent.style.cssText = 'flex: 1; overflow-y: auto; padding: 20px;';
  
  const tabs = [
    { id: 'matchedTab', label: `✅ Matched (${stats.matched.length})`, data: stats.matched },
    { id: 'orphanedTab', label: `❌ Orphaned (${stats.orphaned.length})`, data: stats.orphaned }
  ];
  
  const buttons = {};
  const contents = {};
  
  tabs.forEach(({ id, label, data }, index) => {
    const btn = document.createElement('button');
    btn.id = `${id}Btn`;
    btn.textContent = label;
    btn.style.cssText = `
      flex: 1; padding: 15px; background: ${index === 0 ? 'white' : 'transparent'};
      border: none; border-bottom: 3px solid ${index === 0 ? '#6f42c1' : 'transparent'};
      cursor: pointer; font-weight: ${index === 0 ? 'bold' : 'normal'};
      font-size: 14px; transition: all 0.2s;
    `;
    
    const content = document.createElement('div');
    content.id = `${id}Content`;
    content.style.display = index === 0 ? 'block' : 'none';
    
    if (id === 'matchedTab') {
      content.appendChild(createMatchedContent(data));
    } else {
      content.appendChild(createOrphanedContent(data));
    }
    
    btn.onclick = () => {
      Object.values(buttons).forEach(b => {
        b.style.background = 'transparent';
        b.style.borderBottom = '3px solid transparent';
        b.style.fontWeight = 'normal';
      });
      Object.values(contents).forEach(c => c.style.display = 'none');
      
      btn.style.background = 'white';
      btn.style.borderBottom = '3px solid #6f42c1';
      btn.style.fontWeight = 'bold';
      content.style.display = 'block';
    };
    
    buttons[id] = btn;
    contents[id] = content;
    
    tabButtons.appendChild(btn);
    tabContent.appendChild(content);
  });
  
  container.append(tabButtons, tabContent);
  return container;
};

/**
 * Create matched content section
 */
const createMatchedContent = (items) => {
  const container = document.createElement('div');
  container.id = 'matchedContentContainer';
  
  if (items.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No matched items</div>';
    return container;
  }
  
  items.forEach((item, index) => {
    const card = createMatchedCard(item, index);
    container.appendChild(card);
  });
  
  return container;
};

/**
 * Create orphaned content section
 */
const createOrphanedContent = (items) => {
  const container = document.createElement('div');
  container.id = 'orphanedContentContainer';
  
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
        <div style="font-size: 20px; font-weight: bold; color: #28a745; margin-bottom: 10px;">Perfect!</div>
        <div style="font-size: 14px; color: #666;">No orphaned markers - all content was matched or merged</div>
      </div>
    `;
    return container;
  }
  
  items.forEach((item, index) => {
    const card = createOrphanedCard(item, index);
    container.appendChild(card);
  });
  
  return container;
};

/**
 * Create matched card
 */
const createMatchedCard = (item, index) => {
  const card = document.createElement('div');
  card.id = `matchedCard_${index}`;
  card.className = 'matchedCard';
  card.style.cssText = `
    background: white; border: 1px solid #e0e0e0; border-left: 4px solid #28a745;
    border-radius: 6px; padding: 16px; margin-bottom: 16px;
  `;
  
  const hasMerged = item.mergedOrphans && item.mergedOrphans.length > 0;
  const utteranceCount = item.utterances ? item.utterances.length : 0;
  
  // Header
  const cardHeader = document.createElement('div');
  cardHeader.id = `matchedCardHeader_${index}`;
  cardHeader.style.cssText = 'margin-bottom: 12px;';
  
  const title = document.createElement('div');
  title.id = `matchedCardTitle_${index}`;
  title.style.cssText = 'font-size: 16px; font-weight: bold; color: #28a745; margin-bottom: 6px;';
  title.textContent = item.domainIndex;
  
  const badges = document.createElement('div');
  badges.id = `matchedCardBadges_${index}`;
  badges.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';
  
  const methodBadge = createBadge(item.method, '#6f42c1');
  badges.appendChild(methodBadge);
  
  if (hasMerged) {
    const mergedBadge = createBadge(`🔗 ${item.mergedOrphans.length} merged`, '#ff9800');
    badges.appendChild(mergedBadge);
  }
  
  if (utteranceCount > 0) {
    const uttBadge = createBadge(`📝 ${utteranceCount} utterances`, '#007bff');
    badges.appendChild(uttBadge);
  }
  
  const position = document.createElement('div');
  position.id = `matchedCardPosition_${index}`;
  position.style.cssText = 'font-size: 11px; color: #999; margin-top: 6px;';
  position.textContent = `Position: #${item.position}`;
  
  cardHeader.append(title, badges, position);
  
  // Content sections
  const originalSection = createTextSection(
    `matchedCardOriginal_${index}`,
    'Original',
    item.original,
    '#f8f9fa'
  );
  
  const translationSection = createTextSection(
    `matchedCardTranslation_${index}`,
    'Translation',
    item.translation,
    '#e7f5ff'
  );
  
  // Utterances section (if exists)
  const utterancesSection = utteranceCount > 0 
    ? createUtterancesSection(item.utterances, `matchedCardUtterances_${index}`)
    : null;
  
  card.append(cardHeader, originalSection, translationSection);
  if (utterancesSection) card.appendChild(utterancesSection);
  
  return card;
};

/**
 * Create orphaned card
 */
const createOrphanedCard = (item, index) => {
  const card = document.createElement('div');
  card.id = `orphanedCard_${index}`;
  card.className = 'orphanedCard';
  card.style.cssText = `
    background: white; border: 1px solid #e0e0e0; border-left: 4px solid #dc3545;
    border-radius: 6px; padding: 16px; margin-bottom: 16px;
  `;
  
  const utteranceCount = item.utterances ? item.utterances.length : 0;
  
  // Header
  const cardHeader = document.createElement('div');
  cardHeader.id = `orphanedCardHeader_${index}`;
  cardHeader.style.cssText = 'margin-bottom: 12px;';
  
  const title = document.createElement('div');
  title.id = `orphanedCardTitle_${index}`;
  title.style.cssText = 'font-size: 16px; font-weight: bold; color: #dc3545; margin-bottom: 6px;';
  title.textContent = item.domainIndex;
  
  const badges = document.createElement('div');
  badges.id = `orphanedCardBadges_${index}`;
  badges.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';
  
  const orphanBadge = createBadge('ORPHANED', '#dc3545');
  badges.appendChild(orphanBadge);
  
  if (utteranceCount > 0) {
    const uttBadge = createBadge(`📝 ${utteranceCount} utterances`, '#6c757d');
    badges.appendChild(uttBadge);
  }
  
  const position = document.createElement('div');
  position.id = `orphanedCardPosition_${index}`;
  position.style.cssText = 'font-size: 11px; color: #999; margin-top: 6px;';
  position.textContent = `Position: #${item.position}`;
  
  cardHeader.append(title, badges, position);
  
  // Warning
  const warning = document.createElement('div');
  warning.id = `orphanedCardWarning_${index}`;
  warning.style.cssText = `
    background: #fff3cd; border-left: 3px solid #ffc107;
    padding: 10px; border-radius: 4px; margin-bottom: 12px;
    font-size: 12px; color: #856404;
  `;
  warning.textContent = '⚠️ Not translated - no preceding matched marker found';
  
  // Content
  const originalSection = createTextSection(
    `orphanedCardOriginal_${index}`,
    'Original (Not Translated)',
    item.original,
    '#f8f9fa'
  );
  
  // Utterances section (if exists)
  const utterancesSection = utteranceCount > 0 
    ? createUtterancesSection(item.utterances, `orphanedCardUtterances_${index}`)
    : null;
  
  card.append(cardHeader, warning, originalSection);
  if (utterancesSection) card.appendChild(utterancesSection);
  
  return card;
};

/**
 * Create badge element
 */
const createBadge = (text, color) => {
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.style.cssText = `
    font-size: 11px; background: ${color}; color: white;
    padding: 3px 8px; border-radius: 10px; font-weight: bold;
  `;
  badge.textContent = text;
  return badge;
};

/**
 * Create text section
 */
const createTextSection = (id, label, text, bgColor) => {
  const section = document.createElement('div');
  section.id = id;
  section.style.cssText = `
    background: ${bgColor}; padding: 12px; border-radius: 4px; margin-bottom: 10px;
  `;
  
  const labelEl = document.createElement('div');
  labelEl.className = 'textSectionLabel';
  labelEl.style.cssText = 'font-size: 10px; font-weight: bold; color: #666; margin-bottom: 6px;';
  labelEl.textContent = label.toUpperCase();
  
  const textEl = document.createElement('div');
  textEl.className = 'textSectionText';
  textEl.style.cssText = 'font-size: 13px; color: #333; line-height: 1.5;';
  textEl.textContent = text || '';
  
  section.append(labelEl, textEl);
  return section;
};

/**
 * Create utterances section
 */
const createUtterancesSection = (utterances, id) => {
  const section = document.createElement('div');
  section.id = id;
  section.style.cssText = `
    margin-top: 12px; padding: 12px; background: #f0f4ff;
    border-radius: 4px; border-left: 4px solid #667eea;
  `;
  
  const title = document.createElement('div');
  title.className = 'utterancesSectionTitle';
  title.style.cssText = 'font-size: 11px; font-weight: bold; color: #667eea; margin-bottom: 10px;';
  title.textContent = `🔍 UTTERANCES (${utterances.length})`;
  
  const list = document.createElement('div');
  list.className = 'utterancesList';
  
  utterances.forEach((utt, idx) => {
    const item = document.createElement('div');
    item.className = 'utteranceItem';
    item.style.cssText = `
      background: white; border: 1px solid #e0e0e0; border-radius: 4px;
      padding: 10px; margin-bottom: 8px; font-size: 12px;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; margin-bottom: 6px; color: #666;';
    
    const index = document.createElement('span');
    index.style.cssText = `
      background: #667eea; color: white; padding: 2px 6px;
      border-radius: 3px; font-size: 9px; font-weight: bold; margin-right: 8px;
    `;
    index.textContent = `#${utt.index !== undefined ? utt.index + 1 : idx + 1}`;
    
    const timestamp = document.createElement('span');
    timestamp.style.cssText = 'font-family: monospace; font-size: 10px;';
    timestamp.textContent = utt.timestamp || 'N/A';
    
    header.append(index, timestamp);
    
    const original = document.createElement('div');
    original.style.cssText = 'padding: 6px; background: #f8f9fa; border-radius: 3px; margin-bottom: 4px;';
    original.innerHTML = `
      <div style="font-size: 9px; color: #666; margin-bottom: 2px;">ORIGINAL:</div>
      <div style="color: #333;">${escapeHtml(utt.utterance || '')}</div>
    `;
    
    item.append(header, original);
    
    if (utt.elementTranslation && utt.elementTranslation.trim()) {
      const translation = document.createElement('div');
      translation.style.cssText = 'padding: 6px; background: #e7f5ff; border-radius: 3px;';
      translation.innerHTML = `
        <div style="font-size: 9px; color: #0066cc; margin-bottom: 2px;">TRANSLATION:</div>
        <div style="color: #333;">${escapeHtml(utt.elementTranslation)}</div>
      `;
      item.appendChild(translation);
    }
    
    list.appendChild(item);
  });
  
  section.append(title, list);
  return section;
};

/**
 * Escape HTML
 */
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};