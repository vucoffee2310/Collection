/**
 * Modal Builder - UI Structure Creation
 */

import { setupTabSwitching, setupAITab, setupFooter } from './tab-handlers.js';
import { setupExportSection } from './export-ui.js';
import { loadCompoundData } from '../../utils/compounds/index.js';
import { createCardsContainer } from '../cards/index.js';

export const createStreamModal = async (track, getOrCreateJSON, processTrack) => {
  // Load compound data first
  await loadCompoundData();
  
  if (!document.querySelector('#streamCardsCSS')) {
    const style = document.createElement('link');
    style.id = 'streamCardsCSS';
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getURL('js/app/ui/cards.css');
    document.head.appendChild(style);
  }

  const modal = document.createElement('div');
  modal.id = 'streamModal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.7); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;
  
  const panel = document.createElement('div');
  panel.id = 'streamModalPanel';
  panel.style.cssText = `
    background: white; padding: 20px; border: 2px solid #000;
    max-width: 1000px; width: 90%; max-height: 90vh; overflow-y: auto;
  `;
  
  const header = createHeader();
  const tabs = createTabs();
  const manualTab = createManualTab();
  const aiTab = createAITab();
  aiTab.style.display = 'none';
  
  const streamDisplay = createStreamDisplay();
  const statsDisplay = createStatsDisplay();
  const cardsContainer = createCardsContainer();
  const exportSection = createExportSection();
  const footer = createFooter();
  
  let updatedJSONData = null;
  let processedEvents = [];
  
  setupTabSwitching(tabs, manualTab, aiTab, footer.querySelector('#streamModalStartBtn'));
  setupAITab(aiTab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, 
    (data, events) => { 
      updatedJSONData = data; 
      processedEvents = events || [];
    }
  );
  setupExportSection(exportSection, track, getOrCreateJSON, processTrack, 
    () => updatedJSONData, 
    () => processedEvents
  );
  setupFooter(footer, manualTab, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, 
    (data, events) => { 
      updatedJSONData = data; 
      processedEvents = events || [];
    }
  );
  
  header.querySelector('#streamModalCloseBtn').onclick = () => modal.remove();
  
  panel.append(header, tabs, manualTab, aiTab, streamDisplay, statsDisplay.container, cardsContainer, exportSection, footer);
  modal.appendChild(panel);
  
  return modal;
};

export const createHeader = () => {
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px;';
  header.innerHTML = `
    <h2 style="margin: 0; color: #000; font-size: 16px;">Translation Stream Processor</h2>
    <button id="streamModalCloseBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #000;">X</button>
  `;
  return header;
};

export const createTabs = () => {
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; gap: 0; border-bottom: 1px solid #000; margin-bottom: 16px;';
  
  const createTab = (id, text, active = false) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.style.cssText = `
      padding: 10px 20px; background: ${active ? '#000' : 'white'}; 
      border: 1px solid #000; border-bottom: none;
      cursor: pointer; font-size: 12px; font-weight: bold;
      color: ${active ? '#fff' : '#000'};
      margin-bottom: -1px;
    `;
    return btn;
  };
  
  container.append(
    createTab('manualTabBtn', 'Manual Input', true),
    createTab('aiTabBtn', 'AI Stream', false)
  );
  
  return container;
};

export const createManualTab = () => {
  const container = document.createElement('div');
  container.id = 'manualTab';
  
  const info = document.createElement('div');
  info.style.cssText = 'margin-bottom: 10px; color: #666; font-size: 11px;';
  info.textContent = 'Paste translated text below and click "Start Processing" to match with source markers.';
  
  const textarea = document.createElement('textarea');
  textarea.id = 'manualTabTextarea';
  textarea.placeholder = 'Paste complete translation here...';
  textarea.style.cssText = `
    width: 100%; height: 100px; padding: 10px;
    border: 1px solid #000; font-family: monospace; 
    font-size: 12px; resize: vertical;
  `;
  
  container.append(info, textarea);
  return container;
};

