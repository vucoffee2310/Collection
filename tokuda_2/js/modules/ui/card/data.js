export const calculateStats = (json) => {
  const matched = [];
  const orphaned = [];
  const merged = [];
  
  Object.entries(json.markers).forEach(([markerKey, instances]) => {
    instances.forEach(instance => {
      if (instance.status === 'MATCHED') {
        matched.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          translation: instance.overallTranslation,
          method: instance.matchMethod || 'unknown',
          position: instance.position,
          // ✅ Use pre-calculated context strings
          contextStrings: instance.contextStrings || {},
          prev5: instance.prev5,
          prev4: instance.prev4,
          prev3: instance.prev3,
          prev2: instance.prev2,
          prev1: instance.prev1,
          prev0: instance.prev0,
          mergedOrphans: instance.mergedOrphans || [],
          utterances: instance.utterances || [],
          instance: instance
        });
      } else if (instance.status === 'ORPHAN') {
        orphaned.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          position: instance.position,
          contextStrings: instance.contextStrings || {},
          prev5: instance.prev5,
          prev4: instance.prev4,
          prev3: instance.prev3,
          prev2: instance.prev2,
          prev1: instance.prev1,
          prev0: instance.prev0,
          utterances: instance.utterances || [],
          instance: instance
        });
      } else if (instance.status === 'MERGED') {
        merged.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          position: instance.position,
          mergedInto: instance.mergedInto,
          utterances: instance.utterances || [],
          instance: instance
        });
      }
    });
  });
  
  return { matched, orphaned, merged, total: json.totalMarkers };
};

export const getCombinedOriginalContent = (item) => {
  let combined = item.original || '';
  
  if (item.mergedOrphans && item.mergedOrphans.length > 0) {
    const mergedContents = item.mergedOrphans.map(orphan => orphan.content || '').filter(c => c.trim());
    if (mergedContents.length > 0) {
      combined += ' ' + mergedContents.join(' ');
    }
  }
  
  return combined.trim();
};

export const getCombinedTranslationBreakdown = (item) => {
  if (!item.utterances || item.utterances.length === 0) {
    return { combined: item.translation || '', hasBreakdown: false };
  }
  
  const matchedUtts = item.utterances.filter(u => !u.mergedSource);
  const mergedGroups = new Map();
  
  if (item.mergedOrphans && item.mergedOrphans.length > 0) {
    item.mergedOrphans.forEach(orphan => {
      const orphanUtts = item.utterances.filter(u => u.mergedSource === orphan.domainIndex);
      if (orphanUtts.length > 0) {
        mergedGroups.set(orphan.domainIndex, orphanUtts);
      }
    });
  }
  
  const hasBreakdown = mergedGroups.size > 0;
  
  const matchedTranslation = matchedUtts
    .map(u => u.elementTranslation || '')
    .filter(t => t.trim())
    .join(' ');
  
  const mergedTranslations = [];
  mergedGroups.forEach((utts, domainIndex) => {
    const translation = utts
      .map(u => u.elementTranslation || '')
      .filter(t => t.trim())
      .join(' ');
    if (translation.trim()) {
      mergedTranslations.push({ domainIndex, translation });
    }
  });
  
  const allParts = [matchedTranslation, ...mergedTranslations.map(m => m.translation)]
    .filter(t => t.trim());
  const combined = allParts.join(' ');
  
  return {
    combined,
    hasBreakdown,
    matchedTranslation,
    mergedTranslations
  };
};

// ✅ SIMPLIFIED: Use pre-calculated context strings
export const getContextForMethod = (item) => {
  const method = item.method;
  const contextStrings = item.contextStrings || {};
  
  // Direct lookup from pre-calculated strings
  if (contextStrings[method]) {
    return contextStrings[method];
  }
  
  // Fallback for edge cases
  if (method?.startsWith('edge_case_')) {
    const prevKey = method.replace('edge_case_', '');
    return contextStrings[prevKey] || null;
  }
  
  return null;
};

export const getExpectedContext = (item) => {
  const contextStrings = item.contextStrings || {};
  
  // Return first available context
  if (contextStrings.prev5) return `prev5: ${contextStrings.prev5}`;
  if (contextStrings.prev4) return `prev4: ${contextStrings.prev4}`;
  if (contextStrings.prev3) return `prev3: ${contextStrings.prev3}`;
  if (contextStrings.prev2) return `prev2: ${contextStrings.prev2}`;
  if (contextStrings.prev1) return `prev1: ${contextStrings.prev1}`;
  if (contextStrings.prev0 !== undefined) return `prev0: ${contextStrings.prev0}`;
  
  return null;
};

export const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};