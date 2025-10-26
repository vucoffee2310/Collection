/**
 * Processing Controller
 * Orchestrates translation processing flow
 */

import { StreamingTranslationProcessor, simulateSSEStream } from '../../core/streaming/stream-processor.js';
import { sendToAI } from '../../../utils/api/gemini-client.js';
import { updateStats } from '../components/stats/stats-display.js';
import { updateCards } from '../components/cards/card-renderer.js';
import { resetCardGrouping, getGroupsData } from '../components/cards/group-manager.js';
import { copyToClipboard } from '../../../utils/dom/clipboard.js';
import { formatJSON } from '../../../utils/formatting/json-formatter.js';
import { showResultButtons } from '../components/dropdowns/download-menu.js';

/**
 * Process manual input
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Updated JSON
 */
export const processManualInput = async (options) => {
  const {
    translationText,
    sourceJSON,
    statsElements,
    cardsWrapper,
    onProgress = null,
    onComplete = null
  } = options;
  
  console.log('🚀 Starting manual processing...');
  
  // Reset cards
  cardsWrapper.innerHTML = '';
  resetCardGrouping();
  
  // Simulate streaming
  const updatedJSON = await simulateSSEStream(
    translationText,
    JSON.parse(JSON.stringify(sourceJSON)),
    (progress) => {
      updateStats(statsElements, progress.stats);
      updateCards(cardsWrapper, progress.events, sourceJSON);
      
      if (onProgress) {
        onProgress(progress);
      }
    }
  );
  
  // Get groups data
  const groupsData = getGroupsData();
  console.log('Groups summary:', groupsData);
  
  // Copy to clipboard
  await copyToClipboard(formatJSON(updatedJSON));
  
  // Show result buttons
  showResultButtons();
  
  if (onComplete) {
    onComplete({
      updatedJSON,
      events: updatedJSON.events || [],
      groupsData
    });
  }
  
  return updatedJSON;
};

/**
 * Process AI streaming
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Updated JSON
 */
export const processAIStream = async (options) => {
  const {
    sourceText,
    sourceJSON,
    statsElements,
    cardsWrapper,
    onProgress = null,
    onComplete = null
  } = options;
  
  console.log('🚀 Starting AI streaming...');
  
  // Reset cards
  cardsWrapper.innerHTML = '';
  resetCardGrouping();
  
  // Create processor
  const processor = new StreamingTranslationProcessor(
    JSON.parse(JSON.stringify(sourceJSON))
  );
  
  // Send to AI
  await sendToAI(sourceText, async (chunk) => {
    const result = processor.processChunk(chunk);
    updateStats(statsElements, result.stats);
    updateCards(cardsWrapper, processor.getEvents(), sourceJSON);
    
    if (onProgress) {
      onProgress({
        chunk,
        result,
        events: processor.getEvents()
      });
    }
  });
  
  // Finalize
  processor.finalize();
  const updatedJSON = processor.getUpdatedJSON();
  
  // Get groups data
  const groupsData = getGroupsData();
  console.log('Groups summary:', groupsData);
  
  // Copy to clipboard
  await copyToClipboard(formatJSON(updatedJSON));
  
  // Show result buttons
  showResultButtons();
  
  if (onComplete) {
    onComplete({
      updatedJSON,
      events: processor.getEvents(),
      groupsData
    });
  }
  
  return updatedJSON;
};