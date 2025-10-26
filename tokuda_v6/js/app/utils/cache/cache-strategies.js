/**
 * Cache Eviction Strategies
 */

/**
 * LRU (Least Recently Used) Strategy
 */
export class LRUStrategy {
  constructor(cache, maxSize) {
    this.cache = cache;
    this.maxSize = maxSize;
    this.accessOrder = [];
  }
  
  onAccess(key) {
    // Move to end (most recent)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
  
  onSet(key, value) {
    this.onAccess(key);
  }
  
  onDelete(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
  
  evict() {
    // Remove least recently used (first in array)
    if (this.accessOrder.length > 0) {
      return this.accessOrder.shift();
    }
    return null;
  }
  
  onClear() {
    this.accessOrder = [];
  }
}

/**
 * FIFO (First In First Out) Strategy
 */
export class FIFOStrategy {
  constructor(cache, maxSize) {
    this.cache = cache;
    this.maxSize = maxSize;
    this.insertOrder = [];
  }
  
  onAccess(key) {
    // FIFO doesn't care about access
  }
  
  onSet(key, value) {
    if (!this.insertOrder.includes(key)) {
      this.insertOrder.push(key);
    }
  }
  
  onDelete(key) {
    const index = this.insertOrder.indexOf(key);
    if (index > -1) {
      this.insertOrder.splice(index, 1);
    }
  }
  
  evict() {
    // Remove first inserted
    if (this.insertOrder.length > 0) {
      return this.insertOrder.shift();
    }
    return null;
  }
  
  onClear() {
    this.insertOrder = [];
  }
}

/**
 * Size-based Strategy (simple threshold)
 */
export class SizeBasedStrategy {
  constructor(cache, maxSize) {
    this.cache = cache;
    this.maxSize = maxSize;
  }
  
  onAccess(key) {}
  onSet(key, value) {}
  onDelete(key) {}
  
  evict() {
    // Remove first key (arbitrary)
    const firstKey = this.cache.keys().next().value;
    return firstKey || null;
  }
  
  onClear() {}
}