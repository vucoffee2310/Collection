/**
 * Manual Tab Component
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create manual input tab
 * @returns {HTMLElement} - Manual tab element
 */
export const createManualTab = () => {
  const container = createElement('div', {
    id: 'manualTab'
  });
  
  const info = createElement('div', {
    style: {
      marginBottom: '10px',
      color: '#666',
      fontSize: '11px'
    }
  }, 'Paste translated text below and click "Start Processing" to match with source markers.');
  
  const textarea = createElement('textarea', {
    id: 'manualTabTextarea',
    placeholder: 'Paste complete translation here...',
    style: {
      width: '100%',
      height: '100px',
      padding: '10px',
      border: '1px solid #000',
      fontFamily: 'monospace',
      fontSize: '12px',
      resize: 'vertical'
    }
  });
  
  container.append(info, textarea);
  return container;
};

/**
 * Get manual tab text
 * @returns {string} - Text from textarea
 */
export const getManualTabText = () => {
  const textarea = document.getElementById('manualTabTextarea');
  return textarea ? textarea.value.trim() : '';
};

/**
 * Clear manual tab
 */
export const clearManualTab = () => {
  const textarea = document.getElementById('manualTabTextarea');
  if (textarea) {
    textarea.value = '';
  }
};