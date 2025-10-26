/**
 * Modal Header Component
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create modal header
 * @param {Object} options - Header options
 * @returns {HTMLElement} - Header element
 */
export const createModalHeader = (options = {}) => {
  const {
    title = 'Translation Stream Processor',
    onClose = null
  } = options;
  
  const header = createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      borderBottom: '2px solid #000',
      paddingBottom: '10px'
    }
  });
  
  const titleEl = createElement('h2', {
    style: {
      margin: 0,
      color: '#000',
      fontSize: '16px'
    }
  }, title);
  
  const closeBtn = createElement('button', {
    id: 'streamModalCloseBtn',
    style: {
      background: 'none',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
      color: '#000'
    }
  }, 'X');
  
  if (onClose) {
    closeBtn.onclick = onClose;
  }
  
  header.append(titleEl, closeBtn);
  return header;
};