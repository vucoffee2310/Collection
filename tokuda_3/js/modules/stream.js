import { splitTranslationByWordRatio, splitTextIntoWords } from './utils.js';

export class StreamingTranslationProcessor {
  constructor(sourceJSON) {
    this.sourceJSON = sourceJSON;
    this.buffer = '';
    this.completedMarkers = [];
    this.currentMarker = null;
    
    // ✅ Use pre-calculated total
    this.stats = { 
      matched: 0, 
      orphaned: 0,
      merged: 0,
      total: sourceJSON.totalMarkers,
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
    
    // ✅ Build position map from pre-calculated data
    this.positionMap = new Map();
    if (sourceJSON._meta?.positionMap) {
      this.positionMap = new Map(sourceJSON._meta.positionMap);
    } else {
      // Fallback: build from markers
      Object.values(sourceJSON.markers).forEach(instances => {
        instances.forEach(instance => {
          this.positionMap.set(instance.position, instance);
        });
      });
    }
    
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
        const cacheKey = instance.domainIndex;
        
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

  // ✅ SIMPLIFIED: Forward merge using pre-calculated data
  mergeOrphanForward(orphanInstance, targetInstance) {
    orphanInstance.status = "MERGED";
    orphanInstance.mergedInto = targetInstance.domainIndex;
    orphanInstance.mergeDirection = "FORWARD";
    this.stats.merged++;
    
    if (!targetInstance.mergedOrphans) {
      targetInstance.mergedOrphans = [];
    }
    
    // ✅ Use pre-calculated properties
    targetInstance.mergedOrphans.unshift({
      domainIndex: orphanInstance.domainIndex,
      position: orphanInstance.position,
      content: orphanInstance.content,
      utterances: orphanInstance.utterances,
      contentLength: orphanInstance.contentLength, // ✅ Pre-calculated
      totalUtteranceWords: orphanInstance.totalUtteranceWords, // ✅ Pre-calculated
      mergeDirection: "FORWARD"
    });
    
    if (orphanInstance.utteranceCount > 0) {
      if (!targetInstance.utterances) {
        targetInstance.utterances = [];
      }
      
      orphanInstance.utterances.forEach(utt => {
        utt._mergedFrom = orphanInstance.domainIndex;
      });
      
      targetInstance.utterances.unshift(...orphanInstance.utterances);
      // ✅ Update pre-calculated count
      targetInstance.utteranceCount = targetInstance.utterances.length;
    }
    
    if (this.events.length < this.maxEvents) {
      this.events.push({
        type: 'marker_merged',
        marker: orphanInstance.domainIndex,
        position: orphanInstance.position,
        mergedInto: targetInstance.domainIndex,
        mergeDirection: 'FORWARD',
        reason: 'forward_merge',
        detectedBetween: `Forward-merged into ${targetInstance.domainIndex}`
      });
    }
    
    console.log(`🔗 Forward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${targetInstance.domainIndex}`);
  }

  // ✅ SIMPLIFIED: Backward merge using pre-calculated data
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
          detectedBetween: 'No preceding match to merge with'
        });
      }
      
      console.log(`⚠️ Orphan: ${orphanInstance.domainIndex} (#${orphanInstance.position})`);
      return;
    }
    
    orphanInstance.status = "MERGED";
    orphanInstance.mergedInto = this.lastMatchedInstance.domainIndex;
    orphanInstance.mergeDirection = "BACKWARD"; // ✅ Explicit direction
    this.stats.merged++;
    
    if (!this.lastMatchedInstance.mergedOrphans) {
      this.lastMatchedInstance.mergedOrphans = [];
    }
    
    // ✅ Use pre-calculated properties
    this.lastMatchedInstance.mergedOrphans.push({
      domainIndex: orphanInstance.domainIndex,
      position: orphanInstance.position,
      content: orphanInstance.content,
      utterances: orphanInstance.utterances,
      contentLength: orphanInstance.contentLength, // ✅ Pre-calculated
      totalUtteranceWords: orphanInstance.totalUtteranceWords, // ✅ Pre-calculated
      mergeDirection: "BACKWARD"
    });
    
    if (orphanInstance.utteranceCount > 0) {
      if (!this.lastMatchedInstance.utterances) {
        this.lastMatchedInstance.utterances = [];
      }
      
      orphanInstance.utterances.forEach(utt => {
        utt._mergedFrom = orphanInstance.domainIndex;
      });
      
      this.lastMatchedInstance.utterances.push(...orphanInstance.utterances);
      // ✅ Update pre-calculated count
      this.lastMatchedInstance.utteranceCount = this.lastMatchedInstance.utterances.length;
    }
    
    if (this.events.length < this.maxEvents) {
      this.events.push({
        type: 'marker_merged',
        marker: orphanInstance.domainIndex,
        position: orphanInstance.position,
        mergedInto: this.lastMatchedInstance.domainIndex,
        mergeDirection: 'BACKWARD',
        reason: 'backward_merge',
        detectedBetween: `Backward-merged into ${this.lastMatchedInstance.domainIndex}`
      });
    }
    
    console.log(`🔗 Backward: ${orphanInstance.domainIndex} (#${orphanInstance.position}) → ${this.lastMatchedInstance.domainIndex}`);
  }

  // ✅ SIMPLIFIED: Check orphans with forward merge support
  checkForOrphans(beforePosition, currentMatchedInstance = null) {
    const startPos = this.lastMatchedPosition + 1;
    const endPos = beforePosition - 1;
    
    if (startPos > endPos) return;
    
    console.log(`🔍 Checking #${startPos}-#${endPos} for orphans`);
    
    for (let pos = startPos; pos <= endPos; pos++) {
      const instance = this.positionMap.get(pos);
      
      if (instance && instance.status === "GAP") {
        // ✅ Forward merge if no preceding match
        if (!this.lastMatchedInstance && currentMatchedInstance) {
          this.mergeOrphanForward(instance, currentMatchedInstance);
        } else {
          this.mergeOrphanToPreceding(instance);
        }
      }
    }
    
    this.rebuildUnmatchedMap();
  }

  // ✅ GREATLY SIMPLIFIED: Use pre-calculated lengths
  redistributeMergedTranslations() {
    const targetLang = 'vi';
    
    Object.values(this.sourceJSON.markers).forEach(instances => {
      instances.forEach(instance => {
        if (instance.status !== 'MATCHED' || !instance.mergedOrphans || instance.mergedOrphans.length === 0) {
          return;
        }
        
        if (instance.utteranceCount === 0) {
          console.warn(`⚠️ Skip ${instance.domainIndex} - no utterances`);
          return;
        }
        
        try {
          const forwardMerged = instance.mergedOrphans.filter(o => o.mergeDirection === 'FORWARD');
          const backwardMerged = instance.mergedOrphans.filter(o => o.mergeDirection === 'BACKWARD');
          
          console.log(`\n🔄 Redistributing ${instance.domainIndex}`);
          if (forwardMerged.length > 0) console.log(`   ⬅️ Forward: ${forwardMerged.map(o => o.domainIndex).join(', ')}`);
          console.log(`   📍 Matched: ${instance.domainIndex}`);
          if (backwardMerged.length > 0) console.log(`   ➡️ Backward: ${backwardMerged.map(o => o.domainIndex).join(', ')}`);
          
          // ✅ SIMPLE: Use pre-calculated contentLength
          const forwardLength = forwardMerged.reduce((sum, o) => sum + o.contentLength, 0);
          const matchedLength = instance.contentLength;
          const backwardLength = backwardMerged.reduce((sum, o) => sum + o.contentLength, 0);
          const totalLength = forwardLength + matchedLength + backwardLength;
          
          console.log(`   📏 ${forwardLength} + ${matchedLength} + ${backwardLength} = ${totalLength}`);
          
          if (totalLength === 0) {
            console.warn(`   ⚠️ Zero length, skip`);
            return;
          }
          
          const overallTranslation = instance.overallTranslation || '';
          if (!overallTranslation.trim()) {
            console.warn(`   ⚠️ Empty translation, skip`);
            return;
          }
          
          // ✅ Split by ratio
          const translationWords = splitTextIntoWords(overallTranslation, targetLang);
          const totalWords = translationWords.length;
          
          const forwardWords = Math.round(totalWords * (forwardLength / totalLength));
          const matchedWords = Math.round(totalWords * (matchedLength / totalLength));
          const backwardWords = totalWords - forwardWords - matchedWords;
          
          console.log(`   📝 ${forwardWords} + ${matchedWords} + ${backwardWords} = ${totalWords} words`);
          
          let idx = 0;
          const forwardTranslation = translationWords.slice(idx, idx + forwardWords).join(' ');
          idx += forwardWords;
          
          const matchedTranslation = translationWords.slice(idx, idx + matchedWords).join(' ');
          idx += matchedWords;
          
          const backwardTranslation = translationWords.slice(idx).join(' ');
          
          // ✅ Group utterances
          const matchedUtterances = instance.utterances.filter(u => !u._mergedFrom);
          const forwardUtterances = instance.utterances.filter(u => 
            forwardMerged.some(o => u._mergedFrom === o.domainIndex)
          );
          const backwardUtterances = instance.utterances.filter(u => 
            backwardMerged.some(o => u._mergedFrom === o.domainIndex)
          );
          
          // ✅ Distribute
          if (forwardUtterances.length > 0 && forwardTranslation.trim()) {
            const translations = splitTranslationByWordRatio(forwardTranslation, forwardUtterances, targetLang);
            forwardUtterances.forEach((utt, i) => utt.elementTranslation = translations[i] || '');
            console.log(`   ✅ ${forwardUtterances.length} forward utterances`);
          }
          
          if (matchedUtterances.length > 0 && matchedTranslation.trim()) {
            const translations = splitTranslationByWordRatio(matchedTranslation, matchedUtterances, targetLang);
            matchedUtterances.forEach((utt, i) => utt.elementTranslation = translations[i] || '');
            console.log(`   ✅ ${matchedUtterances.length} matched utterances`);
          }
          
          if (backwardUtterances.length > 0 && backwardTranslation.trim()) {
            const translations = splitTranslationByWordRatio(backwardTranslation, backwardUtterances, targetLang);
            backwardUtterances.forEach((utt, i) => utt.elementTranslation = translations[i] || '');
            console.log(`   ✅ ${backwardUtterances.length} backward utterances`);
          }
          
          // ✅ Cleanup
          instance.utterances.forEach(utt => {
            if (utt._mergedFrom) {
              utt.mergedSource = utt._mergedFrom;
              delete utt._mergedFrom;
            }
          });
          
          console.log(`   ✨ Done\n`);
          
        } catch (error) {
          console.error(`❌ Error: ${instance.domainIndex}`, error);
        }
      });
    });
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
    
    // ✅ Check any remaining orphans
    this.checkForOrphans(this.stats.total + 1);
    
    console.log('\n🧮 Smart redistribution...');
    this.redistributeMergedTranslations();
    
    console.log('\n🏁 Finalized');
    console.log(`📊 Stats:`, this.stats);
    console.log(`   ✅ Matched: ${this.stats.matched}`);
    console.log(`   🔗 Merged: ${this.stats.merged}`);
    console.log(`   ❌ Orphaned: ${this.stats.orphaned}`);
    console.log(`   🎯 Success: ${(((this.stats.matched + this.stats.merged) / this.stats.total) * 100).toFixed(1)}%`);
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
      
      // ✅ Use pre-calculated utteranceCount
      if (matchedInstance.utteranceCount > 0) {
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
      
      // ✅ Pass current match for forward merge
      this.checkForOrphans(matchedInstance.position, matchedInstance);
      
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