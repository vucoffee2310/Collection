/**
 * Download Menu Dropdown Component
 */

import { createElement } from '../../../utils/dom/query.js';
import { downloadSRT, downloadVTT, downloadTXT } from '../../../export/subtitle-formats.js';

/**
 * Create dropdown menu item
 * @param {Object} options - Item options
 * @returns {HTMLElement} - Menu item
 */
const createMenuItem = (options) => {
  const {
    text,
    onClick
  } = options;
  
  const item = createElement('div', {
    style: {
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: '11px',
      borderBottom: '1px solid #ccc'
    }
  }, text);
  
  item.onmouseenter = () => item.style.background = '#f0f0f0';
  item.onmouseleave = () => item.style.background = 'white';
  
  if (onClick) {
    item.onclick = () => {
      onClick();
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
 * Create download dropdown menu
 * @param {Function} getUpdatedJSON - Function to get updated JSON
 * @returns {HTMLElement} - Dropdown menu
 */
export const createDownloadMenu = (getUpdatedJSON) => {
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
      minWidth: '150px'
    }
  });
  
  const items = [
    {
      text: 'SRT',
      onClick: () => {
        const data = getUpdatedJSON();
        if (data) {
          downloadSRT(data);
          console.log('✅ Downloaded SRT');
        }
      }
    },
    {
      text: 'VTT',
      onClick: () => {
        const data = getUpdatedJSON();
        if (data) {
          downloadVTT(data);
          console.log('✅ Downloaded VTT');
        }
      }
    },
    {
      text: 'TXT',
      onClick: () => {
        const data = getUpdatedJSON();
        if (data) {
          downloadTXT(data);
          console.log('✅ Downloaded TXT');
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
 * Create download button with dropdown
 * @param {Function} getUpdatedJSON - Function to get updated JSON
 * @returns {HTMLElement} - Button group
 */
export const createDownloadButton = (getUpdatedJSON) => {
  const group = createElement('div', {
    style: {
      position: 'relative',
      display: 'inline-block'
    }
  });
  
  const button = createElement('button', {
    class: 'result-only',
    style: {
      padding: '6px 12px',
      background: '#000',
      color: 'white',
      border: '1px solid #000',
      cursor: 'pointer',
      fontSize: '11px',
      display: 'none'
    }
  }, 'Download');
  
  const dropdown = createDownloadMenu(getUpdatedJSON);
  
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

/**
 * Show result buttons (download button)
 */
export const showResultButtons = () => {
  const resultButtons = document.querySelectorAll('.result-only');
  resultButtons.forEach(btn => {
    btn.style.display = 'inline-block';
  });
};