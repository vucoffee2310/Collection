/**
 * Modal Footer Component
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create footer button
 * @param {Object} options - Button options
 * @returns {HTMLElement} - Button element
 */
const createFooterButton = (options) => {
  const {
    id,
    text,
    primary = false,
    onClick = null
  } = options;
  
  const btn = createElement('button', {
    id,
    style: {
      padding: '8px 20px',
      background: primary ? '#000' : 'white',
      color: primary ? 'white' : '#000',
      border: '1px solid #000',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: primary ? 'bold' : 'normal'
    }
  }, text);
  
  if (onClick) {
    btn.onclick = onClick;
  }
  
  return btn;
};

/**
 * Create modal footer
 * @param {Array<Object>} buttons - Button definitions
 * @returns {HTMLElement} - Footer element
 */
export const createModalFooter = (buttons) => {
  const footer = createElement('div', {
    style: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
      marginTop: '16px',
      paddingTop: '12px',
      borderTop: '1px solid #ccc'
    }
  });
  
  const buttonElements = buttons.map(btn => createFooterButton(btn));
  footer.append(...buttonElements);
  
  return footer;
};