/**
 * Processing Logic - Manual input and stats update
 */

import { simulateSSEStream } from '../../core/stream-processor/index.js';
import { updateCards, resetCardGrouping, getGroupsData } from '../cards/index.js';
import { copyToClipboard } from '../../utils/dom.js';
import { formatJSON } from '../../utils/helpers.js';
import { showResultButtons } from './export-ui.js';

export const processManualInput = async (text, track, getOrCreateJSON, streamDisplay, statsDisplay, cardsContainer, exportSection, startBtn, setUpdatedData) => {
  startBtn.disabled = true;
  startBtn.textContent = 'Processing...';
  
  streamDisplay.style.display = 'block';
  statsDisplay.container.style.display = 'block';
  cardsContainer.style.display = 'block';
  
  const cardsWrapper = cardsContainer.querySelector('#cardsWrapper');
  cardsWrapper.innerHTML = '';
  resetCardGrouping();
  
  const cachedJSON = await getOrCreateJSON(track);
  if (!cachedJSON) {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Processing';
    return;
  }
  
  const sourceJSON = JSON.parse(JSON.stringify(cachedJSON));
  
  const updatedJSON = await simulateSSEStream(text, sourceJSON, (progress) => {
    updateStats(statsDisplay, progress.stats);
    updateCards(cardsWrapper, progress.events, sourceJSON);
  });
  
  updateCards(cardsWrapper, updatedJSON.events || [], updatedJSON);
  
  const groupsData = getGroupsData();
  console.log('Groups summary:', groupsData);
  
  const events = updatedJSON.events || [];
  setUpdatedData(updatedJSON, events);
  
  copyToClipboard(formatJSON(updatedJSON));
  
  showResultButtons(exportSection);
  
  startBtn.textContent = 'Done';
  setTimeout(() => {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Processing';
  }, 2000);
};

export const updateStats = (statsDisplay, stats) => {
  const { elements } = statsDisplay;
  requestAnimationFrame(() => {
    elements.matched.valueEl.textContent = stats.matched;
    elements.merged.valueEl.textContent = stats.merged;
    elements.orphaned.valueEl.textContent = stats.orphaned;
  });
};