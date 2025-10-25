/**
 * Stream Modal UI
 */

import { copyToClipboard } from '../utils/dom.js';
import { formatJSON, createStatElement } from '../utils/helpers.js';
import { simulateSSEStream, StreamingTranslationProcessor } from '../core/stream-processor.js';
import { sendToAI } from '../utils/api.js';
import { downloadSRT, downloadVTT, downloadTXT } from '../export/subtitle-formats.js';
import { createCleanJSON, createMinimalJSON, createStructuredJSON } from '../export/json-formats.js';
import { createCardsContainer, updateCards } from './cards.js';

export const createStreamModal = (track, getOrCreateJSON, processTrack) => {
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
  
  setupTabSwitching(tabs, manualTab, aiTab, footer.querySelector('#streamModalStartBtn'));
  setupAITab(aiTab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, (data) => { updatedJSONData = data; });
  setupExportSection(exportSection, track, getOrCreateJSON, processTrack, () => updatedJSONData);
  setupFooter(footer, manualTab, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, (data) => { updatedJSONData = data; });
  
  header.querySelector('#streamModalCloseBtn').onclick = () => modal.remove();
  
  panel.append(header, tabs, manualTab, aiTab, streamDisplay, statsDisplay.container, cardsContainer, exportSection, footer);
  modal.appendChild(panel);
  
  return modal;
};

// UI Creation
const createHeader = () => {
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px;';
  header.innerHTML = `
    <h2 style="margin: 0; color: #000; font-size: 16px;">Translation Stream Processor</h2>
    <button id="streamModalCloseBtn" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #000;">X</button>
  `;
  return header;
};

