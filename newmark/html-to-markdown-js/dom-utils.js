// html-to-markdown-js/dom-utils.js
import { TagType } from './constants.js';

/**
 * Checks if a node is a block-level element.
 * @param {Node} node
 * @param {Converter} converter
 * @returns {boolean}
 */
export function isBlock(node, converter) {
  const tagType = converter.getTagType(node.nodeName.toLowerCase());
  return tagType === TagType.BLOCK;
}

/**
 * Checks if a node is a void element.
 * @param {Node} node
 * @returns {boolean}
 */
export function isVoid(node) {
  const voidElements = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
  return voidElements.test(node.nodeName);
}

/**
 * Checks if a node's content is pre-formatted.
 * @param {Node} node
 * @returns {boolean}
 */
export function isPreformatted(node) {
    const name = node.nodeName.toLowerCase();
    return name === 'pre' || name === 'code';
}

/**
 * Replaces any sequence of whitespace characters with a single space.
 * @param {string} text
 * @returns {string}
 */
function collapseWhitespace(text) {
  return text.replace(/[\t\r\n\s]+/g, ' ');
}

/**
 * Collapses whitespace in and around HTML elements, a port of the logic
 * from the original library's `collapse` package. It modifies the DOM in-place.
 * @param {Node} element
 * @param {Converter} converter
 */
export function collapse(element, converter) {
  if (!element.firstChild || isPreformatted(element)) {
    return;
  }

  let prevText = null;
  let keepLeadingWs = false;
  let currentNode = element.firstChild;

  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      let text = collapseWhitespace(currentNode.textContent);

      if ((!prevText || prevText.textContent.endsWith(' ')) && !keepLeadingWs && text.startsWith(' ')) {
        text = text.substring(1);
      }
      
      if (!text) {
        const toRemove = currentNode;
        currentNode = currentNode.nextSibling;
        toRemove.parentNode.removeChild(toRemove);
        continue;
      }

      currentNode.textContent = text;
      prevText = currentNode;
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      if (isBlock(currentNode, converter) || currentNode.nodeName === 'BR') {
        if (prevText) {
          prevText.textContent = prevText.textContent.replace(/ $/, '');
        }
        prevText = null;
        keepLeadingWs = false;
      } else if (isVoid(currentNode) || isPreformatted(currentNode)) {
        prevText = null;
        keepLeadingWs = true;
      } else if (prevText) {
        keepLeadingWs = false;
      }
    } else {
        const toRemove = currentNode;
        currentNode = currentNode.nextSibling;
        toRemove.parentNode.removeChild(toRemove);
        continue;
    }
    currentNode = currentNode.nextSibling;
  }

  if (prevText) {
    prevText.textContent = prevText.textContent.replace(/ $/, '');
    if (!prevText.textContent) {
      prevText.parentNode.removeChild(prevText);
    }
  }
}

/**
 * Returns true if the node has a blank line before it.
 * @param {Node} node
 * @returns {boolean}
 */
export function precededByBlankLine(node) {
    let previous = node.previousSibling;
    if (!previous) return false;

    if (previous.nodeType === Node.TEXT_NODE) {
        return /\n\s*\n/.test(previous.textContent);
    }
    return false;
}