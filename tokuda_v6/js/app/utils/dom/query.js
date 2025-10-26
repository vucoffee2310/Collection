/**
 * DOM Query Utility
 * Shorthand query selectors
 */

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @param {Element} root - Root element (default: document)
 * @returns {Element|null} - First matching element
 */
export const $ = (selector, root = document) => {
  return root.querySelector(selector);
};

/**
 * Query all selector shorthand
 * @param {string} selector - CSS selector
 * @param {Element} root - Root element (default: document)
 * @returns {Array<Element>} - Array of matching elements
 */
export const $$ = (selector, root = document) => {
  return Array.from(root.querySelectorAll(selector));
};

/**
 * Get element by ID
 * @param {string} id - Element ID
 * @returns {Element|null} - Element or null
 */
export const $id = (id) => {
  return document.getElementById(id);
};

/**
 * Create element with attributes
 * @param {string} tag - Tag name
 * @param {Object} attrs - Attributes object
 * @param {Array|string} children - Child elements or text
 * @returns {Element} - Created element
 * 
 * @example
 * createElement('div', { class: 'card', id: 'card1' }, 'Hello')
 */
export const createElement = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  
  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.substring(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  });
  
  // Append children
  if (typeof children === 'string') {
    el.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Element) {
        el.appendChild(child);
      }
    });
  }
  
  return el;
};