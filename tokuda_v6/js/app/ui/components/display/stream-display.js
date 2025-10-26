/**
 * Stream Display Component
 * Shows real-time streaming log
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create stream display
 * @returns {HTMLElement} - Stream display element
 */
export const createStreamDisplay = () => {
  const div = createElement('div', {
    id: 'streamDisplay',
    style: {
      display: 'none',
      background: '#f5f5f5',
      color: '#000',
      padding: '10px',
      border: '1px solid #ccc',
      margin: '12px 0',
      fontFamily: 'monospace',
      fontSize: '10px',
      maxHeight: '120px',
      overflowY: 'auto'
    }
  });
  
  return div;
};

/**
 * Append message to stream display
 * @param {string} message - Message to append
 */
export const appendStreamMessage = (message) => {
  const display = document.getElementById('streamDisplay');
  if (!display) return;
  
  const line = createElement('div', {
    style: {
      marginBottom: '2px'
    }
  }, message);
  
  display.appendChild(line);
  
  // Auto-scroll to bottom
  display.scrollTop = display.scrollHeight;
  
  // Limit number of lines
  const maxLines = 100;
  const lines = display.children;
  if (lines.length > maxLines) {
    display.removeChild(lines[0]);
  }
};

/**
 * Clear stream display
 */
export const clearStreamDisplay = () => {
  const display = document.getElementById('streamDisplay');
  if (display) {
    display.innerHTML = '';
  }
};

/**
 * Show stream display
 */
export const showStreamDisplay = () => {
  const display = document.getElementById('streamDisplay');
  if (display) {
    display.style.display = 'block';
  }
};

/**
 * Hide stream display
 */
export const hideStreamDisplay = () => {
  const display = document.getElementById('streamDisplay');
  if (display) {
    display.style.display = 'none';
  }
};