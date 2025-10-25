/**
 * Stream Modal UI
 * Main modal for translation processing (manual + AI)
 */

import { copyToClipboard } from '../utils/dom.js';
import { formatJSON } from '../utils/format.js';
import { simulateSSEStream, StreamingTranslationProcessor } from '../core/stream-processor.js';
import { sendToAI } from '../utils/api.js';
import { createStatElement } from '../utils/helpers.js';
import { downloadSRT, downloadVTT, downloadTXT } from '../export/subtitle-formats.js';
import { createCleanJSON, createMinimalJSON, createStructuredJSON } from '../export/json-formats.js';
import { createResultsCard } from './results.js';
import { createCardsContainer, updateCards } from './cards.js';

/**
 * Create stream modal
 * @param {Object} track - YouTube caption track
 * @param {Function} getOrCreateJSON - Function to get/create JSON
 * @param {Function} processTrack - Function to process track
 * @returns {HTMLElement} - Modal element
 */
export const createStreamModal = (track, getOrCreateJSON, processTrack) => {
  // Inject CSS
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
    background: rgba(0,0,0,0.8); z-index: 10000;
    display: flex; align-items: center; justify-content: center;
  `;
  
  const panel = document.createElement('div');
  panel.id = 'streamModalPanel';
  panel.style.cssText = `
    background: white; padding: 24px; border-radius: 8px;
    max-width: 1000px; width: 90%; max-height: 90vh; overflow-y: auto;
  `;
  
  const header = createHeader();
  const tabs = createTabs();
  const manualTab = createManualTab();
  const aiTab = createAITab();
  aiTab.style.display = 'none';
  
  const sourceSection = createSourceSection();
  const streamDisplay = createStreamDisplay();
  const statsDisplay = createStatsDisplay();
  const cardsContainer = createCardsContainer();
  const exportSection = createExportSection();
  const footer = createFooter();
  
  let updatedJSONData = null;
  
  // Setup tab switching
  setupTabSwitching(tabs, manualTab, aiTab, footer.querySelector('#streamModalStartBtn'));
  
  // Setup handlers
  setupSourceSection(sourceSection, track, getOrCreateJSON);
  setupManualTab(manualTab, track, processTrack);
  setupAITab(aiTab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, (data) => { updatedJSONData = data; });
  setupExportSection(exportSection, () => updatedJSONData);
  setupFooter(footer, manualTab, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, (data) => { updatedJSONData = data; });
  
  header.querySelector('#streamModalCloseBtn').onclick = () => modal.remove();
  
  panel.append(header, tabs, manualTab, aiTab, sourceSection, streamDisplay, statsDisplay.container, cardsContainer, exportSection, footer);
  modal.appendChild(panel);
  
  return modal;
};

// ===========================
// UI Creation Functions
// ===========================

const createHeader = () => {
  const header = document.createElement('div');
  header.id = 'streamModalHeader';
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';
  header.innerHTML = `
    <h2 style="margin: 0; color: #333;">Translation Stream Processor</h2>
    <button id="streamModalCloseBtn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">✕</button>
  `;
  return header;
};

const createTabs = () => {
  const container = document.createElement('div');
  container.id = 'streamModalTabs';
  container.style.cssText = 'display: flex; gap: 0; border-bottom: 2px solid #dee2e6; margin-bottom: 20px;';
  
  const createTab = (id, text, active = false) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.style.cssText = `
      padding: 12px 24px; background: none; border: none;
      cursor: pointer; font-size: 14px; font-weight: 500;
      color: ${active ? '#007bff' : '#6c757d'};
      border-bottom: ${active ? '3px solid #007bff' : 'none'};
      margin-bottom: -2px;
    `;
    return btn;
  };
  
  container.append(
    createTab('manualTabBtn', '📝 Manual Input', true),
    createTab('aiTabBtn', '🤖 AI Stream', false)
  );
  
  return container;
};

const createManualTab = () => {
  const container = document.createElement('div');
  container.id = 'manualTab';
  
  const textarea = document.createElement('textarea');
  textarea.id = 'manualTabTextarea';
  textarea.placeholder = 'Paste complete translation here...\nExample: (a) translated text (b) more text...';
  textarea.style.cssText = `
    width: 100%; height: 120px; padding: 12px;
    border: 1px solid #dee2e6; border-radius: 4px;
    font-family: monospace; font-size: 13px; resize: vertical;
    margin-bottom: 12px;
  `;
  
  const copyBtn = document.createElement('button');
  copyBtn.id = 'manualTabCopyBtn';
  copyBtn.textContent = '📋 Copy Source Text';
  copyBtn.style.cssText = `
    padding: 8px 16px; background: #f8f9fa; color: #495057;
    border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; font-size: 13px;
  `;
  
  container.append(textarea, copyBtn);
  return container;
};

const createAITab = () => {
  const container = document.createElement('div');
  container.id = 'aiTab';
  container.style.cssText = 'padding: 20px; background: #f8f9fa; border-radius: 4px; text-align: center;';
  
  container.innerHTML = `
    <div style="margin-bottom: 16px; color: #495057;">
      Send markers to AI and process translation in real-time
    </div>
  `;
  
  const streamBtn = document.createElement('button');
  streamBtn.id = 'aiTabStreamBtn';
  streamBtn.textContent = '🚀 Send to AI & Process';
  streamBtn.style.cssText = `
    padding: 12px 32px; background: #28a745; color: white;
    border: none; border-radius: 4px; cursor: pointer;
    font-size: 14px; font-weight: bold;
  `;
  
  container.appendChild(streamBtn);
  return container;
};

const createSourceSection = () => {
  const section = document.createElement('div');
  section.id = 'sourceSection';
  section.style.cssText = `
    padding: 16px; background: #e7f3ff; border-radius: 4px;
    margin: 16px 0; display: flex; justify-content: space-between; align-items: center;
  `;
  
  const label = document.createElement('div');
  label.id = 'sourceSectionLabel';
  label.style.cssText = 'color: #004085; font-size: 13px;';
  label.innerHTML = '<strong>📄 Source Markers:</strong> Original structure before translation';
  
  const copyBtn = document.createElement('button');
  copyBtn.id = 'sourceSectionCopyBtn';
  copyBtn.textContent = 'Copy JSON';
  copyBtn.style.cssText = `
    padding: 8px 16px; background: #007bff; color: white;
    border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
  `;
  
  section.append(label, copyBtn);
  return section;
};

const createStreamDisplay = () => {
  const div = document.createElement('div');
  div.id = 'streamDisplay';
  div.style.cssText = `
    display: none; background: #1e1e1e; color: #d4d4d4;
    padding: 12px; border-radius: 4px; margin: 16px 0;
    font-family: monospace; font-size: 11px;
    max-height: 150px; overflow-y: auto;
  `;
  return div;
};

const createStatsDisplay = () => {
  const container = document.createElement('div');
  container.id = 'statsDisplay';
  container.style.cssText = `
    display: none; background: #6f42c1; color: white;
    padding: 16px; border-radius: 4px; margin: 16px 0;
  `;
  
  const grid = document.createElement('div');
  grid.id = 'statsDisplayGrid';
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;';
  
  const elements = {
    matched: createStatElement('0', 'Matched', '#4ade80'),
    merged: createStatElement('0', 'Merged', '#fbbf24'),
    orphaned: createStatElement('0', 'Orphaned', '#f87171'),
  };
  
  elements.matched.container.id = 'statsMatched';
  elements.merged.container.id = 'statsMerged';
  elements.orphaned.container.id = 'statsOrphaned';
  
  Object.values(elements).forEach(el => grid.appendChild(el.container));
  container.appendChild(grid);
  
  return { container, elements };
};

const createExportSection = () => {
  const section = document.createElement('div');
  section.id = 'exportSection';
  section.style.cssText = `
    display: none; padding: 16px; background: #d4edda;
    border-radius: 4px; margin: 16px 0;
  `;
  
  const title = document.createElement('div');
  title.id = 'exportSectionTitle';
  title.style.cssText = 'font-weight: bold; color: #155724; margin-bottom: 12px;';
  title.textContent = '✅ Export Results';
  
  const buttons = document.createElement('div');
  buttons.id = 'exportButtons';
  buttons.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
  
  section.append(title, buttons);
  return section;
};

const createFooter = () => {
  const footer = document.createElement('div');
  footer.id = 'streamModalFooter';
  footer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;';
  
  const closeBtn = document.createElement('button');
  closeBtn.id = 'streamModalFooterCloseBtn';
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    padding: 10px 24px; background: #6c757d; color: white;
    border: none; border-radius: 4px; cursor: pointer; font-size: 14px;
  `;
  
  const startBtn = document.createElement('button');
  startBtn.id = 'streamModalStartBtn';
  startBtn.textContent = 'Start Processing';
  startBtn.style.cssText = `
    padding: 10px 24px; background: #007bff; color: white;
    border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;
  `;
  
  footer.append(closeBtn, startBtn);
  return footer;
};

