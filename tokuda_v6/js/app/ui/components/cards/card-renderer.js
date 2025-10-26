/**
 * Card Renderer
 * Renders cards to DOM
 */

import { createMatchedCard, createMergedCard, createOrphanedCard, createFailedCard } from './card-factory.js';
import { addCardToGroup, getTotalCardCount } from './group-manager.js';

/**
 * Create event card
 * @param {Object} event - Event data
 * @param {Object} sourceJSON - Source JSON
 * @returns {HTMLElement} - Card element
 */
export const createEventCard = (event, sourceJSON) => {
  const cardNumber = getTotalCardCount() + 1;
  let card = null;
  let type = '';
  
  if (event.type === 'marker_merged') {
    card = createMergedCard(event, cardNumber);
    type = 'merged';
  } else if (event.type === 'marker_orphaned') {
    card = createOrphanedCard(event, cardNumber);
    type = 'orphaned';
  } else if (event.matched) {
    card = createMatchedCard(event, sourceJSON, cardNumber);
    type = 'matched';
  } else {
    card = createFailedCard(event, cardNumber);
    type = 'failed';
  }
  
  return { card, type };
};

/**
 * Update cards in container
 * @param {HTMLElement} cardsWrapper - Cards wrapper element
 * @param {Array} events - Events array
 * @param {Object} sourceJSON - Source JSON
 */
export const updateCards = (cardsWrapper, events, sourceJSON) => {
  if (!events || events.length === 0) return;
  
  const existingCount = cardsWrapper.querySelectorAll('.card-item').length;
  const newEvents = events.slice(existingCount);
  
  newEvents.forEach(event => {
    const { card, type } = createEventCard(event, sourceJSON);
    if (card) {
      const group = addCardToGroup(card, event, type);
      if (!group.parentNode) {
        cardsWrapper.appendChild(group);
      }
    }
  });
  
  // Scroll to bottom
  if (cardsWrapper.parentElement) {
    cardsWrapper.parentElement.scrollTop = cardsWrapper.parentElement.scrollHeight;
  }
};

/**
 * Create cards container
 * @returns {HTMLElement} - Cards container
 */
export const createCardsContainer = () => {
  const container = document.createElement('div');
  container.id = 'cardsContainer';
  container.style.display = 'none';
  
  const title = document.createElement('div');
  title.id = 'cardsContainerTitle';
  title.textContent = 'Processing Results';
  
  const cardsWrapper = document.createElement('div');
  cardsWrapper.id = 'cardsWrapper';
  
  container.append(title, cardsWrapper);
  return container;
};