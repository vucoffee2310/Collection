/**
 * Clean JSON export - removes redundant data and restructures for clarity
 */

export const createCleanJSON = (rawJSON) => {
  const markers = [];
  const stats = {
    matched: 0,
    merged: 0,
    orphaned: 0,
    total: 0
  };
  
  // Flatten and clean markers
  Object.entries(rawJSON.markers || {}).forEach(([markerKey, instances]) => {
    instances.forEach(instance => {
      stats.total++;
      
      // Count by status
      if (instance.status === 'MATCHED') stats.matched++;
      else if (instance.status === 'MERGED') stats.merged++;
      else if (instance.status === 'ORPHAN') stats.orphaned++;
      
      // Create clean marker object
      const cleanMarker = {
        id: instance.domainIndex,
        letter: instance.domainIndex.match(/\(([a-z])-\d+\)/)?.[1] || markerKey.replace(/[()]/g, ''),
        position: instance.position,
        status: instance.status
      };
      
      // Add content (original)
      if (instance.content) {
        cleanMarker.original = instance.content;
      }
      
      // Add translation (only for MATCHED)
      if (instance.status === 'MATCHED' && instance.overallTranslation) {
        cleanMarker.translation = instance.overallTranslation;
        cleanMarker.matchMethod = instance.matchMethod;
      }
      
      // Add merge info
      if (instance.status === 'MERGED') {
        cleanMarker.mergedInto = instance.mergedInto;
        cleanMarker.mergeDirection = instance.mergeDirection;
      }
      
      // Add merged orphans info (for MATCHED markers that absorbed orphans)
      if (instance.mergedOrphans && instance.mergedOrphans.length > 0) {
        cleanMarker.merged = instance.mergedOrphans.map(orphan => ({
          id: orphan.domainIndex,
          position: orphan.position,
          direction: orphan.mergeDirection
        }));
      }
      
      // Add utterances (cleaned)
      if (instance.utterances && instance.utterances.length > 0) {
        cleanMarker.utterances = instance.utterances.map(utt => {
          const cleanUtt = {
            index: utt.index,
            text: utt.utterance,
            start: utt.start,
            end: utt.end
          };
          
          // Add translation if exists
          if (utt.elementTranslation) {
            cleanUtt.translation = utt.elementTranslation;
          }
          
          // Add timestamp (SRT format by default)
          if (utt.timestamp) {
            cleanUtt.timestamp = utt.timestamp;
          }
          
          // Add merge source if applicable
          if (utt.mergedSource) {
            cleanUtt.mergedFrom = utt.mergedSource;
          }
          
          return cleanUtt;
        });
      }
      
      markers.push(cleanMarker);
    });
  });
  
  // Sort by position
  markers.sort((a, b) => a.position - b.position);
  
  // Build clean structure
  return {
    version: '1.0',
    totalMarkers: stats.total,
    stats: stats,
    markers: markers
  };
};

/**
 * Create minimal JSON - only translated utterances for subtitle export
 */
export const createMinimalJSON = (rawJSON) => {
  const utterances = [];
  
  Object.values(rawJSON.markers || {}).forEach(instances => {
    instances.forEach(instance => {
      if (instance.status === 'MATCHED' && instance.utterances) {
        instance.utterances.forEach(utt => {
          if (utt.elementTranslation) {
            utterances.push({
              index: utt.index,
              original: utt.utterance,
              translation: utt.elementTranslation,
              start: utt.start,
              end: utt.end,
              timestamp: utt.timestamp
            });
          }
        });
      }
    });
  });
  
  // Sort by index
  utterances.sort((a, b) => a.index - b.index);
  
  return {
    version: '1.0',
    totalUtterances: utterances.length,
    utterances: utterances
  };
};

/**
 * Create structured JSON - grouped by status for analysis
 */
export const createStructuredJSON = (rawJSON) => {
  const matched = [];
  const merged = [];
  const orphaned = [];
  
  Object.entries(rawJSON.markers || {}).forEach(([markerKey, instances]) => {
    instances.forEach(instance => {
      const marker = {
        id: instance.domainIndex,
        position: instance.position,
        original: instance.content
      };
      
      if (instance.status === 'MATCHED') {
        marker.translation = instance.overallTranslation;
        marker.method = instance.matchMethod;
        marker.utteranceCount = instance.utterances?.length || 0;
        
        if (instance.mergedOrphans?.length > 0) {
          marker.absorbedOrphans = instance.mergedOrphans.map(o => o.domainIndex);
        }
        
        matched.push(marker);
      } else if (instance.status === 'MERGED') {
        marker.mergedInto = instance.mergedInto;
        marker.direction = instance.mergeDirection;
        merged.push(marker);
      } else if (instance.status === 'ORPHAN') {
        marker.reason = 'No preceding match found';
        orphaned.push(marker);
      }
    });
  });
  
  return {
    version: '1.0',
    summary: {
      total: matched.length + merged.length + orphaned.length,
      matched: matched.length,
      merged: merged.length,
      orphaned: orphaned.length,
      successRate: ((matched.length + merged.length) / (matched.length + merged.length + orphaned.length) * 100).toFixed(2) + '%'
    },
    matched: matched,
    merged: merged,
    orphaned: orphaned
  };
};