// ===========================
// Setup Functions
// ===========================

const setupTabSwitching = (tabs, manualTab, aiTab, startBtn) => {
  tabs.querySelector('#manualTabBtn').onclick = () => {
    tabs.querySelector('#manualTabBtn').style.borderBottom = '3px solid #007bff';
    tabs.querySelector('#aiTabBtn').style.borderBottom = 'none';
    manualTab.style.display = 'block';
    aiTab.style.display = 'none';
    startBtn.style.display = 'inline-block';
  };
  
  tabs.querySelector('#aiTabBtn').onclick = () => {
    tabs.querySelector('#aiTabBtn').style.borderBottom = '3px solid #007bff';
    tabs.querySelector('#manualTabBtn').style.borderBottom = 'none';
    manualTab.style.display = 'none';
    aiTab.style.display = 'block';
    startBtn.style.display = 'none';
  };
};

const setupSourceSection = (section, track, getOrCreateJSON) => {
  const btn = section.querySelector('#sourceSectionCopyBtn');
  btn.onclick = async () => {
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    const json = await getOrCreateJSON(track);
    if (json) {
      copyToClipboard(formatJSON(json));
      btn.textContent = '✓ Copied';
    } else {
      btn.textContent = '✗ Error';
    }
    
    setTimeout(() => {
      btn.textContent = 'Copy JSON';
      btn.disabled = false;
    }, 2000);
  };
};

