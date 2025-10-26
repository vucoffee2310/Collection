/**
 * Stream Simulator
 * Simulates SSE streaming for manual input (non-AI mode)
 */

import { StreamingTranslationProcessor } from './stream-processor.js';

/**
 * Simulate SSE stream (for manual input)
 * @param {string} translationText - Complete translation
 * @param {Object} sourceJSON - Source JSON
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Updated JSON
 */
export const simulateSSEStream = async (translationText, sourceJSON, onProgress) => {
  const processor = new StreamingTranslationProcessor(sourceJSON);
  
  console.log('🚀 Starting SSE stream simulation...\n');
  console.log(`📊 Source markers: ${processor.stats.total}\n`);
  
  const CHUNK_SIZE = 150;
  const CHUNK_DELAY = 10;
  const UI_UPDATE_INTERVAL = 100;
  
  const chunks = [];
  for (let i = 0; i < translationText.length; i += CHUNK_SIZE) {
    chunks.push(translationText.slice(i, i + CHUNK_SIZE));
  }
  
  console.log(`📦 Total chunks: ${chunks.length}\n`);
  
  let lastUIUpdate = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
    
    const result = processor.processChunk(chunks[i]);
    
    if (onProgress) {
      const now = Date.now();
      const progressData = {
        chunkIndex: i + 1,
        totalChunks: chunks.length,
        ...result,
        events: processor.getEvents()
      };
      
      if (now - lastUIUpdate >= UI_UPDATE_INTERVAL || i === chunks.length - 1) {
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => onProgress(progressData));
        } else {
          onProgress(progressData);
        }
        lastUIUpdate = now;
      }
    }
  }
  
  processor.finalize();
  
  if (onProgress) {
    const finalUpdate = {
      chunkIndex: chunks.length,
      totalChunks: chunks.length,
      newMarkers: [],
      currentMarker: null,
      stats: processor.stats,
      bufferLength: processor.bufferManager.getLength(),
      events: processor.getEvents(),
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