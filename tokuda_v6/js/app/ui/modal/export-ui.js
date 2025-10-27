/**
 * Export UI - Clean dropdown-based export section
 */

import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { downloadSRT, downloadVTT, downloadTXT } from '../../export/subtitle-formats.js';

export const setupExportSection = (section, track, getOrCreateJSON, processTrack, getUpdatedJSON, getEvents) => {
  const buttonsDiv = section.querySelector('#exportButtons');
  
  // === COPY DROPDOWN ===
  const copyGroup = document.createElement('div');
  copyGroup.style.cssText = 'position: relative; display: inline-block;';
  
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy ▼';
  copyBtn.style.cssText = `
    padding: 8px 16px; 
    background: #000; 
    color: #fff;
    border: 1px solid #000; 
    cursor: pointer; 
    font-size: 12px;
    font-weight: bold;
  `;
  copyBtn.onmouseenter = () => copyBtn.style.background = '#333';
  copyBtn.onmouseleave = () => copyBtn.style.background = '#000';
  
  const copyDropdown = document.createElement('div');
  copyDropdown.style.cssText = `
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 2px;
    background: white;
    border: 1px solid #000;
    box-shadow: 2px 2px 0 #000;
    z-index: 1000;
    min-width: 200px;
  `;
  
  const createDropdownItem = (text, handler, showAfterProcessing = false) => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 10px 16px;
      cursor: pointer;
      font-size: 12px;
      border-bottom: 1px solid #ccc;
      color: #000;
    `;
    item.textContent = text;
    item.onmouseenter = () => item.style.background = '#f0f0f0';
    item.onmouseleave = () => item.style.background = 'white';
    item.onclick = async () => {
      await handler();
      copyDropdown.style.display = 'none';
    };
    
    if (showAfterProcessing) {
      item.classList.add('result-only');
      item.style.display = 'none';
    }
    
    return item;
  };
  
  const sourceTextItem = createDropdownItem('Source Text', async () => {
    const result = await processTrack(track);
    if (result) {
      copyToClipboard(result.content);
      console.log('✅ Source text copied');
      alert('Source text copied to clipboard!');
    }
  });
  
  const sourceJSONItem = createDropdownItem('Source JSON', async () => {
    const sourceJSON = await getOrCreateJSON(track);
    if (sourceJSON) {
      copyToClipboard(formatJSON(sourceJSON));
      console.log('✅ Source JSON copied');
      alert('Source JSON copied to clipboard!');
    }
  });
  
  const processedJSONItem = createDropdownItem('Processed JSON ⭐', () => {
    const data = getUpdatedJSON();
    if (data) {
      copyToClipboard(formatJSON(data));
      console.log('✅ Processed JSON copied');
      alert('Processed JSON copied to clipboard!');
    } else {
      alert('No processed data available. Please run translation first.');
    }
  }, true);
  
  copyDropdown.append(sourceTextItem, sourceJSONItem, processedJSONItem);
  
  // Remove border from last item
  processedJSONItem.style.borderBottom = 'none';
  
  copyBtn.onclick = () => {
    copyDropdown.style.display = copyDropdown.style.display === 'none' ? 'block' : 'none';
    downloadDropdown.style.display = 'none'; // Close other dropdown
  };
  
  copyGroup.append(copyBtn, copyDropdown);
  
  // === DOWNLOAD DROPDOWN ===
  const downloadGroup = document.createElement('div');
  downloadGroup.style.cssText = 'position: relative; display: inline-block;';
  
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download ▼';
  downloadBtn.style.cssText = `
    padding: 8px 16px; 
    background: #fff; 
    color: #000;
    border: 1px solid #000; 
    cursor: pointer; 
    font-size: 12px;
    font-weight: normal;
  `;
  downloadBtn.onmouseenter = () => downloadBtn.style.background = '#f0f0f0';
  downloadBtn.onmouseleave = () => downloadBtn.style.background = '#fff';
  downloadBtn.style.display = 'none';
  downloadBtn.classList.add('result-only');
  
  const downloadDropdown = document.createElement('div');
  downloadDropdown.style.cssText = `
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 2px;
    background: white;
    border: 1px solid #000;
    box-shadow: 2px 2px 0 #000;
    z-index: 1000;
    min-width: 150px;
  `;
  
  const srtItem = createDropdownItem('SRT Subtitle', () => {
    const data = getUpdatedJSON();
    if (data) {
      downloadSRT(data);
    } else {
      alert('No processed data available.');
    }
  });
  
  const vttItem = createDropdownItem('VTT Subtitle', () => {
    const data = getUpdatedJSON();
    if (data) {
      downloadVTT(data);
    } else {
      alert('No processed data available.');
    }
  });
  
  const txtItem = createDropdownItem('TXT Subtitle', () => {
    const data = getUpdatedJSON();
    if (data) {
      downloadTXT(data);
    } else {
      alert('No processed data available.');
    }
  });
  
  downloadDropdown.append(srtItem, vttItem, txtItem);
  
  // Remove border from last item
  txtItem.style.borderBottom = 'none';
  
  downloadBtn.onclick = () => {
    downloadDropdown.style.display = downloadDropdown.style.display === 'none' ? 'block' : 'none';
    copyDropdown.style.display = 'none'; // Close other dropdown
  };
  
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