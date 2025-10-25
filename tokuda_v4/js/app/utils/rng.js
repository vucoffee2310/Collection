/**
 * Seeded Random Number Generator
 * Deterministic RNG for reproducible marker generation
 */

export class SeededRandom {
  constructor(seed) { 
    this.seed = seed; 
  }
  
  /**
   * Reset seed to new value
   * @param {number} seed - New seed value
   */
  reset(seed) { 
    this.seed = seed; 
  }
  
  /**
   * Generate next random number between 0 and 1
   * @returns {number} - Random number
   */
  next() { 
    return (this.seed = (this.seed * 9301 + 49297) % 233280) / 233280; 
  }
  
  /**
   * Generate random integer in range
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} - Random integer
   */
  nextInt(min, max) { 
    return Math.floor(this.next() * (max - min + 1)) + min; 
  }
}