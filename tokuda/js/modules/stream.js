import { splitTranslationByWordRatio } from './utils.js';

export class StreamingTranslationProcessor {
  constructor(sourceJSON) {
    this.sourceJSON = sourceJSON;
    this.buffer = '';
    this.completedMarkers = [];
    this.currentMarker = null;
    this.stats = { matched: 0, orphaned: 0, total: 0, processed: 0 };
    this.events = [];
    
    this.unmatchedMap = new Map();
    this.rebuildUnmatchedMap();
    
    this.sourcePrevCache = new Map();
    this.prebuildSourcePrevCache();
    
    // ✅ OPTIMIZATION: Track processing state for incremental scanning
    this.processedUpTo = 0;      // Character position fully processed
    this.pendingBuffer = '';     // Incomplete marker from previous chunk
    this.maxBufferSize = 100000; // Trim buffer if exceeds this
    this.bufferKeepSize = 1000;  // Keep this many chars when trimming
  }

  rebuildUnmatchedMap() {
    this.unmatchedMap.clear();
    Object.entries(this.sourceJSON.markers).forEach(([markerKey, instances]) => {
      const unmatched = instances.filter(inst => inst.status !== "MATCHED");
      if (unmatched.length > 0) {
        this.unmatchedMap.set(markerKey, unmatched);
      }
    });
  }

  prebuildSourcePrevCache() {
    this.sourcePrevCache.clear();
    Object.values(this.sourceJSON.markers).forEach(instances => {
      instances.forEach(instance => {
        const cacheKey = `${instance.domainIndex}`;
        this.sourcePrevCache.set(cacheKey, {
          prev5: instance.prev5 ? JSON.stringify(instance.prev5) : null,
          prev4: instance.prev4 ? JSON.stringify(instance.prev4) : null,
          prev3: instance.prev3 ? JSON.stringify(instance.prev3) : null,
          prev5Choose4: instance.prev5Choose4?.map(c => JSON.stringify(c)) || [],
          prev5Choose3: instance.prev5Choose3?.map(c => JSON.stringify(c)) || [],
          prev4Choose3: instance.prev4Choose3?.map(c => JSON.stringify(c)) || []
        });
      });
    });
  }

  processChunk(chunk) {
    // ✅ OPTIMIZATION: Only work with new data + pending from last chunk
    const newData = this.pendingBuffer + chunk;
    this.buffer += chunk;
    
    // ✅ OPTIMIZATION: Trim buffer if too large to prevent memory bloat
    if (this.buffer.length > this.maxBufferSize) {
      const trimmed = this.buffer.length - this.bufferKeepSize;
      this.buffer = `...[${trimmed} chars trimmed]...` + this.buffer.slice(-this.bufferKeepSize);
    }
    
    const markerPattern = /\(([a-z])\)/g;
    let match;
    const newMarkers = [];
    let lastProcessedIndex = 0;
    
    // ✅ OPTIMIZATION: Scan only newData (not entire buffer)
    while ((match = markerPattern.exec(newData)) !== null) {
      const markerStart = match.index;
      const markerEnd = match.index + match[0].length;
      const letter = match[1];
      
      // Look for next marker in newData
      const remainingData = newData.slice(markerEnd);
      const nextMarkerMatch = /\(([a-z])\)/.exec(remainingData);
      
      if (nextMarkerMatch) {
        // ✅ Complete marker found - we have both start and end
        const content = remainingData.slice(0, nextMarkerMatch.index).trim();
        newMarkers.push({
          marker: `(${letter})`,
          letter,
          content,
          position: this.completedMarkers.length + newMarkers.length + 1
        });
        
        lastProcessedIndex = markerEnd;
        
        // Clear current marker if it was waiting
        if (this.currentMarker?.marker === `(${letter})`) {
          this.currentMarker = null;
        }
      } else {
        // ✅ Incomplete marker - might get completed in next chunk
        const partialContent = remainingData.trim();
        
        // Update or create current marker
        if (this.currentMarker?.marker === `(${letter})`) {
          // Update existing marker with more content
          this.currentMarker.partialContent = partialContent;
        } else {
          // New incomplete marker
          this.currentMarker = {
            marker: `(${letter})`,
            letter,
            partialContent,
            position: this.completedMarkers.length + newMarkers.length + 1
          };
        }
        
        // ✅ Save unprocessed part for next chunk (marker + content so far)
        this.pendingBuffer = newData.slice(markerStart);
        lastProcessedIndex = markerStart;
        break;
      }
    }
    
    // ✅ If we processed everything, clear pending buffer
    if (lastProcessedIndex > 0 && !this.currentMarker) {
      this.pendingBuffer = '';
    } else if (!match) {
      // No markers found in this chunk
      // Keep a small tail in case marker is split across boundary
      const keepTail = Math.min(10, newData.length);
      this.pendingBuffer = newData.slice(-keepTail);
    }
    
    // Update processed position
    this.processedUpTo += lastProcessedIndex;
    
    // Process newly completed markers
    newMarkers.forEach(marker => {
      this.completedMarkers.push(marker);
      const matchResult = this.matchAndUpdate(marker);
      
      this.events.push({
        type: 'marker_completed',
        marker: marker.marker,
        content: marker.content.substring(0, 50) + (marker.content.length > 50 ? '...' : ''),
        position: marker.position,
        matched: matchResult.matched,
        method: matchResult.method,
        reason: matchResult.reason
      });
    });
    
    return {
      newMarkers,
      currentMarker: this.currentMarker,
      stats: this.stats,
      bufferLength: this.buffer.length
    };
  }

