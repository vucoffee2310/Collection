/**
 * Results Data Processing
 * Calculate statistics and process data for results card
 */

/**
 * Calculate statistics from processed JSON
 * @param {Object} json - Processed JSON data
 * @returns {Object} - Statistics object
 */
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
          mergedOrphans: instance.mergedOrphans || [],
          utterances: instance.utterances || []
        });
      } else if (instance.status === 'ORPHAN') {
        orphaned.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          position: instance.position,
          utterances: instance.utterances || []
        });
      } else if (instance.status === 'MERGED') {
        merged.push({
          marker: markerKey,
          domainIndex: instance.domainIndex,
          original: instance.content,
          position: instance.position,
          mergedInto: instance.mergedInto,
          utterances: instance.utterances || []
        });
      }
    });
  });
  
  return { 
    matched, 
    orphaned, 
    merged, 
    total: json.totalMarkers 
  };

};
