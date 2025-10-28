/**
 * Streaming Translation Processor - OPTIMIZED
 */

import { getPositionMap } from '../lib/json-utils.js';
import { matchAndUpdate } from './matcher.js';
import { checkForOrphans } from './matcher.js';
import { redistributeMergedTranslations } from './redistributor.js';

// ===== Cache Building =====
const buildUnmatchedMap = (sourceJSON) => {
  const unmatchedMap = new Map();

  Object.entries(sourceJSON.markers).forEach(([markerKey, instances]) => {
    const unmatched = instances.filter(
      (inst) =>
        inst.status !== 'MATCHED' && inst.status !== 'ORPHAN' && inst.status !== 'MERGED'
    );
    if (unmatched.length > 0) {
      unmatchedMap.set(markerKey, unmatched);
    }
  });

  return unmatchedMap;
};

const buildSourcePrevCache = (sourceJSON) => {
  const sourcePrevCache = new Map();

  Object.values(sourceJSON.markers).forEach((instances) => {
    instances.forEach((instance) => {
      const cacheKey = instance.domainIndex;

      const cache = {
        prev5: instance.prev5 ? JSON.stringify(instance.prev5) : null,
        prev4: instance.prev4 ? JSON.stringify(instance.prev4) : null,
        prev3: instance.prev3 ? JSON.stringify(instance.prev3) : null,
        prev5Choose4Set: new Set(instance.prev5Choose4?.map((c) => JSON.stringify(c)) || []),
        prev5Choose3Set: new Set(instance.prev5Choose3?.map((c) => JSON.stringify(c)) || []),
        prev4Choose3Set: new Set(instance.prev4Choose3?.map((c) => JSON.stringify(c)) || [])
      };

      sourcePrevCache.set(cacheKey, cache);
    });
  });

  return sourcePrevCache;
};

const buildCaches = (sourceJSON) => {
  const unmatchedMap = buildUnmatchedMap(sourceJSON);
  const sourcePrevCache = buildSourcePrevCache(sourceJSON);
  const positionMap = getPositionMap(sourceJSON);

  return { unmatchedMap, sourcePrevCache, positionMap };
};

// ===== Main Processor Class =====
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

    // OPTIMIZED: Reduced event storage
    this.events = [];
    this.maxEvents = 100; // Reduced from 1000

    // Build lookup caches
    const caches = buildCaches(sourceJSON);
    this.unmatchedMap = caches.unmatchedMap;
    this.sourcePrevCache = caches.sourcePrevCache;
    this.positionMap = caches.positionMap;

    // OPTIMIZED: Per-marker lookup cache
    this.lookupCacheMap = new Map();

    // Buffer management
    this.pendingBuffer = '';
    this.maxBufferSize = 50000; // Reduced from 100000
    this.bufferKeepSize = 500; // Reduced from 1000

    // Tracking
    this.lastMatchedPosition = 0;
    this.lastMatchedInstance = null;

    // Patterns
    this.markerPattern = /\(([a-z])\)/g;
    this.nextMarkerPattern = /\(([a-z])\)/;

    // OPTIMIZED: Track changed positions for incremental updates
    this.changedPositions = new Set();
    this.lastUpdateTime = 0;
  }

  processChunk(chunk) {
    const newData = this.pendingBuffer + chunk;
    this.buffer += chunk;

    // Trim buffer if too large
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.bufferKeepSize);
    }

    const { newMarkers, pendingBuffer } = this.extractMarkers(newData);
    this.pendingBuffer = pendingBuffer;

    // Process each completed marker
    newMarkers.forEach((marker) => {
      this.completedMarkers.push(marker);
      const matchResult = matchAndUpdate(this, marker);
      this.logEvent(marker, matchResult);
      
      // Track changed position
      if (matchResult.sourcePosition) {
        this.changedPositions.add(matchResult.sourcePosition);
      }
    });

    return {
      newMarkers,
      currentMarker: this.currentMarker,
      stats: this.stats,
      bufferLength: this.buffer.length,
      changedPositions: Array.from(this.changedPositions) // Return changed positions
    };
  }

  extractMarkers(data) {
    this.markerPattern.lastIndex = 0;

    const newMarkers = [];
    let match;
    let lastProcessedIndex = 0;

    while ((match = this.markerPattern.exec(data)) !== null) {
      const { index: markerStart, 0: markerText, 1: letter } = match;
      const markerEnd = markerStart + markerText.length;
      const remainingData = data.slice(markerEnd);
      const nextMarkerMatch = this.nextMarkerPattern.exec(remainingData);

      if (nextMarkerMatch) {
        // Complete marker found
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
        // Incomplete marker - store as current
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

        return {
          newMarkers,
          pendingBuffer: data.slice(markerStart)
        };
      }
    }

    // Determine pending buffer
    const pendingBuffer =
      lastProcessedIndex > 0 && !this.currentMarker ? '' : data.slice(-Math.min(10, data.length));

    return { newMarkers, pendingBuffer };
  }

  logEvent(marker, matchResult) {
    if (this.events.length >= this.maxEvents) return;

    this.events.push({
      type: 'marker_completed',
      marker: marker.marker,
      position: marker.position,
      matched: matchResult.matched,
      method: matchResult.method,
      sourcePosition: matchResult.sourcePosition
    });
  }

  // OPTIMIZED: Get lookup cache (build once per marker)
  getLookupCache(markerKey) {
    if (this.lookupCacheMap.has(markerKey)) {
      return this.lookupCacheMap.get(markerKey);
    }
    return null;
  }

  setLookupCache(markerKey, cache) {
    this.lookupCacheMap.set(markerKey, cache);
  }

  clearLookupCache(markerKey) {
    this.lookupCacheMap.delete(markerKey);
  }

  // OPTIMIZED: Clear changed positions after UI update
  clearChangedPositions() {
    this.changedPositions.clear();
  }

  finalize() {
    // Process any remaining marker
    if (this.currentMarker) {
      this.finalizeCurrentMarker();
    }

    // Handle trailing orphans
    checkForOrphans(this, this.stats.total + 1);

    // Redistribute translations
    console.log('\n🧮 Smart redistribution...');
    redistributeMergedTranslations(this.sourceJSON);

    this.printFinalStats();

    // OPTIMIZED: Clear caches
    this.lookupCacheMap.clear();
    this.completedMarkers = []; // Clear to free memory
  }

  finalizeCurrentMarker() {
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
      this.logEvent(this.currentMarker, matchResult);
    }

    this.currentMarker = null;
  }

  printFinalStats() {
    const successRate = (
      ((this.stats.matched + this.stats.merged) / this.stats.total) *
      100
    ).toFixed(1);

    console.log('\n🏁 Finalized');
    console.log(`📊 Stats:`, this.stats);
    console.log(`   ✅ Matched: ${this.stats.matched}`);
    console.log(`   🔗 Merged: ${this.stats.merged}`);
    console.log(`   ❌ Orphaned: ${this.stats.orphaned}`);
    console.log(`   🎯 Success: ${successRate}%`);
  }

  rebuildUnmatchedMap() {
    this.unmatchedMap.clear();

    Object.entries(this.sourceJSON.markers).forEach(([markerKey, instances]) => {
      const unmatched = instances.filter(
        (inst) =>
          inst.status !== 'MATCHED' && inst.status !== 'ORPHAN' && inst.status !== 'MERGED'
      );

      if (unmatched.length > 0) {
        this.unmatchedMap.set(markerKey, unmatched);
      }
    });
  }

  getBuffer() {
    return this.buffer;
  }

  getUpdatedJSON() {
    return this.sourceJSON;
  }
}