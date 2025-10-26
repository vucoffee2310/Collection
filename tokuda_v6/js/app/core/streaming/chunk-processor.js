/**
 * Chunk Processor
 * Processes text chunks to extract markers
 */

export class ChunkProcessor {
  constructor() {
    this.markerPattern = /\(([a-z])\)\s*/g;
    this.nextMarkerPattern = /\(([a-z])\)/;
  }
  
  /**
   * Extract markers from buffered data
   * @param {string} data - Data to process
   * @param {Object} state - Current state
   * @returns {Object} - { markers, currentMarker, lastProcessedIndex }
   */
  extractMarkers(data, state = {}) {
    const { currentMarker = null, completedCount = 0 } = state;
    
    this.markerPattern.lastIndex = 0;
    
    const newMarkers = [];
    let lastProcessedIndex = 0;
    let updatedCurrentMarker = currentMarker;
    let match;
    
    while ((match = this.markerPattern.exec(data)) !== null) {
      const markerStart = match.index;
      const markerEnd = match.index + match[0].length;
      const letter = match[1];
      
      const remainingData = data.slice(markerEnd);
      const nextMarkerMatch = this.nextMarkerPattern.exec(remainingData);
      
      if (nextMarkerMatch) {
        // Complete marker found
        const content = remainingData.slice(0, nextMarkerMatch.index).trim();
        
        newMarkers.push({
          marker: `(${letter})`,
          letter,
          content,
          position: completedCount + newMarkers.length + 1
        });
        
        lastProcessedIndex = markerEnd;
        
        // Clear current marker if it's this one
        if (updatedCurrentMarker?.marker === `(${letter})`) {
          updatedCurrentMarker = null;
        }
      } else {
        // Incomplete marker (at end of chunk)
        const partialContent = remainingData.trim();
        
        if (updatedCurrentMarker?.marker === `(${letter})`) {
          // Update existing current marker
          updatedCurrentMarker.partialContent = partialContent;
        } else {
          // New current marker
          updatedCurrentMarker = {
            marker: `(${letter})`,
            letter,
            partialContent,
            position: completedCount + newMarkers.length + 1
          };
        }
        
        lastProcessedIndex = markerStart;
        break;
      }
    }
    
    return {
      markers: newMarkers,
      currentMarker: updatedCurrentMarker,
      lastProcessedIndex
    };
  }
  
  /**
   * Finalize current marker from buffer
   * @param {Object} currentMarker - Current marker
   * @param {string} buffer - Full buffer
   * @returns {Object|null} - Finalized marker or null
   */
  finalizeMarker(currentMarker, buffer) {
    if (!currentMarker) return null;
    
    const markerPattern = new RegExp(`\\(${currentMarker.letter}\\)`, 'g');
    let lastMatch = null;
    let match;
    
    while ((match = markerPattern.exec(buffer)) !== null) {
      lastMatch = match;
    }
    
    if (lastMatch) {
      const finalContent = buffer.slice(lastMatch.index + lastMatch[0].length).trim();
      return {
        ...currentMarker,
        content: finalContent
      };
    }
    
    return null;
  }
}