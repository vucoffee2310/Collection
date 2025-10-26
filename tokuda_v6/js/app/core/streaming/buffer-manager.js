/**
 * Buffer Manager
 * Manages text buffer for streaming processing
 */

export class BufferManager {
  /**
   * Create buffer manager
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.maxSize = config.maxSize || 100000;
    this.keepSize = config.keepSize || 1000;
    this.buffer = '';
    this.pendingBuffer = '';
  }
  
  /**
   * Append chunk to buffer
   * @param {string} chunk - Text chunk
   * @returns {string} - Current buffer
   */
  append(chunk) {
    const newData = this.pendingBuffer + chunk;
    this.buffer += chunk;
    
    // Trim buffer if too large
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.keepSize);
    }
    
    return newData;
  }
  
  /**
   * Set pending buffer
   * @param {string} content - Content to set
   */
  setPending(content) {
    this.pendingBuffer = content;
  }
  
  /**
   * Clear pending buffer
   */
  clearPending() {
    this.pendingBuffer = '';
  }
  
  /**
   * Get current buffer
   * @returns {string} - Buffer content
   */
  getBuffer() {
    return this.buffer;
  }
  
  /**
   * Get pending buffer
   * @returns {string} - Pending content
   */
  getPending() {
    return this.pendingBuffer;
  }
  
  /**
   * Get buffer length
   * @returns {number} - Buffer length
   */
  getLength() {
    return this.buffer.length;
  }
  
  /**
   * Reset buffer
   */
  reset() {
    this.buffer = '';
    this.pendingBuffer = '';
  }
}