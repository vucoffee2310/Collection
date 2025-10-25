import { splitTranslationByWordRatio } from './utils.js';

export class StreamingTranslationProcessor {
  constructor(sourceJSON) {
    this.sourceJSON = sourceJSON;
    this.buffer = '';
    this.completedMarkers = [];
    this.currentMarker = null;
    
    const totalSourceMarkers = Object.values(sourceJSON.markers)
      .reduce((sum, arr) => sum + arr.length, 0);
    
    this.stats = { 
      matched: 0, 
      orphaned: 0,
      merged: 0,
      total: totalSourceMarkers,
      processed: 0 
    };
    
    this.events = [];
    this.maxEvents = 1000;
    
    this.unmatchedMap = new Map();
    this.rebuildUnmatchedMap();
    
    this.sourcePrevCache = new Map();
    this.prebuildSourcePrevCache();
    
    this.pendingBuffer = '';
    this.maxBufferSize = 100000;
    this.bufferKeepSize = 1000;
    
    this.lastMatchedPosition = 0;
    this.lastMatchedInstance = null;
    
    this.positionMap = new Map();
    Object.values(sourceJSON.markers).forEach(instances => {
      instances.forEach(instance => {
        this.positionMap.set(instance.position, instance);
      });
    });
    
    this.markerPattern = /\(([a-z])\)/g;
    this.nextMarkerPattern = /\(([a-z])\)/;
  }

