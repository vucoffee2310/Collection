/**
 * Context Matcher
 * Matches translation markers with source markers using context
 */

import { buildSourceContextCache, buildMarkerContext, compareContexts } from './context-builder.js';

/**
 * Context Matcher class
 */
export class ContextMatcher {
  /**
   * Create context matcher
   * @param {Object} sourceJSON - Source JSON with markers
   */
  constructor(sourceJSON) {
    this.sourceJSON = sourceJSON;
    
    // Build position map
    this.positionMap = new Map();
    if (sourceJSON._meta?.positionMap) {
      this.positionMap = new Map(sourceJSON._meta.positionMap);
    } else {
      Object.values(sourceJSON.markers || {}).forEach(instances => {
        instances.forEach(instance => {
          this.positionMap.set(instance.position, instance);
        });
      });
    }
    
    // Build context cache
    this.contextCache = buildSourceContextCache(sourceJSON);
    
    // Build unmatched map
    this.unmatchedMap = new Map();
    this.rebuildUnmatchedMap();
  }
  
  /**
   * Rebuild unmatched markers map
   */
  rebuildUnmatchedMap() {
    this.unmatchedMap.clear();
    
    Object.entries(this.sourceJSON.markers || {}).forEach(([markerKey, instances]) => {
      const unmatched = instances.filter(inst =>
        inst.status !== "MATCHED" &&
        inst.status !== "ORPHAN" &&
        inst.status !== "MERGED"
      );
      
      if (unmatched.length > 0) {
        this.unmatchedMap.set(markerKey, unmatched);
      }
    });
  }
  
  /**
   * Match translation marker with source
   * @param {Object} transMarker - Translation marker object
   * @param {Array<Object>} completedMarkers - Previously completed markers
   * @returns {Object} - Match result
   */
  match(transMarker, completedMarkers) {
    const markerKey = transMarker.marker;
    const unmatchedInstances = this.unmatchedMap.get(markerKey);
    
    if (!unmatchedInstances || unmatchedInstances.length === 0) {
      return {
        matched: false,
        reason: 'no_unmatched_instances',
        sourcePosition: null,
        instance: null
      };
    }
    
    // Build context for translation marker
    const transContext = buildMarkerContext(completedMarkers, transMarker.position);
    
    // Try to match with each unmatched instance
    for (const sourceInstance of unmatchedInstances) {
      const sourceContext = this.contextCache.get(sourceInstance.domainIndex);
      
      if (!sourceContext) continue;
      
      // Add instance data to source context
      const fullSourceContext = {
        ...sourceInstance,
        ...sourceContext
      };
      
      const matchResult = compareContexts(transContext, fullSourceContext);
      
      if (matchResult.matched) {
        // Remove from unmatched
        const remaining = unmatchedInstances.filter(inst => inst !== sourceInstance);
        if (remaining.length > 0) {
          this.unmatchedMap.set(markerKey, remaining);
        } else {
          this.unmatchedMap.delete(markerKey);
        }
        
        return {
          matched: true,
          method: matchResult.method,
          sourcePosition: sourceInstance.position,
          instance: sourceInstance
        };
      }
    }
    
    return {
      matched: false,
      reason: 'no_context_match',
      sourcePosition: null,
      instance: null
    };
  }
  
  /**
   * Get instance by position
   * @param {number} position - Position number
   * @returns {Object|null} - Instance or null
   */
  getInstanceByPosition(position) {
    return this.positionMap.get(position) || null;
  }
}