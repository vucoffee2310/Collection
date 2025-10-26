/**
 * Clipboard Utility
 * Copy text to clipboard with fallback
 */

/**
 * Copy text to clipboard
 * Uses modern Clipboard API with fallback
 * 
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (text) => {
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text for clipboard');
    return false;
  }
  
  // Try modern Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('✅ Copied to clipboard (Clipboard API)');
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, using fallback:', err);
    }
  }
  
  // Fallback: textarea method
  return copyToClipboardFallback(text);
};

/**
 * Fallback clipboard copy using textarea
 * @private
 */
const copyToClipboardFallback = (text) => {
  const textarea = document.createElement('textarea');
  
  // Style to be invisible and outside viewport
  Object.assign(textarea.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    opacity: '0',
    pointerEvents: 'none'
  });
  
  textarea.value = text;
  document.body.appendChild(textarea);
  
  try {
    // Select text
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    // Execute copy command
    const success = document.execCommand('copy');
    
    if (success) {
      console.log('✅ Copied to clipboard (execCommand fallback)');
    } else {
      console.error('❌ Copy failed');
    }
    
    return success;
  } catch (err) {
    console.error('❌ Copy error:', err);
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

/**
 * Read text from clipboard
 * @returns {Promise<string>} - Clipboard text
 */
export const readFromClipboard = async () => {
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    console.warn('Clipboard read not supported');
    return '';
  }
  
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    console.error('Failed to read clipboard:', err);
    return '';
  }
};