  rebuildUnmatchedMap() {
    this.unmatchedMap.clear();
    Object.entries(this.sourceJSON.markers).forEach(([markerKey, instances]) => {
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

  prebuildSourcePrevCache() {
    this.sourcePrevCache.clear();
    
    Object.values(this.sourceJSON.markers).forEach(instances => {
      instances.forEach(instance => {
        const cacheKey = `${instance.domainIndex}`;
        
        const cache = {
          prev5: instance.prev5 ? JSON.stringify(instance.prev5) : null,
          prev4: instance.prev4 ? JSON.stringify(instance.prev4) : null,
          prev3: instance.prev3 ? JSON.stringify(instance.prev3) : null,
          prev5Choose4Set: new Set(instance.prev5Choose4?.map(c => JSON.stringify(c)) || []),
          prev5Choose3Set: new Set(instance.prev5Choose3?.map(c => JSON.stringify(c)) || []),
          prev4Choose3Set: new Set(instance.prev4Choose3?.map(c => JSON.stringify(c)) || [])
        };
        
        this.sourcePrevCache.set(cacheKey, cache);
      });
    });
  }

  mergeOrphanToPreceding(orphanInstance) {
    if (!this.lastMatchedInstance) {
      orphanInstance.status = "ORPHAN";
      this.stats.orphaned++;
      
      if (this.events.length < this.maxEvents) {
        this.events.push({
          type: 'marker_orphaned',
          marker: orphanInstance.domainIndex,
          position: orphanInstance.position,
          reason: 'no_preceding_match',
          detectedBetween: 'At start - no preceding match to merge with'
        });
      }
      
      console.log(`⚠️ Orphan (no merge): ${orphanInstance.domainIndex} at position #${orphanInstance.position} - no preceding match`);
      return;
    }
    
    orphanInstance.status = "MERGED";
    orphanInstance.mergedInto = this.lastMatchedInstance.domainIndex;
    this.stats.merged++;
    
    if (!this.lastMatchedInstance.mergedOrphans) {
      this.lastMatchedInstance.mergedOrphans = [];
    }
    
    this.lastMatchedInstance.mergedOrphans.push({
      domainIndex: orphanInstance.domainIndex,
      position: orphanInstance.position,
      content: orphanInstance.content,
      utterances: orphanInstance.utterances || []
    });
    
    if (orphanInstance.utterances && orphanInstance.utterances.length > 0) {
      if (!this.lastMatchedInstance.utterances) {
        this.lastMatchedInstance.utterances = [];
      }
      this.lastMatchedInstance.utterances.push(...orphanInstance.utterances);
    }
    
    if (this.events.length < this.maxEvents) {
      this.events.push({
        type: 'marker_merged',
        marker: orphanInstance.domainIndex,
        position: orphanInstance.position,
        mergedInto: this.lastMatchedInstance.domainIndex,
        reason: 'orphan_merged',
        detectedBetween: `Merged into ${this.lastMatchedInstance.domainIndex}`
      });
    }
    
    console.log(`🔗 Merged: ${orphanInstance.domainIndex} at position #${orphanInstance.position} → into ${this.lastMatchedInstance.domainIndex}`);
  }

  checkForOrphans(beforePosition) {
    const startPos = this.lastMatchedPosition + 1;
    const endPos = beforePosition - 1;
    
    if (startPos > endPos) return;
    
    for (let pos = startPos; pos <= endPos; pos++) {
      const instance = this.positionMap.get(pos);
      
      if (instance && instance.status === "GAP") {
        this.mergeOrphanToPreceding(instance);
      }
    }
    
    this.rebuildUnmatchedMap();
  }

  processChunk(chunk) {
    const newData = this.pendingBuffer + chunk;
    this.buffer += chunk;
    
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.bufferKeepSize);
    }
    
    this.markerPattern.lastIndex = 0;
    
    let match;
    const newMarkers = [];
    let lastProcessedIndex = 0;
    
    while ((match = this.markerPattern.exec(newData)) !== null) {
      const markerStart = match.index;
      const markerEnd = match.index + match[0].length;
      const letter = match[1];
      
      const remainingData = newData.slice(markerEnd);
      const nextMarkerMatch = this.nextMarkerPattern.exec(remainingData);
      
      if (nextMarkerMatch) {
        const content = remainingData.slice(0, nextMarkerMatch.index).trim();
        newMarkers.push({
          marker: `(${letter})`,
          letter,
          content,
          position: this.completedMarkers.length + newMarkers.length + 1
        });
        
        lastProcessedIndex = markerEnd;
        
        if (this.currentMarker?.marker === `(${letter})`) {
          this.currentMarker = null;
        }
      } else {
        const partialContent = remainingData.trim();
        
        if (this.currentMarker?.marker === `(${letter})`) {
          this.currentMarker.partialContent = partialContent;
        } else {
          this.currentMarker = {
            marker: `(${letter})`,
            letter,
            partialContent,
            position: this.completedMarkers.length + newMarkers.length + 1
          };
        }
        
        this.pendingBuffer = newData.slice(markerStart);
        lastProcessedIndex = markerStart;
        break;
      }
    }
    
    if (lastProcessedIndex > 0 && !this.currentMarker) {
      this.pendingBuffer = '';
    } else if (!match) {
      const keepTail = Math.min(10, newData.length);
      this.pendingBuffer = newData.slice(-keepTail);
    }
    
    newMarkers.forEach(marker => {
      this.completedMarkers.push(marker);
      const matchResult = this.matchAndUpdate(marker);
      
      if (this.events.length < this.maxEvents) {
        this.events.push({
          type: 'marker_completed',
          marker: marker.marker,
          content: marker.content.substring(0, 50) + (marker.content.length > 50 ? '...' : ''),
          position: marker.position,
          matched: matchResult.matched,
          method: matchResult.method,
          reason: matchResult.reason,
          sourcePosition: matchResult.sourcePosition
        });
      }
    });
    
    return {
      newMarkers,
      currentMarker: this.currentMarker,
      stats: this.stats,
      bufferLength: this.buffer.length
    };
  }

  finalize() {
    if (this.currentMarker) {
      const markerPattern = new RegExp(`\\(${this.currentMarker.letter}\\)`, 'g');
      let lastMatch = null;
      let match;
      
      while ((match = markerPattern.exec(this.buffer)) !== null) {
        lastMatch = match;
      }
      
      if (lastMatch) {
        const finalContent = this.buffer.slice(lastMatch.index + lastMatch[0].length).trim();
        this.currentMarker.content = finalContent;
        this.completedMarkers.push(this.currentMarker);
        
        const matchResult = this.matchAndUpdate(this.currentMarker);
        
        if (this.events.length < this.maxEvents) {
          this.events.push({
            type: 'marker_completed',
            marker: this.currentMarker.marker,
            content: this.currentMarker.content.substring(0, 50) + (this.currentMarker.content.length > 50 ? '...' : ''),
            position: this.currentMarker.position,
            matched: matchResult.matched,
            method: matchResult.method,
            reason: matchResult.reason,
            sourcePosition: matchResult.sourcePosition
          });
        }
      }
      
      this.currentMarker = null;
    }
    
    this.checkForOrphans(this.stats.total + 1);
    
    console.log('\n🏁 Stream finalized');
    console.log(`📊 Final Stats:`, this.stats);
    console.log(`   ✅ Matched: ${this.stats.matched}`);
    console.log(`   🔗 Merged: ${this.stats.merged}`);
    console.log(`   ❌ Orphaned: ${this.stats.orphaned}`);
    console.log(`   📍 Total processed: ${this.stats.processed}`);
    console.log(`   📦 Total source: ${this.stats.total}`);
    console.log(`   🎯 Success rate: ${(((this.stats.matched + this.stats.merged) / this.stats.total) * 100).toFixed(1)}%`);
  }

  matchAndUpdate(transMarker) {
    this.stats.processed++;
    
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
    
    const markerKey = trans.marker;
    const unmatchedInstances = this.unmatchedMap.get(markerKey);
    
    if (!unmatchedInstances || unmatchedInstances.length === 0) {
      return { matched: false, reason: 'no_unmatched_instances', sourcePosition: null };
    }
    
    const transPrevCache = {
      prev5: trans.prev5 ? JSON.stringify(trans.prev5) : null,
      prev4: trans.prev4 ? JSON.stringify(trans.prev4) : null,
      prev3: trans.prev3 ? JSON.stringify(trans.prev3) : null
    };
    
    let matched = false;
    let matchMethod = null;
    let matchedInstance = null;
    
    for (const sourceInstance of unmatchedInstances) {
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
      
      const cacheKey = sourceInstance.domainIndex;
      const sourcePrevCache = this.sourcePrevCache.get(cacheKey);
      
      if (!sourcePrevCache) continue;
      
      if (transPrevCache.prev5 && sourcePrevCache.prev5 && 
          transPrevCache.prev5 === sourcePrevCache.prev5) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev5';
        matched = true;
        break;
      }
      
      if (!matched && transPrevCache.prev4 && sourcePrevCache.prev5Choose4Set.size > 0) {
        if (sourcePrevCache.prev5Choose4Set.has(transPrevCache.prev4)) {
          matchedInstance = sourceInstance;
          matchMethod = 'prev5Choose4';
          matched = true;
          break;
        }
      }
      
      if (!matched && transPrevCache.prev3 && sourcePrevCache.prev5Choose3Set.size > 0) {
        if (sourcePrevCache.prev5Choose3Set.has(transPrevCache.prev3)) {
          matchedInstance = sourceInstance;
          matchMethod = 'prev5Choose3';
          matched = true;
          break;
        }
      }
      
      if (!matched && transPrevCache.prev4 && sourcePrevCache.prev4 && 
          transPrevCache.prev4 === sourcePrevCache.prev4) {
        matchedInstance = sourceInstance;
        matchMethod = 'prev4';
        matched = true;
        break;
      }
      
      if (!matched && transPrevCache.prev3 && sourcePrevCache.prev4Choose3Set.size > 0) {
        if (sourcePrevCache.prev4Choose3Set.has(transPrevCache.prev3)) {
          matchedInstance = sourceInstance;
          matchMethod = 'prev4Choose3';
          matched = true;
          break;
        }
      }
      
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
      matchedInstance.matchMethod = matchMethod;
      
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
      
      this.checkForOrphans(matchedInstance.position);
      this.lastMatchedPosition = matchedInstance.position;
      this.lastMatchedInstance = matchedInstance;
      
      const remaining = unmatchedInstances.filter(inst => inst !== matchedInstance);
      if (remaining.length > 0) {
        this.unmatchedMap.set(markerKey, remaining);
      } else {
        this.unmatchedMap.delete(markerKey);
      }
      
      return { matched: true, method: matchMethod, sourcePosition: matchedInstance.position };
    }
    
    return { matched: false, reason: 'no_context_match', sourcePosition: null };
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
  console.log(`📊 Source markers: ${processor.stats.total}\n`);
  
  const chunks = [];
  const CHUNK_SIZE = 150;
  const CHUNK_DELAY = 10;
  const UI_UPDATE_INTERVAL = 100;
  
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
        ...result,
        events: processor.events
      };
      
      if (now - lastUIUpdate >= UI_UPDATE_INTERVAL || i === chunks.length - 1) {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => onProgress(progressData));
        } else {
          onProgress(progressData);
        }
        lastUIUpdate = now;
        pendingUpdate = null;
      } else {
        pendingUpdate = progressData;
      }
    }
  }
  
  if (pendingUpdate && onProgress) {
    onProgress(pendingUpdate);
  }
  
  processor.finalize();
  
  if (onProgress) {
    const finalUpdate = {
      chunkIndex: chunks.length,
      totalChunks: chunks.length,
      newMarkers: [],
      currentMarker: null,
      stats: processor.stats,
      bufferLength: processor.buffer.length,
      events: processor.events,
      completed: true
    };
    
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => onProgress(finalUpdate));
    } else {
      onProgress(finalUpdate);
    }
  }
  
  console.log('\n📈 Performance Summary:');
  console.log(`   Success rate: ${(((processor.stats.matched + processor.stats.merged) / processor.stats.total) * 100).toFixed(1)}%`);
  console.log(`   Chunks processed: ${chunks.length}`);
  console.log(`   Average markers per chunk: ${(processor.stats.processed / chunks.length).toFixed(1)}`);
  
  return processor.getUpdatedJSON();
};