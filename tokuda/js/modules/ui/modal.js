import { copyToClipboard } from '../utils.js';
import { formatJSON } from '../format.js';
import { simulateSSEStream } from '../stream.js';
import { CONFIG } from '../config.js';
import { createStatElement } from './helpers.js';
import { downloadSRT, downloadVTT, downloadTXT } from './export.js';

export const createStreamModal = (track, getOrCreateJSON) => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  const panel = document.createElement('div');
  panel.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 1200px;
    width: 95%;
    max-height: 90vh;
    overflow-y: auto;
  `;
  
  const title = document.createElement('h2');
  title.textContent = '🌊 SSE Stream Simulation';
  title.style.cssText = 'margin-top: 0; color: #333;';
  
  const textarea = document.createElement('textarea');
  textarea.style.cssText = `
    width: 100%;
    height: 150px;
    font-family: monospace;
    font-size: 13px;
    padding: 10px;
    border: 2px solid #ccc;
    border-radius: 4px;
    margin: 10px 0;
    resize: vertical;
  `;
  textarea.placeholder = 'Paste translation text to simulate streaming...\nExample: (a) translated text (b) more text...';
  
  const streamDisplay = createStreamDisplay();
  const statsDisplay = createStatsDisplay();
  const eventsLog = createEventsLog();
  const exportContainer = createExportContainer();
  const buttonContainer = createButtonContainer();
  
  let updatedJSONData = null;
  
  const { startBtn, cancelBtn } = createControlButtons(
    textarea,
    streamDisplay,
    statsDisplay,
    eventsLog,
    exportContainer,
    track,
    getOrCreateJSON,
    (data) => { updatedJSONData = data; }
  );
  
  setupExportButtons(exportContainer, () => updatedJSONData);
  
  buttonContainer.append(cancelBtn, startBtn);
  panel.append(title, textarea, streamDisplay, statsDisplay.container, eventsLog, exportContainer, buttonContainer);
  modal.append(panel);
  
  cancelBtn.onclick = () => modal.remove();
  
  return modal;
};

const createStreamDisplay = () => {
  const div = document.createElement('div');
  div.style.cssText = `
    display: none;
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 15px;
    border-radius: 4px;
    margin: 10px 0;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  `;
  return div;
};

const createStatsDisplay = () => {
  const container = document.createElement('div');
  container.style.cssText = `
    display: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin: 10px 0;
    font-family: monospace;
    font-size: 13px;
  `;
  
  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;';
  
  const elements = {
    chunks: createStatElement('0/0', 'Chunks (0%)'),
    matched: createStatElement('0', 'Matched', '#4ade80'),
    orphaned: createStatElement('0', 'Orphaned', '#f87171'),
    processed: createStatElement('0', 'Processed'),
    total: createStatElement('0', 'Total Source'),
    buffer: createStatElement('0', 'Buffer Size')
  };
  
  Object.values(elements).forEach(el => grid.appendChild(el.container));
  
  const progressBar = document.createElement('div');
  progressBar.style.cssText = 'margin-top: 10px; background: rgba(255,255,255,0.2); border-radius: 4px; height: 8px; overflow: hidden;';
  const progressFill = document.createElement('div');
  progressFill.style.cssText = 'background: #4ade80; height: 100%; width: 0%; transition: width 0.3s;';
  progressBar.appendChild(progressFill);
  
  container.appendChild(grid);
  container.appendChild(progressBar);
  
  return { container, elements, progressFill };
};

const createEventsLog = () => {
  const div = document.createElement('div');
  div.style.cssText = `
    display: none;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    padding: 15px;
    border-radius: 4px;
    margin: 10px 0;
    max-height: 300px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 11px;
  `;
  return div;
};

const createExportContainer = () => {
  const container = document.createElement('div');
  container.style.cssText = `
    display: none;
    margin: 15px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 2px solid #28a745;
  `;
  
  const title = document.createElement('div');
  title.textContent = '📥 Export Results';
  title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: #333; font-size: 14px;';
  
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';
  buttons.id = 'exportButtons';
  
  container.append(title, buttons);
  return container;
};

const createButtonContainer = () => {
  const div = document.createElement('div');
  div.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;';
  return div;
};

const createExportBtn = (text, icon, handler) => {
  const btn = document.createElement('button');
  btn.textContent = `${icon} ${text}`;
  btn.style.cssText = `
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    transition: background 0.2s;
  `;
  btn.onmouseenter = () => btn.style.background = '#218838';
  btn.onmouseleave = () => btn.style.background = '#28a745';
  btn.onclick = handler;
  return btn;
};

const setupExportButtons = (exportContainer, getUpdatedJSON) => {
  const buttonsDiv = exportContainer.querySelector('#exportButtons');
  
  const copyJSONBtn = createExportBtn('Copy JSON', '📋', () => {
    const data = getUpdatedJSON();
    if (data) {
      const formatted = formatJSON(data);
      copyToClipboard(formatted);
      copyJSONBtn.textContent = '✓ Copied!';
      setTimeout(() => copyJSONBtn.textContent = '📋 Copy JSON', 2000);
    }
  });
  
  const saveSRTBtn = createExportBtn('Save as SRT', '💾', () => {
    const data = getUpdatedJSON();
    if (data) {
      downloadSRT(data);
      saveSRTBtn.textContent = '✓ Saved!';
      setTimeout(() => saveSRTBtn.textContent = '💾 Save as SRT', 2000);
    }
  });
  
  const saveVTTBtn = createExportBtn('Save as VTT', '💾', () => {
    const data = getUpdatedJSON();
    if (data) {
      downloadVTT(data);
      saveVTTBtn.textContent = '✓ Saved!';
      setTimeout(() => saveVTTBtn.textContent = '💾 Save as VTT', 2000);
    }
  });
  
  const saveTXTBtn = createExportBtn('Save as TXT', '💾', () => {
    const data = getUpdatedJSON();
    if (data) {
      downloadTXT(data);
      saveTXTBtn.textContent = '✓ Saved!';
      setTimeout(() => saveTXTBtn.textContent = '💾 Save as TXT', 2000);
    }
  });
  
  buttonsDiv.append(copyJSONBtn, saveSRTBtn, saveVTTBtn, saveTXTBtn);
};

const createControlButtons = (
  textarea,
  streamDisplay,
  statsDisplay,
  eventsLog,
  exportContainer,
  track,
  getOrCreateJSON,
  setUpdatedJSON
) => {
  const startBtn = document.createElement('button');
  startBtn.textContent = '▶ Start Stream';
  startBtn.style.cssText = `
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    transition: transform 0.2s;
  `;
  startBtn.onmouseenter = () => startBtn.style.transform = 'scale(1.05)';
  startBtn.onmouseleave = () => startBtn.style.transform = 'scale(1)';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕ Close';
  cancelBtn.style.cssText = `
    padding: 12px 24px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  startBtn.onclick = async () => {
    const translationText = textarea.value.trim();
    if (!translationText) {
      alert('⚠️ Please paste translation text');
      return;
    }
    
    textarea.disabled = true;
    startBtn.disabled = true;
    startBtn.textContent = '⏳ Streaming...';
    startBtn.style.background = '#6c757d';
    
    streamDisplay.style.display = 'block';
    statsDisplay.container.style.display = 'block';
    eventsLog.style.display = 'block';
    
    streamDisplay.textContent = '';
    
    const sourceJSON = await getOrCreateJSON(track);
    if (!sourceJSON) return;
    
    console.log('\n' + '='.repeat(80));
    console.log('🌊 SSE STREAM SIMULATION STARTED');
    console.log('='.repeat(80) + '\n');
    
    let lastEventCount = 0;
    
    const updatedJSON = await simulateSSEStream(translationText, sourceJSON, (progress) => {
      updateStreamDisplay(streamDisplay, progress);
      updateStats(statsDisplay, progress);
      updateEvents(eventsLog, progress, lastEventCount);
      lastEventCount = progress.events?.length || 0;
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SSE STREAM COMPLETED');
    console.log('='.repeat(80) + '\n');
    
    setUpdatedJSON(updatedJSON);
    
    const formatted = formatJSON(updatedJSON);
    copyToClipboard(formatted);
    console.log('📋 Final JSON:\n', formatted);
    
    addCompletionMessage(eventsLog);
    exportContainer.style.display = 'block';
    
    startBtn.textContent = '✓ Done';
    startBtn.style.background = '#28a745';
    cancelBtn.textContent = 'Close';
  };
  
  return { startBtn, cancelBtn };
};

const updateStreamDisplay = (display, progress) => {
  if (display.firstChild?.nodeType === 3) {
    display.firstChild.textContent = progress.bufferLength > 500 
      ? `...${progress.bufferLength - 500} chars hidden...\n` 
      : '';
  } else {
    display.textContent = progress.bufferLength > 500 
      ? `...${progress.bufferLength - 500} chars hidden...\n` 
      : '';
  }
  display.scrollTop = display.scrollHeight;
};

const updateStats = (statsDisplay, progress) => {
  const percentage = progress.completed 
    ? 100 
    : ((progress.chunkIndex / progress.totalChunks) * 100).toFixed(1);
  
  const { elements, progressFill } = statsDisplay;
  
  elements.chunks.valueEl.textContent = `${progress.chunkIndex}/${progress.totalChunks}`;
  elements.chunks.labelEl.textContent = `Chunks (${percentage}%)`;
  elements.matched.valueEl.textContent = `✓ ${progress.stats.matched}`;
  elements.orphaned.valueEl.textContent = `✗ ${progress.stats.orphaned}`;
  elements.processed.valueEl.textContent = progress.stats.processed;
  elements.total.valueEl.textContent = progress.stats.total;
  elements.buffer.valueEl.textContent = progress.bufferLength;
  progressFill.style.width = `${percentage}%`;
};

const updateEvents = (eventsLog, progress, lastEventCount) => {
  if (!progress.events || progress.events.length <= lastEventCount) return;
  
  const newEvents = progress.events.slice(lastEventCount).filter(e => e.type === 'marker_completed');
  const fragment = document.createDocumentFragment();
  
  newEvents.forEach(event => {
    const eventDiv = createEventElement(event);
    fragment.appendChild(eventDiv);
  });
  
  eventsLog.appendChild(fragment);
  
  while (eventsLog.children.length > CONFIG.MAX_EVENT_LOG_ITEMS) {
    eventsLog.removeChild(eventsLog.firstChild);
  }
  
  eventsLog.scrollTop = eventsLog.scrollHeight;
};

const createEventElement = (event) => {
  const eventDiv = document.createElement('div');
  const statusColor = event.matched ? '#28a745' : '#dc3545';
  const statusIcon = event.matched ? '✅' : '❌';
  
  eventDiv.style.cssText = `margin: 5px 0; padding: 8px; border-left: 3px solid ${statusColor}; background: white; border-radius: 3px;`;
  
  const markerSpan = document.createElement('span');
  markerSpan.style.cssText = `color: ${statusColor}; font-weight: bold;`;
  markerSpan.textContent = `${statusIcon} MARKER ${event.marker}`;
  
  const posSpan = document.createElement('span');
  posSpan.style.cssText = 'color: #6c757d; margin-left: 10px;';
  posSpan.textContent = `Position: ${event.position}`;
  
  const methodSpan = document.createElement('span');
  methodSpan.style.cssText = event.matched ? 'color: #28a745; margin-left: 10px;' : 'color: #dc3545; margin-left: 10px;';
  methodSpan.textContent = event.matched ? `Method: ${event.method}` : `Reason: ${event.reason}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.style.cssText = 'color: #495057; margin-top: 3px; font-size: 10px;';
  contentDiv.textContent = `"${event.content}"`;
  
  eventDiv.append(markerSpan, posSpan, methodSpan, contentDiv);
  return eventDiv;
};

const addCompletionMessage = (eventsLog) => {
  const eventDiv = document.createElement('div');
  eventDiv.style.cssText = 'margin: 10px 0; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; font-weight: bold; text-align: center;';
  eventDiv.innerHTML = `
    🎉 STREAM COMPLETED!<br>
    <span style="font-size: 12px; opacity: 0.9;">Updated JSON copied to clipboard</span>
  `;
  eventsLog.appendChild(eventDiv);
  eventsLog.scrollTop = eventsLog.scrollHeight;
};