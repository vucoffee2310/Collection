/**
 * Combinatorics Utility
 * Generates combinations of array elements
 * Used for context matching (prev5Choose4, prev5Choose3, etc.)
 */

/**
 * Generate all combinations of size k from array
 * @param {Array} arr - Source array
 * @param {number} size - Combination size
 * @returns {Array<Array>} - Array of combinations
 * 
 * @example
 * combinations(['a', 'b', 'c'], 2)
 * // => [['a', 'b'], ['a', 'c'], ['b', 'c']]
 */
export const combinations = (arr, size) => {
  // Validation
  if (!Array.isArray(arr)) {
    throw new TypeError('First argument must be an array');
  }
  
  if (!Number.isInteger(size) || size < 0) {
    throw new TypeError('Size must be a non-negative integer');
  }
  
  // Edge cases
  if (size > arr.length || arr.length === 0) {
    return [];
  }
  
  if (size === arr.length) {
    return [arr];
  }
  
  if (size === 0) {
    return [[]];
  }
  
  if (size === 1) {
    return arr.map(x => [x]);
  }
  
  // Backtracking algorithm
  const result = [];
  
  const backtrack = (start, combo) => {
    // Base case: combination complete
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    
    // Recursive case
    const remaining = size - combo.length;
    const end = arr.length - remaining;
    
    for (let i = start; i <= end; i++) {
      combo.push(arr[i]);
      backtrack(i + 1, combo);
      combo.pop();
    }
  };
  
  backtrack(0, []);
  return result;
};

/**
 * Count total combinations (nCr) without generating them
 * @param {number} n - Total items
 * @param {number} r - Items to choose
 * @returns {number} - Number of combinations
 */
export const countCombinations = (n, r) => {
  if (r > n || r < 0) return 0;
  if (r === 0 || r === n) return 1;
  
  // Optimize by using smaller r
  r = Math.min(r, n - r);
  
  let result = 1;
  for (let i = 0; i < r; i++) {
    result *= (n - i);
    result /= (i + 1);
  }
  
  return Math.round(result);
};