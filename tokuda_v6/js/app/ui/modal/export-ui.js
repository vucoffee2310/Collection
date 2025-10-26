/**
 * Export UI - Export section and dropdowns
 */

import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { downloadSRT, downloadVTT, downloadTXT } from '../../export/subtitle-formats.js';
import { createCleanJSON, createMinimalJSON, createStructuredJSON, createCleanJSONWithGroups } from '../../export/json-formats.js';

export const setupExportSection = (section, track, getOrCreateJSON, processTrack, getUpdatedJSON, getEvents) => {
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
  
  // Copy dropdown
  const copyGroup = document.createElement('div');
  copyGroup.style.cssText = 'position: relative; display: inline-block;';
  
  const copyBtn = createBtn('Copy', () => {
    copyDropdown.style.display = copyDropdown.style.display === 'none' ? 'block' : 'none';
  });
  
  const copyDropdown = createCopyDropdown(track, getOrCreateJSON, processTrack, getUpdatedJSON, getEvents);
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
  
  buttonsDiv.append(copyGroup, downloadGroup);
};

export const showResultButtons = (exportSection) => {
  const resultButtons = exportSection.querySelectorAll('.result-only');
  resultButtons.forEach(btn => {
    btn.style.display = 'inline-block';
  });
};

const createCopyDropdown = (track, getOrCreateJSON, processTrack, getUpdatedJSON, getEvents) => {
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
    createItem('Source Text', async () => {
      const result = await processTrack(track);
      if (result) {
        copyToClipboard(result.content);
        console.log('Source text copied');
      }
    }, true),
    
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
    createItem('Clean JSON with Groups', () => {
      const data = getUpdatedJSON();
      const events = getEvents();
      if (data) {
        copyToClipboard(formatJSON(createCleanJSONWithGroups(data, events)));
        console.log('Clean JSON with groups copied');
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