/**
 * Stats Display Component
 * Real-time statistics display
 */

import { createElement } from '../../../utils/dom/query.js';

/**
 * Create stat element
 * @param {string} value - Stat value
 * @param {string} label - Stat label
 * @param {string} color - Text color
 * @returns {Object} - { container, valueEl, labelEl }
 */
const createStatElement = (value, label, color = '#000') => {
  const container = createElement('div');
  
  const valueEl = createElement('div', {
    style: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: color
    }
  }, value);
  
  const labelEl = createElement('div', {
    style: {
      opacity: '0.9',
      fontSize: '12px'
    }
  }, label);
  
  container.append(valueEl, labelEl);
  
  return { container, valueEl, labelEl };
};

/**
 * Create stats display
 * @returns {Object} - { container, elements }
 */
export const createStatsDisplay = () => {
  const container = createElement('div', {
    id: 'statsDisplay',
    style: {
      display: 'none',
      background: 'white',
      color: '#000',
      padding: '12px',
      border: '1px solid #000',
      margin: '12px 0'
    }
  });
  
  const grid = createElement('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '10px',
      fontSize: '11px'
    }
  });
  
  const elements = {
    matched: createStatElement('0', 'Matched', '#000'),
    merged: createStatElement('0', 'Merged', '#000'),
    orphaned: createStatElement('0', 'Orphaned', '#000')
  };
  
  elements.matched.container.id = 'statsMatched';
  elements.merged.container.id = 'statsMerged';
  elements.orphaned.container.id = 'statsOrphaned';
  
  Object.values(elements).forEach(el => grid.appendChild(el.container));
  container.appendChild(grid);
  
  return { container, elements };
};

/**
 * Update stats display
 * @param {Object} elements - Stat elements
 * @param {Object} stats - Stats data
 */
export const updateStats = (elements, stats) => {
  if (!elements || !stats) return;
  
  requestAnimationFrame(() => {
    if (elements.matched) {
      elements.matched.valueEl.textContent = stats.matched || 0;
    }
    if (elements.merged) {
      elements.merged.valueEl.textContent = stats.merged || 0;
    }
    if (elements.orphaned) {
      elements.orphaned.valueEl.textContent = stats.orphaned || 0;
    }
  });
};

/**
 * Show stats display
 */
export const showStatsDisplay = () => {
  const container = document.getElementById('statsDisplay');
  if (container) {
    container.style.display = 'block';
  }
};

/**
 * Hide stats display
 */
export const hideStatsDisplay = () => {
  const container = document.getElementById('statsDisplay');
  if (container) {
    container.style.display = 'none';
  }
};