const setupManualTab = (tab, track, processTrack) => {
  const btn = tab.querySelector('#manualTabCopyBtn');
  btn.onclick = async () => {
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    const result = await processTrack(track);
    if (result) {
      copyToClipboard(result.content);
      btn.textContent = '✓ Copied';
    } else {
      btn.textContent = '✗ Error';
    }
    
    setTimeout(() => {
      btn.textContent = '📋 Copy Source Text';
      btn.disabled = false;
    }, 2000);
  };
};

const setupAITab = (tab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, setUpdatedJSON) => {
  const btn = tab.querySelector('#aiTabStreamBtn');
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Initializing...';
    btn.style.background = '#6c757d';
    
    streamDisplay.style.display = 'block';
    statsDisplay.container.style.display = 'block';
    cardsContainer.style.display = 'block';
    
    const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
    cardsWrapper.innerHTML = '';
    
    try {
      const result = await processTrack(track);
      const cachedJSON = await getOrCreateJSON(track);
      
      if (!result || !cachedJSON) {
        alert('Failed to load data');
        btn.disabled = false;
        btn.textContent = '🚀 Send to AI & Process';
        btn.style.background = '#28a745';
        return;
      }
      
      const sourceJSON = JSON.parse(JSON.stringify(cachedJSON));
      btn.textContent = 'Streaming...';
      
      const processor = new StreamingTranslationProcessor(sourceJSON);
      
      await sendToAI(result.content, async (chunk) => {
        const result = processor.processChunk(chunk);
        updateStats(statsDisplay, result.stats);
        updateCards(cardsWrapper, processor.events, sourceJSON);
      });
      
      processor.finalize();
      const updatedJSON = processor.getUpdatedJSON();
      setUpdatedJSON(updatedJSON);
      
      updateCards(cardsWrapper, processor.events, updatedJSON);
      
      copyToClipboard(formatJSON(updatedJSON));
      exportSection.style.display = 'block';
      
      btn.textContent = '✓ Completed';
      btn.style.background = '#28a745';
      
    } catch (error) {
      console.error(error);
      btn.textContent = '✗ Error';
      btn.style.background = '#dc3545';
    }
    
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '🚀 Send to AI & Process';
      btn.style.background = '#28a745';
    }, 3000);
  };
};

const setupExportSection = (section, getUpdatedJSON) => {
  const buttonsDiv = section.querySelector('#exportButtons');
  
  const createBtn = (id, text, handler, color = '#28a745') => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.style.cssText = `
      padding: 8px 16px; background: ${color}; color: white;
      border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
      transition: all 0.2s;
    `;
    btn.onmouseenter = () => btn.style.opacity = '0.9';
    btn.onmouseleave = () => btn.style.opacity = '1';
    btn.onclick = handler;
    return btn;
  };
  
  const jsonGroup = document.createElement('div');
  jsonGroup.style.cssText = 'position: relative; display: inline-block;';
  
  const jsonBtn = createBtn('exportJSONBtn', '📋 Copy JSON ▼', () => {
    jsonDropdown.style.display = jsonDropdown.style.display === 'none' ? 'block' : 'none';
  }, '#007bff');
  
  const jsonDropdown = createJSONDropdown(getUpdatedJSON);
  jsonGroup.append(jsonBtn, jsonDropdown);
  
  document.addEventListener('click', (e) => {
    if (!jsonGroup.contains(e.target)) {
      jsonDropdown.style.display = 'none';
    }
  });
  
  buttonsDiv.append(
    jsonGroup,
    createBtn('exportSRTBtn', '💾 SRT', () => {
      const data = getUpdatedJSON();
      if (data) downloadSRT(data);
    }),
    createBtn('exportVTTBtn', '💾 VTT', () => {
      const data = getUpdatedJSON();
      if (data) downloadVTT(data);
    }),
    createBtn('exportTXTBtn', '💾 TXT', () => {
      const data = getUpdatedJSON();
      if (data) downloadTXT(data);
    }),
    createBtn('exportViewDetailsBtn', '📊 View Details', () => {
      const data = getUpdatedJSON();
      if (data) document.body.appendChild(createResultsCard(data, ''));
    }, '#6f42c1')
  );
};

