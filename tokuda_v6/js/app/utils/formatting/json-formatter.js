/**
 * JSON Formatter Utility
 * Custom JSON formatting with intelligent array handling
 */

/**
 * Format JSON with custom indentation and array optimization
 * 
 * @param {*} obj - Object to format
 * @param {number} indent - Spaces per indent level (default: 2)
 * @returns {string} - Formatted JSON string
 * 
 * @example
 * formatJSON({ name: "John", tags: ["a", "b"] }, 2)
 * // Pretty-printed JSON with optimized arrays
 */
export const formatJSON = (obj, indent = 2) => {
  const spacer = ' '.repeat(indent);
  
  const isArrayOfArrays = (arr) => {
    return Array.isArray(arr) && 
           arr.length > 0 && 
           arr.every(item => Array.isArray(item));
  };
  
  const isArrayOfObjects = (arr) => {
    return Array.isArray(arr) && 
           arr.length > 0 && 
           arr.every(item => item?.constructor === Object);
  };
  
  const format = (value, depth) => {
    const currentIndent = spacer.repeat(depth);
    const nextIndent = spacer.repeat(depth + 1);
    
    // Null
    if (value === null) {
      return 'null';
    }
    
    // Primitives
    if (typeof value !== 'object') {
      return JSON.stringify(value);
    }
    
    // Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      
      // Array of arrays: inline each sub-array
      if (isArrayOfArrays(value)) {
        const items = value.map(v => JSON.stringify(v));
        return `[\n${items.map(i => nextIndent + i).join(',\n')}\n${currentIndent}]`;
      }
      
      // Array of objects: format each object
      if (isArrayOfObjects(value)) {
        const items = value.map(v => format(v, depth + 1));
        return `[\n${items.map(i => nextIndent + i).join(',\n')}\n${currentIndent}]`;
      }
      
      // Array of primitives: inline
      return JSON.stringify(value);
    }
    
    // Objects
    const entries = Object.entries(value).map(([key, val]) => {
      return `${nextIndent}"${key}": ${format(val, depth + 1)}`;
    });
    
    return `{\n${entries.join(',\n')}\n${currentIndent}}`;
  };
  
  return format(obj, 0);
};

/**
 * Minify JSON (remove whitespace)
 * @param {*} obj - Object to minify
 * @returns {string} - Minified JSON
 */
export const minifyJSON = (obj) => {
  return JSON.stringify(obj);
};

/**
 * Parse JSON safely with error handling
 * @param {string} jsonString - JSON string
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} - Parsed object or default value
 */
export const safeJSONParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn('JSON parse failed:', err.message);
    return defaultValue;
  }
};

/**
 * Deep clone object via JSON serialization
 * @param {*} obj - Object to clone
 * @returns {*} - Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};