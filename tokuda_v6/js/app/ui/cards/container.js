/**
 * Cards Container - Container creation
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