const createJSONDropdown = (getUpdatedJSON) => {
  const dropdown = document.createElement('div');
  dropdown.id = 'exportJSONDropdown';
  dropdown.style.cssText = `
    display: none; position: absolute; top: 100%; left: 0; margin-top: 4px;
    background: white; border: 1px solid #dee2e6; border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; min-width: 220px;
  `;
  
  const createItem = (text, handler) => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 10px 16px; cursor: pointer; font-size: 13px;
      border-bottom: 1px solid #f0f0f0;
    `;
    item.textContent = text;
    item.onmouseenter = () => item.style.background = '#f8f9fa';
    item.onmouseleave = () => item.style.background = 'white';
    item.onclick = () => {
      handler();
      dropdown.style.display = 'none';
    };
    return item;
  };
  
  dropdown.append(
    createItem('📦 Clean JSON', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(createCleanJSON(data)));
        console.log('📋 Clean JSON copied');
      }
    }),
    createItem('🎯 Minimal JSON (Utterances Only)', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(createMinimalJSON(data)));
        console.log('📋 Minimal JSON copied');
      }
    }),
    createItem('📊 Structured JSON (By Status)', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(createStructuredJSON(data)));
        console.log('📋 Structured JSON copied');
      }
    }),
    createItem('🔧 Raw JSON (Full Debug)', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(data));
        console.log('📋 Raw JSON copied');
      }
    })
  );
  
  const lastItem = dropdown.lastElementChild;
  if (lastItem) lastItem.style.borderBottom = 'none';
  
  return dropdown;
};

const setupFooter = (footer, manualTab, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, setUpdatedJSON) => {
  const closeBtn = footer.querySelector('#streamModalFooterCloseBtn');
  const startBtn = footer.querySelector('#streamModalStartBtn');
  
  closeBtn.onclick = () => {
    const modal = footer.closest('#streamModal');
    if (modal) modal.remove();
  };
  
  startBtn.onclick = async () => {
    const textarea = manualTab.querySelector('#manualTabTextarea');
    const text = textarea.value.trim();
    if (!text) {
      alert('Please paste translation text');
      return;
    }
    
    await processManualInput(text, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, startBtn, setUpdatedJSON);
  };
};

// ===========================
// Processing Functions
// ===========================

const processManualInput = async (text, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, startBtn, setUpdatedJSON) => {
  startBtn.disabled = true;
  startBtn.textContent = 'Processing...';
  
  streamDisplay.style.display = 'block';
  statsDisplay.container.style.display = 'block';
  cardsContainer.style.display = 'block';
  
  const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
  cardsWrapper.innerHTML = '';
  
  const cachedJSON = await getOrCreateJSON(track);
  if (!cachedJSON) {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Processing';
    return;
  }
  
  const sourceJSON = JSON.parse(JSON.stringify(cachedJSON));
  
  const updatedJSON = await simulateSSEStream(text, sourceJSON, (progress) => {
    updateStats(statsDisplay, progress.stats);
    updateCards(cardsWrapper, progress.events, sourceJSON);
  });
  
  updateCards(cardsWrapper, updatedJSON.events || [], updatedJSON);
  
  setUpdatedJSON(updatedJSON);
  copyToClipboard(formatJSON(updatedJSON));
  exportSection.style.display = 'block';
  
  startBtn.textContent = 'Done';
  setTimeout(() => {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Processing';
  }, 2000);
};

const updateStats = (statsDisplay, stats) => {
  const { elements } = statsDisplay;
  requestAnimationFrame(() => {
    elements.matched.valueEl.textContent = stats.matched;
    elements.merged.valueEl.textContent = stats.merged;
    elements.orphaned.valueEl.textContent = stats.orphaned;
  });
};