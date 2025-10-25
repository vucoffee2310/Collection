import { 
  getCombinedOriginalContent, 
  getCombinedTranslationBreakdown, 
  getContextForMethod,
  escapeHtml 
} from './data.js';

export const createMatchedContent = (items) => {
  const container = document.createElement('div');
  
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #999;">
        No matched items found
      </div>
    `;
    return container;
  }
  
  items.forEach((item) => {
    const card = createMatchedCard(item);
    container.appendChild(card);
  });
  
  return container;
};

const createMatchedCard = (item) => {
  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border: 1px solid #e0e0e0;
    border-left: 4px solid #28a745;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  card.onmouseenter = () => {
    card.style.transform = 'translateY(-2px)';
    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  };
  card.onmouseleave = () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
  };
  
  const contextInfo = getContextForMethod(item);
  const hasMerged = item.mergedOrphans && item.mergedOrphans.length > 0;
  const mergedBadge = hasMerged 
    ? `<span style="margin-left: 8px; font-size: 11px; background: #ff9800; color: white; padding: 3px 8px; border-radius: 10px; font-weight: bold;">🔗 ${item.mergedOrphans.length} merged</span>`
    : '';
  
  const utteranceCount = item.utterances ? item.utterances.length : 0;
  const utteranceBadge = utteranceCount > 0
    ? `<span style="margin-left: 8px; font-size: 11px; background: #667eea; color: white; padding: 3px 8px; border-radius: 10px;">📝 ${utteranceCount} utterances</span>`
    : '';
  
  const combinedOriginal = getCombinedOriginalContent(item);
  const translationBreakdown = getCombinedTranslationBreakdown(item);
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
      <div style="flex: 1;">
        <div style="margin-bottom: 8px;">
          <span style="font-size: 18px; font-weight: bold; color: #28a745;">${item.domainIndex}</span>
          <span style="margin-left: 8px; font-size: 11px; background: #667eea; color: white; padding: 3px 8px; border-radius: 10px;">${item.method}</span>
          ${mergedBadge}
          ${utteranceBadge}
        </div>
        ${contextInfo ? `
          <div style="font-size: 12px; background: #f0f4ff; padding: 6px 10px; border-radius: 4px; border-left: 3px solid #667eea; margin-top: 8px;">
            <strong style="color: #667eea;">Context Used:</strong> 
            <code style="color: #333; font-family: monospace; font-size: 11px;">${contextInfo}</code>
          </div>
        ` : ''}
      </div>
      <div style="text-align: right; font-size: 11px; color: #999;">
        <div>Position: #${item.position}</div>
      </div>
    </div>
    
    ${hasMerged ? createMergedSection(item) : ''}
    
    <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
      <div style="font-size: 10px; font-weight: bold; color: #666; margin-bottom: 4px;">
        OVERALL ORIGINAL ${hasMerged ? '(includes merged content)' : ''}:
      </div>
      <div style="font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(combinedOriginal)}</div>
    </div>
    
    ${translationBreakdown.hasBreakdown ? 
      createTranslationBreakdownSection(translationBreakdown, item.domainIndex) : 
      `<div style="background: #e7f5ff; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 10px; font-weight: bold; color: #0066cc; margin-bottom: 4px;">OVERALL TRANSLATION:</div>
        <div style="font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(item.translation)}</div>
      </div>`
    }
    
    ${createUtteranceBreakdown(item)}
  `;
  
  return card;
};

const createMergedSection = (item) => {
  const mergedItems = item.mergedOrphans.map(orphan => {
    const orphanUttCount = item.utterances.filter(u => u.mergedSource === orphan.domainIndex).length;
    return `<div style="display: inline-flex; align-items: center; background: #fff3e0; padding: 6px 10px; margin: 3px; border-radius: 6px; font-size: 11px; border: 1px solid #ff9800;">
      <span style="font-weight: bold; color: #f57c00;">${orphan.domainIndex}</span>
      <span style="color: #666; margin-left: 6px; font-size: 10px;">pos #${orphan.position}</span>
      <span style="color: #666; margin-left: 6px; font-size: 10px;">• ${orphanUttCount} utts</span>
    </div>`;
  }).join('');
  
  return `
    <div style="background: linear-gradient(to right, #fff8e1, #ffecb3); border-left: 4px solid #ff9800; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
      <div style="font-size: 11px; font-weight: bold; color: #f57c00; margin-bottom: 8px; display: flex; align-items: center;">
        <span style="font-size: 16px; margin-right: 6px;">🔗</span>
        COMBINED WITH ${item.mergedOrphans.length} ORPHAN${item.mergedOrphans.length > 1 ? 'S' : ''}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">
        ${mergedItems}
      </div>
      <div style="font-size: 10px; color: #666; font-style: italic; background: rgba(255,255,255,0.7); padding: 6px 8px; border-radius: 4px;">
        ℹ️ These markers were skipped in the translation stream and automatically merged here to preserve content
      </div>
    </div>
  `;
};

