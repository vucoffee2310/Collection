/**
 * Cache Manager
 * Generic cache with eviction strategies
 */

import { LRUStrategy, FIFOStrategy, SizeBasedStrategy } from './cache-strategies.js';

export class CacheManager {
  /**
   * Create cache manager
   * @param {Object} options - Cache options
   * @param {string} options.strategy - Eviction strategy ('lru', 'fifo', 'size')
   * @param {number} options.maxSize - Maximum cache size
   * @param {string} options.name - Cache name (for debugging)
   */
  constructor(options = {}) {
    const {
      strategy = 'lru',
      maxSize = 1000,
      name = 'default'
    } = options;
    
    this.name = name;
    this.maxSize = maxSize;
    this.cache = new Map();
    
    // Select eviction strategy
    switch (strategy) {
      case 'lru':
        this.strategy = new LRUStrategy(this.cache, maxSize);
        break;
      case 'fifo':
        this.strategy = new FIFOStrategy(this.cache, maxSize);
        break;
      case 'size':
        this.strategy = new SizeBasedStrategy(this.cache, maxSize);
        break;
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
    
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }
  
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined
   */
  get(key) {
    if (this.cache.has(key)) {
      this.stats.hits++;
      this.strategy.onAccess(key);
      return this.cache.get(key);
    }
    
    this.stats.misses++;
    return undefined;
  }
  
  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  set(key, value) {
    // Check if eviction needed
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      const evicted = this.strategy.evict();
      if (evicted) {
        this.cache.delete(evicted);
        this.stats.evictions++;
      }
    }
    
    this.cache.set(key, value);
    this.strategy.onSet(key, value);
  }
  
  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {boolean} - True if exists
   */
  has(key) {
    return this.cache.has(key);
  }
  
  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.strategy.onDelete(key);
    }
    return deleted;
  }
  
  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.strategy.onClear();
    this.stats.evictions += this.cache.size;
  }
  
  /**
   * Get cache size
   * @returns {number} - Number of cached items
   */
  size() {
    return this.cache.size;
  }
  
  /**
   * Get cache statistics
   * @returns {Object} - Stats object
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
  
  /**
   * Print cache stats
   */
  printStats() {
    console.log(`[Cache: ${this.name}]`, this.getStats());
  }
}