/**
 * Modal Container Component
 * Creates the main modal structure
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create modal container
 * @returns {HTMLElement} - Modal element
 */
export const createModalContainer = () => {
  const modal = createElement('div', {
    id: 'streamModal',
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.7)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  });
  
  return modal;
};

/**
 * Create modal panel
 * @returns {HTMLElement} - Panel element
 */
export const createModalPanel = () => {
  const panel = createElement('div', {
    id: 'streamModalPanel',
    style: {
      background: 'white',
      padding: '20px',
      border: '2px solid #000',
      maxWidth: '1000px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto'
    }
  });
  
  return panel;
};

/**
 * Assemble complete modal
 * @param {Array<HTMLElement>} sections - Modal sections
 * @returns {HTMLElement} - Complete modal
 */
export const assembleModal = (sections) => {
  const modal = createModalContainer();
  const panel = createModalPanel();
  
  sections.forEach(section => {
    if (section) {
      panel.appendChild(section);
    }
  });
  
  modal.appendChild(panel);
  return modal;
};