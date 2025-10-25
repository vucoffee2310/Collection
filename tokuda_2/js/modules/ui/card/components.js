import { createMatchedContent } from './matched.js';
import { createOrphanedContent } from './orphaned.js';

export const createHeader = (stats, modal) => {
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

export const createTabs = (stats) => {
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