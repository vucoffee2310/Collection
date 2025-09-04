// modules/dom-finder.js: Functions to find platform-specific DOM elements

/**
 * Finds the chat input element on the current page.
 * @returns {HTMLElement|null} The found input element or null.
 */
function findInput() {
  const platform = AI_PLATFORMS[window.location.hostname];
  const selector = platform?.inputSelector || GENERAL_SELECTORS.input;
  return document.querySelector(selector);
}

/**
 * Finds the chat submit button on the current page.
 * @returns {HTMLElement|null} The found submit button or null.
 */
function findSubmitButton() {
  const platform = AI_PLATFORMS[window.location.hostname];
  const selector = platform?.submitSelector || GENERAL_SELECTORS.submit;
  return document.querySelector(selector);
}