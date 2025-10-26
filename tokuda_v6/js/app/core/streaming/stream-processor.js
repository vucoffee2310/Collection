/**
 * Stream Processor (REFACTORED)
 * Orchestrates streaming translation processing
 */

import { BufferManager } from './buffer-manager.js';
import { ChunkProcessor } from './chunk-processor.js';
import { ContextMatcher } from '../matching/context-matcher.js';
import { OrphanHandler } from '../matching/orphan-handler.js';
import { TranslationRedistributor } from '../translation/redistributor.js';
import { mergeVietnameseCompounds } from '../../languages/vietnamese/compound-merger.js';
import { splitTextIntoWords } from '../translation/word-splitter.js';
import { adjustAllBoundaries, extractAdjustedSegments } from '../translation/boundary-adjuster.js';

/**
 * Streaming Translation Processor (Orchestrator)
 */
export class StreamingTranslationProcessor {
  /**
   * Create processor
   * @param {Object} sourceJSON - Source JSON with markers
   */
  constructor(sourceJSON) {
    this.sourceJSON = sourceJSON;
    
    // Initialize components
    this.bufferManager = new BufferManager();
    this.chunkProcessor = new ChunkProcessor();
    this.contextMatcher = new ContextMatcher(sourceJSON);
    this.orphanHandler = new OrphanHandler(
      sourceJSON,
      this.contextMatcher.positionMap
    );
    this.redistributor = new TranslationRedistributor('vi');
    
    // State
    this.completedMarkers = [];
    this.currentMarker = null;
    this.events = [];
    this.maxEvents = 1000;
    
    // Stats
    this.stats = {
      matched: 0,
      merged: 0,
      orphaned: 0,
      total: sourceJSON.totalMarkers,
      processed: 0
    };
  }
  
  /**
   * Process text chunk
   * @param {string} chunk - Text chunk
   * @returns {Object} - Processing result
   */
  processChunk(chunk) {
    // Append to buffer
    const newData = this.bufferManager.append(chunk);
    
    // Extract markers
    const extraction = this.chunkProcessor.extractMarkers(newData, {
      currentMarker: this.currentMarker,
      completedCount: this.completedMarkers.length
    });
    
    // Update state
    this.currentMarker = extraction.currentMarker;
    
    // Update pending buffer
    if (extraction.lastProcessedIndex > 0 && !this.currentMarker) {
      this.bufferManager.clearPending();
    } else if (!extraction.markers.length) {
      const keepTail = Math.min(10, newData.length);
      this.bufferManager.setPending(newData.slice(-keepTail));
    } else {
      this.bufferManager.setPending(newData.slice(extraction.lastProcessedIndex));
    }
    
    // Process each completed marker
    extraction.markers.forEach(marker => {
      this.completedMarkers.push(marker);
      const matchResult = this.matchMarker(marker);
      
      // Record event
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
      newMarkers: extraction.markers,
      currentMarker: this.currentMarker,
      stats: this.stats,
      bufferLength: this.bufferManager.getLength()
    };
  }
  
  /**
   * Match marker with source
   * @private
   */
  matchMarker(transMarker) {
    this.stats.processed++;
    
    const matchResult = this.contextMatcher.match(
      transMarker,
      this.completedMarkers
    );
    
    if (matchResult.matched) {
      const instance = matchResult.instance;
      
      // Merge compounds and set translation
      const mergedTranslation = mergeVietnameseCompounds(transMarker.content);
      
      instance.overallTranslation = transMarker.content;
      instance.overallTranslationWithCompounds = mergedTranslation;
      instance.status = "MATCHED";
      instance.matchMethod = matchResult.method;
      
      // Distribute to utterances if present
      if (instance.utteranceCount > 0) {
        this.distributeToUtterances(instance, mergedTranslation);
      }
      
      this.stats.matched++;
      
      // Check for orphans
      this.orphanHandler.checkGaps(instance.position, instance);
      this.orphanHandler.updateLastMatched(instance.position, instance);
      
      // Update stats from orphan handler
      const orphanStats = this.orphanHandler.getStats();
      this.stats.merged = orphanStats.merged;
      this.stats.orphaned = orphanStats.orphaned;
    }
    
    return matchResult;
  }
  
  /**
   * Distribute translation to utterances
   * @private
   */
  distributeToUtterances(instance, mergedTranslation) {
    const utterances = instance.utterances;
    const totalOriginalWords = utterances.reduce(
      (sum, u) => sum + (u.wordLength || 0),
      0
    );
    
    if (totalOriginalWords === 0) return;
    
    const translationWords = splitTextIntoWords(mergedTranslation, 'vi');
    const totalTranslationWords = translationWords.length;
    
    if (totalTranslationWords === 0) return;
    
    // Calculate allocations
    const allocations = utterances.map((utt, idx) => ({
      utterance: utt,
      wordCount: Math.round(totalTranslationWords * (utt.wordLength / totalOriginalWords)),
      ratio: utt.wordLength / totalOriginalWords,
      isLast: idx === utterances.length - 1
    }));
    
    // Adjust boundaries
    const adjusted = adjustAllBoundaries(allocations, translationWords, 'vi');
    
    // Extract and assign
    const segments = extractAdjustedSegments(adjusted, translationWords);
    utterances.forEach((utt, idx) => {
      utt.elementTranslation = segments[idx] || '';
    });
  }
  
  /**
   * Finalize processing
   */
  finalize() {
    // Finalize current marker if exists
    if (this.currentMarker) {
      const finalized = this.chunkProcessor.finalizeMarker(
        this.currentMarker,
        this.bufferManager.getBuffer()
      );
      
      if (finalized) {
        this.completedMarkers.push(finalized);
        const matchResult = this.matchMarker(finalized);
        
        if (this.events.length < this.maxEvents) {
          this.events.push({
            type: 'marker_completed',
            marker: finalized.marker,
            content: finalized.content.substring(0, 50) + (finalized.content.length > 50 ? '...' : ''),
            position: finalized.position,
            matched: matchResult.matched,
            method: matchResult.method,
            reason: matchResult.reason,
            sourcePosition: matchResult.sourcePosition
          });
        }
      }
      
      this.currentMarker = null;
    }
    
    // Process final orphans
    this.orphanHandler.processFinalGaps(this.stats.total);
    
    // Update stats
    const orphanStats = this.orphanHandler.getStats();
    this.stats.merged = orphanStats.merged;
    this.stats.orphaned = orphanStats.orphaned;
    
    // Redistribute merged translations
    console.log('\n🧮 Smart redistribution...');
    this.redistributor.redistribute(this.sourceJSON);
    
    this.logFinalStats();
  }
  
  /**
   * Log final statistics
   * @private
   */
  logFinalStats() {
    console.log('\n🏁 Finalized');
    console.log(`📊 Stats:`, this.stats);
    console.log(`   ✅ Matched: ${this.stats.matched}`);
    console.log(`   🔗 Merged: ${this.stats.merged}`);
    console.log(`   ❌ Orphaned: ${this.stats.orphaned}`);
    console.log(`   🎯 Success: ${(((this.stats.matched + this.stats.merged) / this.stats.total) * 100).toFixed(1)}%`);
  }
  
  /**
   * Get updated JSON
   * @returns {Object} - Source JSON with updates
   */
  getUpdatedJSON() {
    return this.sourceJSON;
  }
  
  /**
   * Get events
   * @returns {Array} - Event log
   */
  getEvents() {
    return this.events;
  }
}