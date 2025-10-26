/**
 * Modal Controller
 * Orchestrates modal creation and behavior
 */

import { assembleModal } from '../components/modal/modal-container.js';
import { createModalHeader } from '../components/modal/modal-header.js';
import { createModalTabs, setupTabSwitching } from '../components/modal/modal-tabs.js';
import { createModalFooter } from '../components/modal/modal-footer.js';
import { createManualTab, getManualTabText } from '../components/modal/manual-tab.js';
import { createAITab, updateAIButtonState } from '../components/modal/ai-tab.js';
import { createStatsDisplay, showStatsDisplay } from '../components/stats/stats-display.js';
import { createStreamDisplay, showStreamDisplay } from '../components/display/stream-display.js';
import { createCardsContainer } from '../components/cards/card-renderer.js';
import { createExportSection } from './export-controller.js';
import { processManualInput, processAIStream } from './processing-controller.js';
import { loadCompoundData } from '../../languages/vietnamese/compound-loader.js';

/**
 * Create stream modal
 * @param {Object} options - Modal options
 * @returns {Promise<HTMLElement>} - Modal element
 */
export const createStreamModal = async (options) => {
  const {
    track,
    getOrCreateJSON,
    processTrack
  } = options;
  
  // Load compound data
  await loadCompoundData();
  
  // Load CSS if not already loaded
  if (!document.querySelector('#streamCardsCSS')) {
    const style = document.createElement('link');
    style.id = 'streamCardsCSS';
    style.rel = 'stylesheet';
    style.href = chrome.runtime.getURL('js/app/ui/cards.css');
    document.head.appendChild(style);
  }
  
  // State
  let updatedJSONData = null;
  let processedEvents = [];
  
  // Create sections
  const header = createModalHeader({
    title: 'Translation Stream Processor',
    onClose: null // Set later
  });
  
  const tabs = createModalTabs([
    { id: 'manualTabBtn', text: 'Manual Input', active: true },
    { id: 'aiTabBtn', text: 'AI Stream', active: false }
  ]);
  
  const manualTab = createManualTab();
  const aiTab = createAITab(null); // Set handler later
  aiTab.style.display = 'none';
  
  const streamDisplay = createStreamDisplay();
  const statsDisplay = createStatsDisplay();
  const cardsContainer = createCardsContainer();
  
  // Export section
  const exportSection = createExportSection({
    getSourceText: async () => {
      const result = await processTrack(track);
      return result?.content;
    },
    getSourceJSON: async () => {
      return await getOrCreateJSON(track);
    },
    getUpdatedJSON: () => updatedJSONData,
    getEvents: () => processedEvents
  });
  
  // Footer
  const footer = createModalFooter([
    {
      id: 'streamModalFooterCloseBtn',
      text: 'Close',
      primary: false,
      onClick: null // Set later
    },
    {
      id: 'streamModalStartBtn',
      text: 'Start Processing',
      primary: true,
      onClick: null // Set later
    }
  ]);
  
  // Assemble modal
  const modal = assembleModal([
    header,
    tabs,
    manualTab,
    aiTab,
    streamDisplay,
    statsDisplay.container,
    cardsContainer,
    exportSection,
    footer
  ]);
  
  // Setup handlers
  const closeBtn = header.querySelector('#streamModalCloseBtn');
  const footerCloseBtn = footer.querySelector('#streamModalFooterCloseBtn');
  const startBtn = footer.querySelector('#streamModalStartBtn');
  const manualTabBtn = tabs.querySelector('#manualTabBtn');
  const aiTabBtn = tabs.querySelector('#aiTabBtn');
  const aiStreamBtn = aiTab.querySelector('#aiTabStreamBtn');
  
  const closeModal = () => modal.remove();
  
  closeBtn.onclick = closeModal;
  footerCloseBtn.onclick = closeModal;
  
  // Tab switching
  setupTabSwitching({
    manualTabBtn,
    aiTabBtn,
    manualTab,
    aiTab,
    startBtn
  });
  
  // Manual processing
  startBtn.onclick = async () => {
    const text = getManualTabText();
    if (!text) {
      alert('Please paste translation text');
      return;
    }
    
    startBtn.disabled = true;
    startBtn.textContent = 'Processing...';
    
    showStreamDisplay();
    showStatsDisplay();
    cardsContainer.style.display = 'block';
    
    const sourceJSON = await getOrCreateJSON(track);
    const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
    
    try {
      const result = await processManualInput({
        translationText: text,
        sourceJSON,
        statsElements: statsDisplay.elements,
        cardsWrapper,
        onComplete: (data) => {
          updatedJSONData = data.updatedJSON;
          processedEvents = data.events;
        }
      });
      
      startBtn.textContent = 'Done';
    } catch (error) {
      console.error('Processing error:', error);
      startBtn.textContent = 'Error';
    }
    
    setTimeout(() => {
      startBtn.disabled = false;
      startBtn.textContent = 'Start Processing';
    }, 2000);
  };
  
  // AI processing
  aiStreamBtn.onclick = async () => {
    updateAIButtonState('Initializing...', true);
    
    showStreamDisplay();
    showStatsDisplay();
    cardsContainer.style.display = 'block';
    
    const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
    
    try {
      const result = await processTrack(track);
      const sourceJSON = await getOrCreateJSON(track);
      
      if (!result || !sourceJSON) {
        alert('Failed to load data');
        updateAIButtonState('Send to AI & Process', false);
        return;
      }
      
      updateAIButtonState('Streaming...', true);
      
      const processedJSON = await processAIStream({
        sourceText: result.content,
        sourceJSON,
        statsElements: statsDisplay.elements,
        cardsWrapper,
        onComplete: (data) => {
          updatedJSONData = data.updatedJSON;
          processedEvents = data.events;
        }
      });
      
      updateAIButtonState('Completed', false);
    } catch (error) {
      console.error('AI processing error:', error);
      updateAIButtonState('Error', false);
    }
    
    setTimeout(() => {
      updateAIButtonState('Send to AI & Process', false);
    }, 3000);
  };
  
  return modal;
};