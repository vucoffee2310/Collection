import { copyToClipboard } from '../utils.js';

export const createResultsCard = (updatedJSON, translationText) => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  const panel = document.createElement('div');
  panel.style.cssText = `
    background: white;
    border-radius: 12px;
    max-width: 900px;
    width: 95%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  `;
  
  const stats = calculateStats(updatedJSON);
  
  panel.appendChild(createHeader(stats, modal));
  panel.appendChild(createTabs(stats));
  
  modal.appendChild(panel);
  return modal;
};

const calculateStats = (json) => {
  const matched = [];
  const orphaned = [];
  const merged = [];
  
  Object.entries(json.markers).forEach(([markerKey, instances]) => {
    instances.forEach(instance => {
      if (instance.status === 'MATCHED') {
        matched.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          translation: instance.overallTranslation,
          method: instance.matchMethod || 'unknown',
          position: instance.position,
          prev5: instance.prev5,
          prev4: instance.prev4,
          prev3: instance.prev3,
          prev2: instance.prev2,
          prev1: instance.prev1,
          prev0: instance.prev0,
          mergedOrphans: instance.mergedOrphans || [],
          instance: instance
        });
      } else if (instance.status === 'ORPHAN') {
        orphaned.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          position: instance.position,
          prev5: instance.prev5,
          prev4: instance.prev4,
          prev3: instance.prev3,
          prev2: instance.prev2,
          prev1: instance.prev1,
          prev0: instance.prev0,
          instance: instance
        });
      } else if (instance.status === 'MERGED') {
        merged.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          position: instance.position,
          mergedInto: instance.mergedInto,
          instance: instance
        });
      }
    });
  });
  
  return { matched, orphaned, merged, total: json.totalMarkers };
};

const createHeader = (stats, modal) => {
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const successCount = stats.matched.length + stats.merged.length;
  const successRate = ((successCount / stats.total) * 100).toFixed(1);
  
  const info = document.createElement('div');
  info.innerHTML = `
    <div style="font-size: 20px; font-weight: bold;">📊 Results</div>
    <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">
      ✅ ${stats.matched.length} matched • 
      🔗 ${stats.merged.length} merged • 
      ❌ ${stats.orphaned.length} orphaned • 
      🎯 ${successRate}% success
    </div>
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s;
  `;
  closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
  closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
  closeBtn.onclick = () => modal.remove();
  
  header.append(info, closeBtn);
  return header;
};