const createTranslationBreakdownSection = (breakdown, matchedDomainIndex) => {
  return `
    <div style="background: #e7f5ff; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #0066cc;">
      <div style="font-size: 10px; font-weight: bold; color: #0066cc; margin-bottom: 8px;">
        OVERALL TRANSLATION (split by source):
      </div>
      
      ${breakdown.matchedTranslation ? `
        <div style="background: white; padding: 8px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #28a745;">
          <div style="font-size: 9px; font-weight: bold; color: #28a745; margin-bottom: 4px; display: flex; align-items: center;">
            <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">${escapeHtml(matchedDomainIndex)}</span>
            Matched Portion
          </div>
          <div style="font-size: 13px; color: #333; line-height: 1.5;">
            ${escapeHtml(breakdown.matchedTranslation)}
          </div>
        </div>
      ` : ''}
      
      ${breakdown.mergedTranslations.map(merged => `
        <div style="background: white; padding: 8px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #ff9800;">
          <div style="font-size: 9px; font-weight: bold; color: #ff9800; margin-bottom: 4px; display: flex; align-items: center;">
            <span style="background: #ff9800; color: white; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">${escapeHtml(merged.domainIndex)}</span>
            Merged Portion
          </div>
          <div style="font-size: 13px; color: #333; line-height: 1.5;">
            ${escapeHtml(merged.translation)}
          </div>
        </div>
      `).join('')}
      
      <div style="margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.7); border-radius: 4px; border-left: 3px solid #0066cc;">
        <div style="font-size: 9px; font-weight: bold; color: #0066cc; margin-bottom: 4px;">COMBINED:</div>
        <div style="font-size: 12px; color: #333; line-height: 1.5;">
          ${escapeHtml(breakdown.combined)}
        </div>
      </div>
    </div>
  `;
};

const createUtteranceBreakdown = (item) => {
  if (!item.utterances || item.utterances.length === 0) {
    return '';
  }
  
  const groupedUtterances = new Map();
  const matchedUtts = item.utterances.filter(u => !u.mergedSource);
  
  if (matchedUtts.length > 0) {
    groupedUtterances.set(item.domainIndex, {
      label: item.domainIndex,
      color: '#28a745',
      bgColor: '#f8f9fa',
      utterances: matchedUtts
    });
  }
  
  if (item.mergedOrphans && item.mergedOrphans.length > 0) {
    item.mergedOrphans.forEach(orphan => {
      const orphanUtts = item.utterances.filter(u => u.mergedSource === orphan.domainIndex);
      if (orphanUtts.length > 0) {
        groupedUtterances.set(orphan.domainIndex, {
          label: `${orphan.domainIndex} (merged)`,
          color: '#ff9800',
          bgColor: '#fff3e0',
          utterances: orphanUtts
        });
      }
    });
  }
  
  if (groupedUtterances.size === 0 && item.utterances.length > 0) {
    groupedUtterances.set('all', {
      label: item.domainIndex,
      color: '#28a745',
      bgColor: '#f8f9fa',
      utterances: item.utterances
    });
  }
  
  let html = `
    <div style="margin-top: 15px; padding: 12px; background: #f0f4ff; border-radius: 6px; border-left: 4px solid #667eea;">
      <div style="font-size: 11px; font-weight: bold; color: #667eea; margin-bottom: 10px; display: flex; align-items: center;">
        <span style="font-size: 14px; margin-right: 6px;">🔍</span>
        UTTERANCE BREAKDOWN (${item.utterances.length} segments)
      </div>
  `;
  
  groupedUtterances.forEach((group, key) => {
    html += `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 10px; font-weight: bold; color: ${group.color}; margin-bottom: 6px; padding: 4px 8px; background: ${group.bgColor}; border-radius: 4px; display: inline-block;">
          ${escapeHtml(group.label)} (${group.utterances.length} utterances)
        </div>
    `;
    
    group.utterances.forEach((utt, idx) => {
      const hasTranslation = utt.elementTranslation && utt.elementTranslation.trim();
      
      html += `
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px; margin-bottom: 6px; font-size: 11px;">
          <div style="display: flex; align-items: center; margin-bottom: 4px;">
            <span style="background: #667eea; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; margin-right: 6px;">
              #${utt.index !== undefined ? utt.index + 1 : idx + 1}
            </span>
            <span style="color: #666; font-size: 10px; font-family: monospace;">
              ${utt.timestamp || 'N/A'}
            </span>
            <span style="margin-left: auto; color: #999; font-size: 9px;">
              ${utt.wordLength || 0} words
            </span>
          </div>
          
          <div style="padding: 6px; background: #f8f9fa; border-radius: 3px; margin-bottom: 4px;">
            <div style="font-size: 9px; color: #666; margin-bottom: 2px;">ORIGINAL:</div>
            <div style="color: #333; line-height: 1.4;">
              ${escapeHtml(utt.utterance || '')}
            </div>
          </div>
          
          ${hasTranslation ? `
            <div style="padding: 6px; background: #e7f5ff; border-radius: 3px;">
              <div style="font-size: 9px; color: #0066cc; margin-bottom: 2px;">TRANSLATION:</div>
              <div style="color: #333; line-height: 1.4;">
                ${escapeHtml(utt.elementTranslation)}
              </div>
            </div>
          ` : `
            <div style="padding: 6px; background: #fff3cd; border-radius: 3px; border-left: 3px solid #ffc107;">
              <div style="font-size: 9px; color: #856404; font-style: italic;">
                ⚠️ No translation assigned
              </div>
            </div>
          `}
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  html += `</div>`;
  
  return html;
};