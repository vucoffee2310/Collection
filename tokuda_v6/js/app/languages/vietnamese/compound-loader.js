/**
 * Vietnamese Compound Data Loader
 * Loads and manages compound word dictionary
 */

/**
 * Compound data storage
 * Format: { "root": ["suffix1", "suffix2", ...] }
 */
let compoundData = null;

/**
 * Trie structure for efficient lookup
 * Format: { "root": Set(["suffix1", "suffix2", ...]) }
 */
let compoundTrie = null;

/**
 * Loading state
 */
let isLoading = false;
let loadPromise = null;

/**
 * Load compound word data from JSON file
 * @returns {Promise<Object>} - Compound data object
 */
export const loadCompoundData = async () => {
  // Return cached data
  if (compoundData) {
    return compoundData;
  }
  
  // Wait for existing load operation
  if (isLoading && loadPromise) {
    return loadPromise;
  }
  
  // Start loading
  isLoading = true;
  loadPromise = performLoad();
  
  try {
    await loadPromise;
    return compoundData;
  } finally {
    isLoading = false;
    loadPromise = null;
  }
};

/**
 * Perform actual data loading
 * @private
 */
const performLoad = async () => {
  try {
    const response = await fetch(chrome.runtime.getURL('data.json'));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }
    
    compoundData = data;
    compoundTrie = buildTrie(data);
    
    console.log('✅ Loaded Vietnamese compound data:', {
      roots: Object.keys(data).length,
      totalCompounds: Object.values(data).reduce((sum, arr) => sum + arr.length, 0)
    });
    
    return compoundData;
  } catch (error) {
    console.error('❌ Failed to load compound data:', error);
    
    // Set empty data to prevent repeated load attempts
    compoundData = {};
    compoundTrie = {};
    
    throw error;
  }
};

/**
 * Build trie structure from compound data
 * @param {Object} data - Raw compound data
 * @returns {Object} - Trie structure
 */
const buildTrie = (data) => {
  const trie = {};
  
  Object.entries(data).forEach(([root, suffixes]) => {
    // Normalize root and suffixes to NFC
    const normalizedRoot = root.normalize('NFC').toLowerCase();
    const normalizedSuffixes = suffixes.map(s => s.normalize('NFC').toLowerCase());
    
    trie[normalizedRoot] = new Set(normalizedSuffixes);
  });
  
  return trie;
};

/**
 * Get compound trie (for matcher)
 * @returns {Object|null} - Trie structure or null if not loaded
 */
export const getCompoundTrie = () => {
  return compoundTrie;
};

/**
 * Get raw compound data
 * @returns {Object|null} - Compound data or null if not loaded
 */
export const getCompoundData = () => {
  return compoundData;
};

/**
 * Check if data is loaded
 * @returns {boolean} - True if loaded
 */
export const isDataLoaded = () => {
  return compoundData !== null;
};

/**
 * Get suffixes for a root word
 * @param {string} root - Root word
 * @returns {Set<string>|null} - Set of suffixes or null
 */
export const getSuffixes = (root) => {
  if (!compoundTrie) {
    return null;
  }
  
  const normalized = root.normalize('NFC').toLowerCase();
  return compoundTrie[normalized] || null;
};

/**
 * Get data statistics
 * @returns {Object} - Statistics
 */
export const getDataStats = () => {
  if (!compoundData) {
    return { loaded: false };
  }
  
  const roots = Object.keys(compoundData);
  const totalSuffixes = Object.values(compoundData).reduce(
    (sum, arr) => sum + arr.length, 
    0
  );
  
  return {
    loaded: true,
    roots: roots.length,
    totalSuffixes,
    avgSuffixesPerRoot: (totalSuffixes / roots.length).toFixed(2),
    sampleRoots: roots.slice(0, 5)
  };
};

/**
 * Reload compound data (for testing/debugging)
 */
export const reloadCompoundData = async () => {
  compoundData = null;
  compoundTrie = null;
  return loadCompoundData();
};