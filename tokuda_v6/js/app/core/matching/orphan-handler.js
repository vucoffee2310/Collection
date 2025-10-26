/**
 * Orphan Handler
 * Handles orphaned markers (no match found)
 */

/**
 * Orphan Handler class
 */
export class OrphanHandler {
  /**
   * Create orphan handler
   * @param {Object} sourceJSON - Source JSON
   * @param {Map} positionMap - Position to instance map
   */
  constructor(sourceJSON, positionMap) {
    this.sourceJSON = sourceJSON;
    this.positionMap = positionMap;
    this.lastMatchedPosition = 0;
    this.lastMatchedInstance = null;
    this.stats = {
      merged: 0,
      orphaned: 0
    };
  }
  
  /**
   * Check for orphans between positions
   * @param {number} beforePosition - Check orphans before this position
   * @param {Object} currentMatchedInstance - Currently matched instance (optional)
   */
  checkGaps(beforePosition, currentMatchedInstance = null) {
    const startPos = this.lastMatchedPosition + 1;
    const endPos = beforePosition - 1;
    
    if (startPos > endPos) return;
    
    console.log(`🔍 Checking #${startPos}-#${endPos} for orphans`);
    
    for (let pos = startPos; pos <= endPos; pos++) {
      const instance = this.positionMap.get(pos);
      
      if (instance && instance.status === "GAP") {
        if (!this.lastMatchedInstance && currentMatchedInstance) {
          this.mergeOrphanForward(instance, currentMatchedInstance);
        } else {
          this.mergeOrphanToPreceding(instance);
        }
      }
    }
  }
  
  /**
   * Merge orphan forward into next matched marker
   * @param {Object} orphanInstance - Orphan instance
   * @param {Object} targetInstance - Target instance
   */
  mergeOrphanForward(orphanInstance, targetInstance) {
    orphanInstance.status = "MERGED";
    orphanInstance.mergedInto = targetInstance.domainIndex;
    orphanInstance.mergeDirection = "FORWARD";
    this.stats.merged++;
    
    if (!targetInstance.mergedOrphans) {
      targetInstance.mergedOrphans = [];
    }
    
    targetInstance.mergedOrphans.unshift({
      domainIndex: orphanInstance.domainIndex,
      position: orphanInstance.position,
      content: orphanInstance.content,
      utterances: orphanInstance.utterances,
      contentLength: orphanInstance.contentLength,
      totalUtteranceWords: orphanInstance.totalUtteranceWords,
      mergeDirection: "FORWARD"
    });
    
    // Merge utterances
    if (orphanInstance.utteranceCount > 0) {
      if (!targetInstance.utterances) {
        targetInstance.utterances = [];
      }
      
      orphanInstance.utterances.forEach(utt => {
        utt._mergedFrom = orphanInstance.domainIndex;
      });
      
      targetInstance.utterances.unshift(...orphanInstance.utterances);
      targetInstance.utteranceCount = targetInstance.utterances.length;
    }
    
    console.log(`🔗 Forward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${targetInstance.domainIndex}`);
  }
  
  /**
   * Merge orphan backward into previous matched marker
   * @param {Object} orphanInstance - Orphan instance
   */
  mergeOrphanToPreceding(orphanInstance) {
    if (!this.lastMatchedInstance) {
      orphanInstance.status = "ORPHAN";
      this.stats.orphaned++;
      console.log(`⚠️ Orphan: ${orphanInstance.domainIndex} (#${orphanInstance.position})`);
      return;
    }
    
    orphanInstance.status = "MERGED";
    orphanInstance.mergedInto = this.lastMatchedInstance.domainIndex;
    orphanInstance.mergeDirection = "BACKWARD";
    this.stats.merged++;
    
    if (!this.lastMatchedInstance.mergedOrphans) {
      this.lastMatchedInstance.mergedOrphans = [];
    }
    
    this.lastMatchedInstance.mergedOrphans.push({
      domainIndex: orphanInstance.domainIndex,
      position: orphanInstance.position,
      content: orphanInstance.content,
      utterances: orphanInstance.utterances,
      contentLength: orphanInstance.contentLength,
      totalUtteranceWords: orphanInstance.totalUtteranceWords,
      mergeDirection: "BACKWARD"
    });
    
    // Merge utterances
    if (orphanInstance.utteranceCount > 0) {
      if (!this.lastMatchedInstance.utterances) {
        this.lastMatchedInstance.utterances = [];
      }
      
      orphanInstance.utterances.forEach(utt => {
        utt._mergedFrom = orphanInstance.domainIndex;
      });
      
      this.lastMatchedInstance.utterances.push(...orphanInstance.utterances);
      this.lastMatchedInstance.utteranceCount = this.lastMatchedInstance.utterances.length;
    }
    
    console.log(`🔗 Backward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${this.lastMatchedInstance.domainIndex}`);
  }
  
  /**
   * Process final gaps at end of stream
   * @param {number} totalMarkers - Total number of markers
   */
  processFinalGaps(totalMarkers) {
    this.checkGaps(totalMarkers + 1);
  }
  
  /**
   * Update last matched position and instance
   * @param {number} position - Position number
   * @param {Object} instance - Matched instance
   */
  updateLastMatched(position, instance) {
    this.lastMatchedPosition = position;
    this.lastMatchedInstance = instance;
  }
  
  /**
   * Get orphan statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return { ...this.stats };
  }
}