  finalize() {
    // ✅ Process any remaining incomplete marker
    if (this.currentMarker) {
      // Extract final content from full buffer
      const markerPattern = new RegExp(`\\(${this.currentMarker.letter}\\)`, 'g');
      let lastMatch = null;
      let match;
      
      // Find the last occurrence of this marker in buffer
      while ((match = markerPattern.exec(this.buffer)) !== null) {
        lastMatch = match;
      }
      
      if (lastMatch) {
        const finalContent = this.buffer.slice(lastMatch.index + lastMatch[0].length).trim();
        this.currentMarker.content = finalContent;
        this.completedMarkers.push(this.currentMarker);
        
        const matchResult = this.matchAndUpdate(this.currentMarker);
        
        this.events.push({
          type: 'marker_completed',
          marker: this.currentMarker.marker,
          content: this.currentMarker.content.substring(0, 50) + (this.currentMarker.content.length > 50 ? '...' : ''),
          position: this.currentMarker.position,
          matched: matchResult.matched,
          method: matchResult.method,
          reason: matchResult.reason
        });
      }
      
      this.currentMarker = null;
    }
    
    // Mark remaining GAP instances as ORPHAN
    Object.values(this.sourceJSON.markers).forEach(instances => {
      instances.forEach(instance => {
        if (instance.status === "GAP") {
          instance.status = "ORPHAN";
          this.stats.orphaned++;
        }
      });
    });
    
    console.log('\n🏁 Stream finalized');
    console.log(`📊 Final Stats:`, this.stats);
    console.log(`   ✅ Matched: ${this.stats.matched}`);
    console.log(`   ❌ Orphaned: ${this.stats.orphaned}`);
    console.log(`   📍 Total processed: ${this.stats.processed}`);
    console.log(`   📦 Total source: ${this.stats.total}`);
  }

  matchAndUpdate(transMarker) {
    this.stats.processed++;
    
    // Build prev arrays for matching
    const getPrev = (count) => {
      const pos = this.completedMarkers.length - 1;
      if (pos < count) return null;
      return this.completedMarkers.slice(pos - count, pos).map(m => m.marker);
    };
    
    const trans = {
      marker: transMarker.marker,
      letter: transMarker.letter,
      content: transMarker.content,
      position: transMarker.position
    };
    
    const markerIndex = trans.position - 1;
    if (markerIndex < 3) {
      for (let j = 0; j <= markerIndex; j++) {
        trans[`prev${j}`] = getPrev(j);
      }
    } else {
      trans.prev5 = getPrev(5);
      trans.prev4 = getPrev(4);
      trans.prev3 = getPrev(3);
    }
    
    // Use unmatched map instead of full source
    const markerKey = trans.marker;
    const unmatchedInstances = this.unmatchedMap.get(markerKey);
    
    if (!unmatchedInstances || unmatchedInstances.length === 0) {
      return { matched: false, reason: 'no_unmatched_instances' };
    }
    
    // ✅ Count total source markers (only once per unique source)
    if (!this.stats.total) {
      this.stats.total = 0;
    }
    
    // Pre-stringify translation prev arrays once
    const transPrevCache = {
      prev5: trans.prev5 ? JSON.stringify(trans.prev5) : null,
      prev4: trans.prev4 ? JSON.stringify(trans.prev4) : null,
      prev3: trans.prev3 ? JSON.stringify(trans.prev3) : null
    };
    
    let matched = false;
    let matchMethod = null;
    let matchedInstance = null;
    
    // Try to match with each unmatched instance
    for (const sourceInstance of unmatchedInstances) {
      // Handle edge cases
      if (sourceInstance.edgeCase) {
        for (let j = 0; j <= 2; j++) {
          const prevKey = `prev${j}`;
          if (sourceInstance[prevKey] !== undefined && trans[prevKey] !== undefined) {
            if (JSON.stringify(sourceInstance[prevKey]) === JSON.stringify(trans[prevKey])) {
              matchedInstance = sourceInstance;
              matchMethod = `edge_case_${prevKey}`;
              matched = true;
              break;
            }
          }
        }
        if (matched) break;
        continue;
      }
      
      // Use pre-cached source prev strings
      const cacheKey = sourceInstance.domainIndex;
      const sourcePrevCache = this.sourcePrevCache.get(cacheKey);
      
      if (!sourcePrevCache) continue;
      
      // Try prev5 (exact match)
      if (transPrevCache.prev5 && sourcePrevCache.prev5 && 
          transPrevCache.prev5 === sourcePrevCache.prev5) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev5';
        matched = true;
        break;
      }
      
      // Try prev5Choose4
      if (!matched && transPrevCache.prev4 && sourcePrevCache.prev5Choose4.length) {
        if (sourcePrevCache.prev5Choose4.includes(transPrevCache.prev4)) {
          matchedInstance = sourceInstance;
          matchMethod = 'prev5Choose4';
          matched = true;
          break;
        }
      }
      
      // Try prev5Choose3
      if (!matched && transPrevCache.prev3 && sourcePrevCache.prev5Choose3.length) {
        if (sourcePrevCache.prev5Choose3.includes(transPrevCache.prev3)) {
          matchedInstance = sourceInstance;
          matchMethod = 'prev5Choose3';
          matched = true;
          break;
        }
      }
      
      // Try prev4 (exact match)
      if (!matched && transPrevCache.prev4 && sourcePrevCache.prev4 && 
          transPrevCache.prev4 === sourcePrevCache.prev4) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev4';
        matched = true;
        break;
      }
      
