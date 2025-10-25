import { calculateStats } from './card/data.js';
import { createHeader, createTabs } from './card/components.js';

export const createResultsCard = (updatedJSON, translationText) => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  const panel = document.createElement('div');
  panel.style.cssText = `
    background: white;
    border-radius: 12px;
    max-width: 900px;
    width: 95%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  `;
  
  const stats = calculateStats(updatedJSON);
  
  panel.appendChild(createHeader(stats, modal));
  panel.appendChild(createTabs(stats));
  
  modal.appendChild(panel);
  return modal;
};