export const createAITab = () => {
  const container = document.createElement('div');
  container.id = 'aiTab';
  container.style.cssText = 'padding: 16px; background: #f5f5f5; border: 1px solid #ccc; text-align: center;';
  
  container.innerHTML = `
    <div style="margin-bottom: 12px; color: #000; font-size: 12px;">
      Send markers to AI and process translation in real-time
    </div>
  `;
  
  const streamBtn = document.createElement('button');
  streamBtn.id = 'aiTabStreamBtn';
  streamBtn.textContent = 'Send to AI & Process';
  streamBtn.style.cssText = `
    padding: 10px 24px; background: #000; color: white;
    border: 1px solid #000; cursor: pointer;
    font-size: 12px; font-weight: bold;
  `;
  
  container.appendChild(streamBtn);
  return container;
};

export const createStreamDisplay = () => {
  const div = document.createElement('div');
  div.id = 'streamDisplay';
  div.style.cssText = `
    display: none; background: #f5f5f5; color: #000;
    padding: 10px; border: 1px solid #ccc; margin: 12px 0;
    font-family: monospace; font-size: 10px;
    max-height: 120px; overflow-y: auto;
  `;
  return div;
};

export const createStatsDisplay = () => {
  const container = document.createElement('div');
  container.id = 'statsDisplay';
  container.style.cssText = `
    display: none; background: white; color: #000;
    padding: 12px; border: 1px solid #000; margin: 12px 0;
  `;
  
  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 11px;';
  
  const createStatElement = (value, label) => {
    const container = document.createElement('div');
    
    const valueEl = document.createElement('div');
    valueEl.style.cssText = 'font-size: 24px; font-weight: bold; color: #000;';
    valueEl.textContent = value;
    
    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'opacity: 0.9;';
    labelEl.textContent = label;
    
    container.appendChild(valueEl);
    container.appendChild(labelEl);
    
    return { container, valueEl, labelEl };
  };
  
  const elements = {
    matched: createStatElement('0', 'Matched'),
    merged: createStatElement('0', 'Merged'),
    orphaned: createStatElement('0', 'Orphaned'),
  };
  
  elements.matched.container.id = 'statsMatched';
  elements.merged.container.id = 'statsMerged';
  elements.orphaned.container.id = 'statsOrphaned';
  
  Object.values(elements).forEach(el => grid.appendChild(el.container));
  container.appendChild(grid);
  
  return { container, elements };
};

export const createExportSection = () => {
  const section = document.createElement('div');
  section.id = 'exportSection';
  section.style.cssText = `
    display: block; padding: 12px; background: #f5f5f5;
    border: 1px solid #ccc; margin: 12px 0;
  `;
  
  const title = document.createElement('div');
  title.style.cssText = 'font-weight: bold; color: #000; margin-bottom: 10px; font-size: 12px;';
  title.textContent = 'Export Options';
  
  const buttons = document.createElement('div');
  buttons.id = 'exportButtons';
  buttons.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap;';
  
  section.append(title, buttons);
  return section;
};

export const createFooter = () => {
  const footer = document.createElement('div');
  footer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid #ccc;';
  
  const closeBtn = document.createElement('button');
  closeBtn.id = 'streamModalFooterCloseBtn';
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    padding: 8px 20px; background: white; color: #000;
    border: 1px solid #000; cursor: pointer; font-size: 12px;
  `;
  
  const startBtn = document.createElement('button');
  startBtn.id = 'streamModalStartBtn';
  startBtn.textContent = 'Start Processing';
  startBtn.style.cssText = `
    padding: 8px 20px; background: #000; color: white;
    border: 1px solid #000; cursor: pointer; font-size: 12px; font-weight: bold;
  `;
  
  footer.append(closeBtn, startBtn);
  return footer;
};