const createTabs = (stats) => {
  const container = document.createElement('div');
  container.style.cssText = 'flex: 1; display: flex; flex-direction: column; overflow: hidden;';
  
  const tabButtons = document.createElement('div');
  tabButtons.style.cssText = `
    display: flex;
    background: #f5f5f5;
    border-bottom: 2px solid #ddd;
  `;
  
  const tabContent = document.createElement('div');
  tabContent.style.cssText = 'flex: 1; overflow-y: auto; padding: 20px;';
  
  const tabs = [
    { id: 'matched', label: `✅ Matched (${stats.matched.length})` },
    { id: 'orphaned', label: `❌ Orphaned (${stats.orphaned.length})` }
  ];
  
  const buttons = {};
  const contents = {};
  
  tabs.forEach(({ id, label }, index) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      flex: 1;
      padding: 15px;
      background: ${index === 0 ? 'white' : 'transparent'};
      border: none;
      border-bottom: 3px solid ${index === 0 ? '#667eea' : 'transparent'};
      cursor: pointer;
      font-weight: ${index === 0 ? 'bold' : 'normal'};
      font-size: 14px;
      transition: all 0.2s;
    `;
    
    const content = document.createElement('div');
    content.style.display = index === 0 ? 'block' : 'none';
    
    if (id === 'matched') {
      content.appendChild(createMatchedContent(stats.matched));
    } else if (id === 'orphaned') {
      content.appendChild(createOrphanedContent(stats.orphaned));
    }
    
    btn.onclick = () => {
      Object.values(buttons).forEach(b => {
        b.style.background = 'transparent';
        b.style.borderBottom = '3px solid transparent';
        b.style.fontWeight = 'normal';
      });
      Object.values(contents).forEach(c => c.style.display = 'none');
      
      btn.style.background = 'white';
      btn.style.borderBottom = '3px solid #667eea';
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

const createMatchedContent = (items) => {
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
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div style="flex: 1;">
          <div style="margin-bottom: 8px;">
            <span style="font-size: 18px; font-weight: bold; color: #28a745;">${item.domainIndex}</span>
            <span style="margin-left: 8px; font-size: 11px; background: #667eea; color: white; padding: 3px 8px; border-radius: 10px;">${item.method}</span>
            ${mergedBadge}
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
        <div style="font-size: 10px; font-weight: bold; color: #666; margin-bottom: 4px;">ORIGINAL:</div>
        <div style="font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(item.original)}</div>
      </div>
      
      <div style="background: #e7f5ff; padding: 10px; border-radius: 6px;">
        <div style="font-size: 10px; font-weight: bold; color: #0066cc; margin-bottom: 4px;">TRANSLATION:</div>
        <div style="font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(item.translation)}</div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  return container;
};

const createMergedSection = (item) => {
  const mergedItems = item.mergedOrphans.map(orphan => 
    `<div style="display: inline-flex; align-items: center; background: #fff3e0; padding: 6px 10px; margin: 3px; border-radius: 6px; font-size: 11px; border: 1px solid #ff9800;">
      <span style="font-weight: bold; color: #f57c00;">${orphan.domainIndex}</span>
      <span style="color: #666; margin-left: 6px; font-size: 10px;">pos #${orphan.position}</span>
    </div>`
  ).join('');
  
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

const createOrphanedContent = (items) => {
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
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div style="flex: 1;">
          <div style="margin-bottom: 8px;">
            <span style="font-size: 18px; font-weight: bold; color: #dc3545;">${item.domainIndex}</span>
            <span style="margin-left: 8px; font-size: 11px; background: #dc3545; color: white; padding: 3px 8px; border-radius: 10px; font-weight: bold;">ORPHANED</span>
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
      
      <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
        <div style="font-size: 10px; font-weight: bold; color: #666; margin-bottom: 4px;">ORIGINAL (NOT TRANSLATED):</div>
        <div style="font-size: 13px; color: #333; line-height: 1.5;">${escapeHtml(item.original)}</div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  return container;
};

const getContextForMethod = (item) => {
  const method = item.method;
  
  if (method === 'edge_case_prev0') {
    return item.prev0 ? JSON.stringify(item.prev0) : '[]';
  }
  if (method === 'edge_case_prev1') {
    return item.prev1 ? JSON.stringify(item.prev1) : '[]';
  }
  if (method === 'edge_case_prev2') {
    return item.prev2 ? JSON.stringify(item.prev2) : '[]';
  }
  
  if (method === 'prev5' && item.prev5) {
    return JSON.stringify(item.prev5);
  }
  if (method === 'prev4' && item.prev4) {
    return JSON.stringify(item.prev4);
  }
  if (method === 'prev3' && item.prev3) {
    return JSON.stringify(item.prev3);
  }
  
  if (method === 'prev5Choose4' && item.prev5) {
    return `${JSON.stringify(item.prev5)} (used 4)`;
  }
  if (method === 'prev5Choose3' && item.prev5) {
    return `${JSON.stringify(item.prev5)} (used 3)`;
  }
  if (method === 'prev4Choose3' && item.prev4) {
    return `${JSON.stringify(item.prev4)} (used 3)`;
  }
  
  return null;
};

const getExpectedContext = (item) => {
  if (item.prev5) {
    return `prev5: ${JSON.stringify(item.prev5)}`;
  }
  if (item.prev4) {
    return `prev4: ${JSON.stringify(item.prev4)}`;
  }
  if (item.prev3) {
    return `prev3: ${JSON.stringify(item.prev3)}`;
  }
  if (item.prev2) {
    return `prev2: ${JSON.stringify(item.prev2)}`;
  }
  if (item.prev1) {
    return `prev1: ${JSON.stringify(item.prev1)}`;
  }
  if (item.prev0 !== undefined) {
    return `prev0: ${JSON.stringify(item.prev0)}`;
  }
  return null;
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};