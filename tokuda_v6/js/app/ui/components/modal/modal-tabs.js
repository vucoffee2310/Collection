/**
 * Modal Tabs Component
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create tab button
 * @param {Object} options - Tab options
 * @returns {HTMLElement} - Tab button
 */
const createTabButton = (options) => {
  const {
    id,
    text,
    active = false,
    onClick = null
  } = options;
  
  const btn = createElement('button', {
    id,
    style: {
      padding: '10px 20px',
      background: active ? '#000' : 'white',
      border: '1px solid #000',
      borderBottom: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 'bold',
      color: active ? '#fff' : '#000',
      marginBottom: '-1px'
    }
  }, text);
  
  if (onClick) {
    btn.onclick = onClick;
  }
  
  return btn;
};

/**
 * Create tabs container
 * @param {Array<Object>} tabs - Tab definitions
 * @returns {HTMLElement} - Tabs container
 */
export const createModalTabs = (tabs) => {
  const container = createElement('div', {
    style: {
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid #000',
      marginBottom: '16px'
    }
  });
  
  const buttons = tabs.map(tab => createTabButton(tab));
  container.append(...buttons);
  
  return container;
};

/**
 * Setup tab switching
 * @param {Object} options - Tab switching options
 */
export const setupTabSwitching = (options) => {
  const {
    manualTabBtn,
    aiTabBtn,
    manualTab,
    aiTab,
    startBtn
  } = options;
  
  manualTabBtn.onclick = () => {
    manualTabBtn.style.background = '#000';
    manualTabBtn.style.color = '#fff';
    aiTabBtn.style.background = 'white';
    aiTabBtn.style.color = '#000';
    manualTab.style.display = 'block';
    aiTab.style.display = 'none';
    startBtn.style.display = 'inline-block';
  };
  
  aiTabBtn.onclick = () => {
    aiTabBtn.style.background = '#000';
    aiTabBtn.style.color = '#fff';
    manualTabBtn.style.background = 'white';
    manualTabBtn.style.color = '#000';
    manualTab.style.display = 'none';
    aiTab.style.display = 'block';
    startBtn.style.display = 'none';
  };
};