const createTabs = () => {
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

const createManualTab = () => {
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

const createAITab = () => {
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

const createStreamDisplay = () => {
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

const createStatsDisplay = () => {
  const container = document.createElement('div');
  container.id = 'statsDisplay';
  container.style.cssText = `
    display: none; background: white; color: #000;
    padding: 12px; border: 1px solid #000; margin: 12px 0;
  `;
  
  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 11px;';
  
  const elements = {
    matched: createStatElement('0', 'Matched', '#000'),
    merged: createStatElement('0', 'Merged', '#000'),
    orphaned: createStatElement('0', 'Orphaned', '#000'),
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

const createFooter = () => {
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

// Setup Functions
const setupTabSwitching = (tabs, manualTab, aiTab, startBtn) => {
  tabs.querySelector('#manualTabBtn').onclick = () => {
    tabs.querySelector('#manualTabBtn').style.background = '#000';
    tabs.querySelector('#manualTabBtn').style.color = '#fff';
    tabs.querySelector('#aiTabBtn').style.background = 'white';
    tabs.querySelector('#aiTabBtn').style.color = '#000';
    manualTab.style.display = 'block';
    aiTab.style.display = 'none';
    startBtn.style.display = 'inline-block';
  };
  
  tabs.querySelector('#aiTabBtn').onclick = () => {
    tabs.querySelector('#aiTabBtn').style.background = '#000';
    tabs.querySelector('#aiTabBtn').style.color = '#fff';
    tabs.querySelector('#manualTabBtn').style.background = 'white';
    tabs.querySelector('#manualTabBtn').style.color = '#000';
    manualTab.style.display = 'none';
    aiTab.style.display = 'block';
    startBtn.style.display = 'none';
  };
};

const setupAITab = (tab, track, processTrack, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, setUpdatedJSON) => {
  const btn = tab.querySelector('#aiTabStreamBtn');
  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Initializing...';
    
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
        btn.textContent = 'Send to AI & Process';
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
      
      // Show result export buttons
      showResultButtons(exportSection);
      
      btn.textContent = 'Completed';
      
    } catch (error) {
      console.error(error);
      btn.textContent = 'Error';
    }
    
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Send to AI & Process';
    }, 3000);
  };
};

const setupExportSection = (section, track, getOrCreateJSON, processTrack, getUpdatedJSON) => {
  const buttonsDiv = section.querySelector('#exportButtons');
  
  const createBtn = (text, handler) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 6px 12px; background: #000; color: white;
      border: 1px solid #000; cursor: pointer; font-size: 11px;
    `;
    btn.onclick = handler;
    return btn;
  };
  
  // Copy dropdown (combined Text + JSON)
  const copyGroup = document.createElement('div');
  copyGroup.style.cssText = 'position: relative; display: inline-block;';
  
  const copyBtn = createBtn('Copy', () => {
    copyDropdown.style.display = copyDropdown.style.display === 'none' ? 'block' : 'none';
  });
  
  const copyDropdown = createCopyDropdown(track, getOrCreateJSON, processTrack, getUpdatedJSON);
  copyGroup.append(copyBtn, copyDropdown);
  
  // Download dropdown
  const downloadGroup = document.createElement('div');
  downloadGroup.style.cssText = 'position: relative; display: inline-block;';
  
  const downloadBtn = createBtn('Download', () => {
    downloadDropdown.style.display = downloadDropdown.style.display === 'none' ? 'block' : 'none';
  });
  downloadBtn.style.display = 'none';
  downloadBtn.classList.add('result-only');
  
  const downloadDropdown = createDownloadDropdown(getUpdatedJSON);
  downloadGroup.append(downloadBtn, downloadDropdown);
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!copyGroup.contains(e.target)) {
      copyDropdown.style.display = 'none';
    }
    if (!downloadGroup.contains(e.target)) {
      downloadDropdown.style.display = 'none';
    }
  });
  
  buttonsDiv.append(
    copyGroup,
    downloadGroup
  );
};

const showResultButtons = (exportSection) => {
  const resultButtons = exportSection.querySelectorAll('.result-only');
  resultButtons.forEach(btn => {
    btn.style.display = 'inline-block';
  });
};

const createCopyDropdown = (track, getOrCreateJSON, processTrack, getUpdatedJSON) => {
  const dropdown = document.createElement('div');
  dropdown.style.cssText = `
    display: none; position: absolute; top: 100%; left: 0; margin-top: 2px;
    background: white; border: 1px solid #000;
    box-shadow: 2px 2px 0 #000; z-index: 1000; min-width: 220px;
  `;
  
  const createItem = (text, handler, divider = false) => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px; cursor: pointer; font-size: 11px;
      border-bottom: 1px solid ${divider ? '#000' : '#ccc'};
    `;
    item.textContent = text;
    item.onmouseenter = () => item.style.background = '#f0f0f0';
    item.onmouseleave = () => item.style.background = 'white';
    item.onclick = async () => {
      await handler();
      dropdown.style.display = 'none';
    };
    return item;
  };
  
  dropdown.append(
    // Text section
    createItem('Source Text', async () => {
      const result = await processTrack(track);
      if (result) {
        copyToClipboard(result.content);
        console.log('Source text copied');
      }
    }, true), // divider after this
    
    // JSON section
    createItem('Source JSON (Original)', async () => {
      const sourceJSON = await getOrCreateJSON(track);
      if (sourceJSON) {
        copyToClipboard(formatJSON(sourceJSON));
        console.log('Source JSON copied');
      }
    }),
    createItem('Clean JSON', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(createCleanJSON(data)));
        console.log('Clean JSON copied');
      }
    }),
    createItem('Minimal JSON', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(createMinimalJSON(data)));
        console.log('Minimal JSON copied');
      }
    }),
    createItem('Structured JSON', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(createStructuredJSON(data)));
        console.log('Structured JSON copied');
      }
    }),
    createItem('Raw JSON (Full Debug)', () => {
      const data = getUpdatedJSON();
      if (data) {
        copyToClipboard(formatJSON(data));
        console.log('Raw JSON copied');
      }
    })
  );
  
  const lastItem = dropdown.lastElementChild;
  if (lastItem) lastItem.style.borderBottom = 'none';
  
  return dropdown;
};

const createDownloadDropdown = (getUpdatedJSON) => {
  const dropdown = document.createElement('div');
  dropdown.style.cssText = `
    display: none; position: absolute; top: 100%; left: 0; margin-top: 2px;
    background: white; border: 1px solid #000;
    box-shadow: 2px 2px 0 #000; z-index: 1000; min-width: 150px;
  `;
  
  const createItem = (text, handler) => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px; cursor: pointer; font-size: 11px;
      border-bottom: 1px solid #ccc;
    `;
    item.textContent = text;
    item.onmouseenter = () => item.style.background = '#f0f0f0';
    item.onmouseleave = () => item.style.background = 'white';
    item.onclick = () => {
      handler();
      dropdown.style.display = 'none';
    };
    return item;
  };
  
  dropdown.append(
    createItem('SRT', () => {
      const data = getUpdatedJSON();
      if (data) downloadSRT(data);
    }),
    createItem('VTT', () => {
      const data = getUpdatedJSON();
      if (data) downloadVTT(data);
    }),
    createItem('TXT', () => {
      const data = getUpdatedJSON();
      if (data) downloadTXT(data);
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

// Processing
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
  
  // Show result export buttons
  showResultButtons(exportSection);
  
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