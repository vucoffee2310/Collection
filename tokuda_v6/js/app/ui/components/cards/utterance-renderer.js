/**
 * Utterance Renderer
 * Renders individual utterance items
 */

import { countWordsConsistent } from '../../../core/translation/word-splitter.js';
import { formatCompoundsForDisplay } from '../../../languages/vietnamese/compound-formatter.js';
import { escapeHTML } from '../../../utils/formatting/html-encoder.js';

/**
 * Create utterance item
 * @param {Object} utt - Utterance data
 * @param {number} idx - Index
 * @param {Object} instance - Parent instance
 * @param {Array} allUtterances - All utterances
 * @param {number} totalTranslationWords - Total translation words
 * @returns {HTMLElement} - Utterance item
 */
export const createUtteranceItem = (utt, idx, instance, allUtterances, totalTranslationWords) => {
  const item = document.createElement('div');
  item.className = 'utterance-item';
  
  // Calculate translation words using consistent counting
  const translationText = utt.elementTranslation || '';
  const translationWords = countWordsConsistent(translationText, 'vi');
  const percentage = totalTranslationWords > 0
    ? ((translationWords / totalTranslationWords) * 100).toFixed(1)
    : 0;
  
  // Calculate original words ratio
  const totalOriginalWords = allUtterances.reduce((sum, u) => sum + (u.wordLength || 0), 0);
  const originalPercentage = totalOriginalWords > 0
    ? ((utt.wordLength / totalOriginalWords) * 100).toFixed(1)
    : 0;
  
  // Check if merged
  const isMerged = !!utt.mergedSource;
  let mergedInfo = '';
  
  if (isMerged) {
    const orphan = instance?.mergedOrphans?.find(o => o.domainIndex === utt.mergedSource);
    if (orphan) {
      const direction = orphan.mergeDirection === 'FORWARD' ? '⬆' : '⬇';
      mergedInfo = `<span style="background: #ffe0b2; padding: 2px 5px; border-radius: 2px; font-size: 9px; font-weight: bold; margin-left: 6px;">${direction} ${utt.mergedSource}</span>`;
    }
  }
  
  // Create metadata
  const meta = document.createElement('div');
  meta.className = 'utterance-meta';
  meta.style.cssText = 'font-size: 10px; color: #333; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;';
  
  meta.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center;">
      <span class="utterance-index" style="font-weight: bold; color: #000;">Seg #${idx + 1}</span>
      <span class="utterance-timestamp" style="font-family: monospace; color: #666;">⏱ ${utt.timestamp || 'N/A'}</span>
      ${mergedInfo}
    </div>
    <div style="display: flex; gap: 6px; align-items: center;">
      <span style="background: #e3f2fd; padding: 2px 6px; border-radius: 2px; font-size: 9px; font-weight: bold;">
        Src: ${utt.wordLength || 0}w (${originalPercentage}%)
      </span>
      <span style="background: #e8f5e9; padding: 2px 6px; border-radius: 2px; font-size: 9px; font-weight: bold;">
        Trans: ${translationWords}w (${percentage}%)
      </span>
    </div>
  `;
  
  // Ratio visualization bar
  const ratioBar = createRatioBar(originalPercentage, percentage);
  
  // Original text
  const originalDiv = createTextDiv('Original', utt.utterance, utt.wordLength);
  
  item.append(meta, ratioBar, originalDiv);
  
  // Translation text
  if (utt.elementTranslation && utt.elementTranslation.trim()) {
    const translationDiv = createTranslationDiv(utt.elementTranslation, translationWords);
    item.appendChild(translationDiv);
  }
  
  return item;
};

/**
 * Create ratio visualization bar
 * @private
 */
const createRatioBar = (originalPercentage, translationPercentage) => {
  const ratioBar = document.createElement('div');
  ratioBar.style.cssText = 'margin-bottom: 8px;';
  ratioBar.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px;">
      <div style="font-size: 8px; color: #666; width: 60px;">Original:</div>
      <div style="flex: 1; background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
        <div style="width: ${originalPercentage}%; height: 100%; background: #2196F3;"></div>
      </div>
      <div style="font-size: 8px; color: #666; width: 40px; text-align: right;">${originalPercentage}%</div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <div style="font-size: 8px; color: #666; width: 60px;">Translation:</div>
      <div style="flex: 1; background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden;">
        <div style="width: ${translationPercentage}%; height: 100%; background: #4CAF50;"></div>
      </div>
      <div style="font-size: 8px; color: #666; width: 40px; text-align: right;">${translationPercentage}%</div>
    </div>
  `;
  return ratioBar;
};

/**
 * Create text div
 * @private
 */
const createTextDiv = (label, text, wordCount) => {
  const div = document.createElement('div');
  div.className = 'utterance-text';
  div.innerHTML = `
    <div class="utterance-label">${label} (${wordCount || 0} words)</div>
    <div>${escapeHTML(text || '')}</div>
  `;
  return div;
};

/**
 * Create translation div with compound formatting
 * @private
 */
const createTranslationDiv = (text, wordCount) => {
  const div = document.createElement('div');
  div.className = 'utterance-text';
  div.innerHTML = `
    <div class="utterance-label">Translation (${wordCount} words)</div>
    <div>${formatCompoundsForDisplay(text)}</div>
  `;
  return div;
};