/**
 * Streaming Translation Processor - Core Class
 */

import { getGroupInfo } from '../../ui/cards/index.js';
import { buildCaches } from './cache-builder.js';
import { matchAndUpdate } from './matcher.js';
import { checkForOrphans } from './merger.js';
import { redistributeMergedTranslations } from './redistributor.js';

// ... rest of the file stays the same

export class StreamingTranslationProcessor {
  constructor(sourceJSON) {
    this.sourceJSON = sourceJSON;
    this.buffer = '';
    this.completedMarkers = [];
    this.currentMarker = null;
    
    this.stats = { 
      matched: 0, 
      orphaned: 0,
      merged: 0,
      total: sourceJSON.totalMarkers,
      processed: 0 
    };
    
    this.events = [];
    this.maxEvents = 1000;
    
    // Build caches and maps
    const caches = buildCaches(sourceJSON);
    this.unmatchedMap = caches.unmatchedMap;
    this.sourcePrevCache = caches.sourcePrevCache;
    this.positionMap = caches.positionMap;
    
    this.pendingBuffer = '';
    this.maxBufferSize = 100000;
    this.bufferKeepSize = 1000;
    
    this.lastMatchedPosition = 0;
    this.lastMatchedInstance = null;
    
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
      const matchResult = matchAndUpdate(this, marker);
      
      if (this.events.length < this.maxEvents) {
        const eventIndex = this.events.length;
        const groupInfo = getGroupInfo(eventIndex);
        
        this.events.push({
          type: 'marker_completed',
          marker: marker.marker,
          content: marker.content.substring(0, 50) + (marker.content.length > 50 ? '...' : ''),
          position: marker.position,
          matched: matchResult.matched,
          method: matchResult.method,
          reason: matchResult.reason,
          sourcePosition: matchResult.sourcePosition,
          group: groupInfo.groupNumber,
          eventIndex: eventIndex
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
        
        const matchResult = matchAndUpdate(this, this.currentMarker);
        
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
    
    checkForOrphans(this, this.stats.total + 1);
    
    console.log('\n🧮 Smart redistribution...');
    redistributeMergedTranslations(this.sourceJSON);
    
    console.log('\n🏁 Finalized');
    console.log(`📊 Stats:`, this.stats);
    console.log(`   ✅ Matched: ${this.stats.matched}`);
    console.log(`   🔗 Merged: ${this.stats.merged}`);
    console.log(`   ❌ Orphaned: ${this.stats.orphaned}`);
    console.log(`   🎯 Success: ${(((this.stats.matched + this.stats.merged) / this.stats.total) * 100).toFixed(1)}%`);
  }

  getBuffer() {
    return this.buffer;
  }

  getUpdatedJSON() {
    return this.sourceJSON;
  }
}