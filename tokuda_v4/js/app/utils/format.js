/**
 * JSON Formatting Utilities
 * Pretty-print JSON with custom formatting rules
 */

/**
 * Format JSON with custom indentation and array handling
 * @param {Object} obj - Object to format
 * @param {number} indent - Number of spaces for indentation
 * @returns {string} - Formatted JSON string
 */
export const formatJSON = (obj, indent = 2) => {
  const sp = ' '.repeat(indent);
  const isArrOfArr = arr => Array.isArray(arr) && arr.length && arr.every(Array.isArray);
  const isArrOfObj = arr => arr.every(v => v?.constructor === Object);
  
  const fmt = (val, depth) => {
    const ind = sp.repeat(depth);
    const nxt = sp.repeat(depth + 1);
    
    if (val === null) return 'null';
    if (typeof val !== 'object') return JSON.stringify(val);
    
    if (Array.isArray(val)) {
      if (!val.length) return '[]';
      if (isArrOfArr(val)) return `[\n${val.map(v => nxt + JSON.stringify(v)).join(',\n')}\n${ind}]`;
      if (isArrOfObj(val)) return `[\n${val.map(v => nxt + fmt(v, depth + 1)).join(',\n')}\n${ind}]`;
      return JSON.stringify(val);
    }
    
    const entries = Object.entries(val).map(([k, v]) => `${nxt}"${k}": ${fmt(v, depth + 1)}`);
    return `{\n${entries.join(',\n')}\n${ind}}`;
  };
  
  return fmt(obj, 0);
};