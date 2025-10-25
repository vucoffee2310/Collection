export const formatJSON = (obj, indent = 2) => {
  const sp = ' '.repeat(indent);
  const isArrOfArr = arr => Array.isArray(arr) && arr.length && arr.every(Array.isArray);
  const isArrOfObj = arr => arr.every(v => v?.constructor === Object);
  
  const fmt = (val, d) => {
    const ind = sp.repeat(d), nxt = sp.repeat(d + 1);
    
    if (val === null) return 'null';
    if (typeof val !== 'object') return JSON.stringify(val);
    
    if (Array.isArray(val)) {
      if (!val.length) return '[]';
      if (isArrOfArr(val)) return `[\n${val.map(v => nxt + JSON.stringify(v)).join(',\n')}\n${ind}]`;
      if (isArrOfObj(val)) return `[\n${val.map(v => nxt + fmt(v, d + 1)).join(',\n')}\n${ind}]`;
      return JSON.stringify(val);
    }
    
    const entries = Object.entries(val).map(([k, v]) => `${nxt}"${k}": ${fmt(v, d + 1)}`);
    return `{\n${entries.join(',\n')}\n${ind}}`;
  };
  
  return fmt(obj, 0);
};