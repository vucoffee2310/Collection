/**
 * Export Controller
 * Manages export functionality
 */

import { createElement } from '../../../utils/dom/query.js';
import { createCopyButton } from '../components/dropdowns/copy-menu.js';
import { createDownloadButton } from '../components/dropdowns/download-menu.js';

/**
 * Create export section
 * @param {Object} handlers - Export handlers
 * @returns {HTMLElement} - Export section
 */
export const createExportSection = (handlers) => {
  const {
    getSourceText,
    getSourceJSON,
    getUpdatedJSON,
    getEvents
  } = handlers;
  
  const section = createElement('div', {
    id: 'exportSection',
    style: {
      display: 'block',
      padding: '12px',
      background: '#f5f5f5',
      border: '1px solid #ccc',
      margin: '12px 0'
    }
  });
  
  const title = createElement('div', {
    style: {
      fontWeight: 'bold',
      color: '#000',
      marginBottom: '10px',
      fontSize: '12px'
    }
  }, 'Export Options');
  
  const buttons = createElement('div', {
    id: 'exportButtons',
    style: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap'
    }
  });
  
  // Copy button
  const copyButton = createCopyButton({
    getSourceText,
    getSourceJSON,
    getUpdatedJSON,
    getEvents
  });
  
  // Download button
  const downloadButton = createDownloadButton(getUpdatedJSON);
  
  buttons.append(copyButton, downloadButton);
  section.append(title, buttons);
  
  return section;
};