      // Try prev4Choose3
      if (!matched && transPrevCache.prev3 && sourcePrevCache.prev4Choose3.length) {
        if (sourcePrevCache.prev4Choose3.includes(transPrevCache.prev3)) {
          matchedInstance = sourceInstance;
          matchMethod = 'prev4Choose3';
          matched = true;
          break;
        }
      }
      
      // Try prev3 (exact match)
      if (!matched && transPrevCache.prev3 && sourcePrevCache.prev3 && 
          transPrevCache.prev3 === sourcePrevCache.prev3) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev3';
        matched = true;
        break;
      }
    }
    
    if (matched && matchedInstance) {
      matchedInstance.overallTranslation = trans.content;
      matchedInstance.status = "MATCHED";
      
      // Split overallTranslation into elementTranslations based on wordLength ratio
      if (matchedInstance.utterances && matchedInstance.utterances.length > 0) {
        const elementTranslations = splitTranslationByWordRatio(
          trans.content, 
          matchedInstance.utterances,
          'vi'
        );
        
        matchedInstance.utterances.forEach((utt, idx) => {
          utt.elementTranslation = elementTranslations[idx] || '';
        });
      }
      
      this.stats.matched++;
      this.stats.total++;
      
      // Remove from unmatched map
      const remaining = unmatchedInstances.filter(inst => inst !== matchedInstance);
      if (remaining.length > 0) {
        this.unmatchedMap.set(markerKey, remaining);
      } else {
        this.unmatchedMap.delete(markerKey);
      }
      
      return { matched: true, method: matchMethod };
    }
    
    return { matched: false, reason: 'no_context_match' };
  }

  getBuffer() {
    return this.buffer;
  }

  getUpdatedJSON() {
    return this.sourceJSON;
  }
}

export const simulateSSEStream = async (translationText, sourceJSON, onProgress) => {
  const processor = new StreamingTranslationProcessor(sourceJSON);
  
  console.log('🚀 Starting SSE stream simulation...\n');
  console.log(`📊 Source markers: ${Object.values(sourceJSON.markers).reduce((sum, arr) => sum + arr.length, 0)}\n`);
  
  const chunks = [];
  const CHUNK_SIZE = 150;
  const CHUNK_DELAY = 10;
  const UI_UPDATE_INTERVAL = 50;
  
  for (let i = 0; i < translationText.length; i += CHUNK_SIZE) {
    chunks.push(translationText.slice(i, i + CHUNK_SIZE));
  }
  
  console.log(`📦 Total chunks: ${chunks.length}\n`);
  
  let lastUIUpdate = 0;
  let pendingUpdate = null;
  
  for (let i = 0; i < chunks.length; i++) {
    await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
    
    const result = processor.processChunk(chunks[i]);
    
    if (onProgress) {
      const now = Date.now();
      const progressData = {
        chunkIndex: i + 1,
        totalChunks: chunks.length,
        ...result
      };
      
      // Throttle UI updates for performance
      if (now - lastUIUpdate >= UI_UPDATE_INTERVAL || i === chunks.length - 1) {
        onProgress(progressData);
        lastUIUpdate = now;
        pendingUpdate = null; // Clear pending since we just updated
      } else {
        pendingUpdate = progressData;
      }
    }
  }
  
  // Finalize processing
  processor.finalize();
  
  if (onProgress) {
    onProgress({
      chunkIndex: chunks.length,
      totalChunks: chunks.length,
      newMarkers: [],
      currentMarker: null,
      stats: processor.stats,
      bufferLength: processor.buffer.length,
      completed: true // ✅ Flag to indicate completion
    });
  }
  
  // Log final stats summary
  console.log('\n📈 Performance Summary:');
  console.log(`   Efficiency: ${((processor.stats.matched / processor.stats.total) * 100).toFixed(1)}% match rate`);
  console.log(`   Chunks processed: ${chunks.length}`);
  console.log(`   Average markers per chunk: ${(processor.stats.processed / chunks.length).toFixed(1)}`);
  
  return processor.getUpdatedJSON();
};