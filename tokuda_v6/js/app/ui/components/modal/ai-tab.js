/**
 * AI Tab Component
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create AI streaming tab
 * @param {Function} onStreamClick - Callback for stream button
 * @returns {HTMLElement} - AI tab element
 */
export const createAITab = (onStreamClick) => {
  const container = createElement('div', {
    id: 'aiTab',
    style: {
      padding: '16px',
      background: '#f5f5f5',
      border: '1px solid #ccc',
      textAlign: 'center',
      display: 'none'
    }
  });
  
  const info = createElement('div', {
    style: {
      marginBottom: '12px',
      color: '#000',
      fontSize: '12px'
    }
  }, 'Send markers to AI and process translation in real-time');
  
  const streamBtn = createElement('button', {
    id: 'aiTabStreamBtn',
    style: {
      padding: '10px 24px',
      background: '#000',
      color: 'white',
      border: '1px solid #000',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold'
    }
  }, 'Send to AI & Process');
  
  if (onStreamClick) {
    streamBtn.onclick = onStreamClick;
  }
  
  container.append(info, streamBtn);
  return container;
};

/**
 * Update AI button state
 * @param {string} text - Button text
 * @param {boolean} disabled - Disabled state
 */
export const updateAIButtonState = (text, disabled = false) => {
  const btn = document.getElementById('aiTabStreamBtn');
  if (btn) {
    btn.textContent = text;
    btn.disabled = disabled;
  }
};