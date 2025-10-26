/**
 * Copy Menu Dropdown Component
 */

import { createElement } from '../../../utils/dom/query.js';
import { copyToClipboard } from '../../../utils/dom/clipboard.js';
import { formatJSON } from '../../../utils/formatting/json-formatter.js';
import {
  createCleanJSON,
  createMinimalJSON,
  createStructuredJSON,
  createCleanJSONWithGroups
} from '../../../export/json-formats.js';

/**
 * Create dropdown menu item
 * @param {Object} options - Item options
 * @returns {HTMLElement} - Menu item
 */
const createMenuItem = (options) => {
  const {
    text,
    onClick,
    divider = false
  } = options;
  
  const item = createElement('div', {
    style: {
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: '11px',
      borderBottom: divider ? '1px solid #000' : '1px solid #ccc'
    }
  }, text);
  
  item.onmouseenter = () => item.style.background = '#f0f0f0';
  item.onmouseleave = () => item.style.background = 'white';
  
  if (onClick) {
    item.onclick = async () => {
      await onClick();
      // Close dropdown after click
      const dropdown = item.closest('.dropdown-menu');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    };
  }
  
  return item;
};

/**
 * Create copy dropdown menu
 * @param {Object} handlers - Handler functions
 * @returns {HTMLElement} - Dropdown menu
 */
export const createCopyMenu = (handlers) => {
  const {
    getSourceText,
    getSourceJSON,
    getUpdatedJSON,
    getEvents
  } = handlers;
  
  const dropdown = createElement('div', {
    class: 'dropdown-menu',
    style: {
      display: 'none',
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: '2px',
      background: 'white',
      border: '1px solid #000',
      boxShadow: '2px 2px 0 #000',
      zIndex: 1000,
      minWidth: '220px'
    }
  });
  
  const items = [
    {
      text: 'Source Text',
      onClick: async () => {
        const text = await getSourceText();
        if (text) {
          await copyToClipboard(text);
          console.log('✅ Source text copied');
        }
      },
      divider: true
    },
    {
      text: 'Source JSON (Original)',
      onClick: async () => {
        const json = await getSourceJSON();
        if (json) {
          await copyToClipboard(formatJSON(json));
          console.log('✅ Source JSON copied');
        }
      }
    },
    {
      text: 'Clean JSON',
      onClick: async () => {
        const data = await getUpdatedJSON();
        if (data) {
          await copyToClipboard(formatJSON(createCleanJSON(data)));
          console.log('✅ Clean JSON copied');
        }
      }
    },
    {
      text: 'Clean JSON with Groups',
      onClick: async () => {
        const data = await getUpdatedJSON();
        const events = await getEvents();
        if (data) {
          await copyToClipboard(formatJSON(createCleanJSONWithGroups(data, events)));
          console.log('✅ Clean JSON with groups copied');
        }
      }
    },
    {
      text: 'Minimal JSON',
      onClick: async () => {
        const data = await getUpdatedJSON();
        if (data) {
          await copyToClipboard(formatJSON(createMinimalJSON(data)));
          console.log('✅ Minimal JSON copied');
        }
      }
    },
    {
      text: 'Structured JSON',
      onClick: async () => {
        const data = await getUpdatedJSON();
        if (data) {
          await copyToClipboard(formatJSON(createStructuredJSON(data)));
          console.log('✅ Structured JSON copied');
        }
      }
    },
    {
      text: 'Raw JSON (Full Debug)',
      onClick: async () => {
        const data = await getUpdatedJSON();
        if (data) {
          await copyToClipboard(formatJSON(data));
          console.log('✅ Raw JSON copied');
        }
      }
    }
  ];
  
  items.forEach((item, index) => {
    const menuItem = createMenuItem(item);
    // Remove border from last item
    if (index === items.length - 1) {
      menuItem.style.borderBottom = 'none';
    }
    dropdown.appendChild(menuItem);
  });
  
  return dropdown;
};

/**
 * Create copy button with dropdown
 * @param {Object} handlers - Handler functions
 * @returns {HTMLElement} - Button group
 */
export const createCopyButton = (handlers) => {
  const group = createElement('div', {
    style: {
      position: 'relative',
      display: 'inline-block'
    }
  });
  
  const button = createElement('button', {
    style: {
      padding: '6px 12px',
      background: '#000',
      color: 'white',
      border: '1px solid #000',
      cursor: 'pointer',
      fontSize: '11px'
    }
  }, 'Copy');
  
  const dropdown = createCopyMenu(handlers);
  
  button.onclick = (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  };
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!group.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
  
  group.append(button, dropdown);
  return group;
};