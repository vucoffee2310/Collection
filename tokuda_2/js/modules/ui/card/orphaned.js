import { getExpectedContext, escapeHtml } from './data.js';

export const createOrphanedContent = (items) => {
  const container = document.createElement('div');
  
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
        <div style="font-size: 20px; font-weight: bold; color: #28a745; margin-bottom: 10px;">Perfect!</div>
        <div style="font-size: 14px; color: #666; line-height: 1.6;">
          No orphaned markers - all content was either matched or successfully merged
        </div>
      </div>
    `;
    return container;
  }
  
  items.forEach((item) => {
    const card = createOrphanedCard(item);
    container.appendChild(card);
  });
  
  return container;
};

const createOrphanedCard = (item) => {
  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border: 1px solid #e0e0e0;
    border-left: 4px solid #dc3545;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  `;
  
  const expectedContext = getExpectedContext(item);
  const utteranceCount = item.utterances ? item.utterances.length : 0;
  const utteranceBadge = utteranceCount > 0
    ? `<span style="margin-left: 8px; font-size: 11px; background: #6c757d; color: white; padding: 3px 8px; border-radius: 10px;">📝 ${utteranceCount} utterances</span>`
    : '';
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
      <div style="flex: 1;">
        <div style="margin-bottom: 8px;">
          <span style="font-size: 18px; font-weight: bold; color: #dc3545;">${item.domainIndex}</span>
          <span style="margin-left: 8px; font-size: 11px; background: #dc3545; color: white; padding: 3px 8px; border-radius: 10px; font-weight: bold;">ORPHANED</span>
          ${utteranceBadge}
        </div>
        ${expectedContext ? `
          <div style="font-size: 12px; background: #fff3cd; padding: 6px 10px; border-radius: 4px; border-left: 3px solid #ffc107; margin-top: 8px;">
            <strong style="color: #856404;">Expected Context:</strong> 
            <code style="color: #333; font-family: monospace; font-size: 11px;">${expectedContext}</code>
          </div>
        ` : ''}
      </div>
      <div style="text-align: right; font-size: 11px; color: #999;">
        <div>Position: #${item.position}</div>
      </div>
    </div>
    
    <div style="background: #fff3cd; border-left: 3px solid #ffc107; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 12px; color: #856404;">
      ⚠️ Could not merge - no preceding matched marker was found (likely at start of stream)
    </div>
    
    <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
      <div style="font-size: 10px; font-weight: bold; color: #666; margin-bottom: 4px;">ORIGINAL (NOT TRANSLATED):</div>
      <div style="font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(item.original)}</div>
    </div>
    
    ${createOrphanedUtteranceBreakdown(item)}
  `;
  
  return card;
};

const createOrphanedUtteranceBreakdown = (item) => {
  if (!item.utterances || item.utterances.length === 0) {
    return '';
  }
  
  let html = `
    <div style="margin-top: 12px; padding: 12px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
      <div style="font-size: 11px; font-weight: bold; color: #856404; margin-bottom: 10px; display: flex; align-items: center;">
        <span style="font-size: 14px; margin-right: 6px;">🔍</span>
        UTTERANCE DETAILS (${item.utterances.length} segments - NOT TRANSLATED)
      </div>
  `;
  
  item.utterances.forEach((utt, idx) => {
    html += `
      <div style="background: white; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px; margin-bottom: 6px; font-size: 11px;">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <span style="background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; margin-right: 6px;">
            #${utt.index !== undefined ? utt.index + 1 : idx + 1}
          </span>
          <span style="color: #666; font-size: 10px; font-family: monospace;">
            ${utt.timestamp || 'N/A'}
          </span>
          <span style="margin-left: auto; color: #999; font-size: 9px;">
            ${utt.wordLength || 0} words
          </span>
        </div>
        
        <div style="padding: 6px; background: #f8f9fa; border-radius: 3px;">
          <div style="font-size: 9px; color: #666; margin-bottom: 2px;">ORIGINAL:</div>
          <div style="color: #333; line-height: 1.4;">
            ${escapeHtml(utt.utterance || '')}
          </div>
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  
  return html;
};