/**
 * Seeded Random Number Generator
 * Deterministic RNG for reproducible marker generation
 */

/**
 * Seeded Random Number Generator
 * Uses Linear Congruential Generator (LCG) algorithm
 */
export class SeededRandom {
  /**
   * Create seeded RNG
   * @param {number} seed - Initial seed value
   */
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
   * Generate next random number (0-1)
   * @returns {number} - Random number between 0 and 1
   */
  next() {
    // Linear Congruential Generator
    // Formula: seed = (a * seed + c) mod m
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  /**
   * Generate random integer in range [min, max]
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} - Random integer
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  /**
   * Generate random boolean
   * @param {number} probability - Probability of true (0-1)
   * @returns {boolean} - Random boolean
   */
  nextBoolean(probability = 0.5) {
    return this.next() < probability;
  }
  
  /**
   * Pick random element from array
   * @param {Array} arr - Array to pick from
   * @returns {*} - Random element
   */
  choice(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[this.nextInt(0, arr.length - 1)];
  }
  
  /**
   * Shuffle array (Fisher-Yates shuffle)
   * @param {Array} arr - Array to shuffle
   * @returns {Array} - Shuffled array (modifies in place)
   */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}