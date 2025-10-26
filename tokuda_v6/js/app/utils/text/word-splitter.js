/**
 * Word Splitter - Split text into words and distribute translations
 */

import { getSegmenter } from './word-counter.js';
import { splitIntoWordsWithCompounds } from '../compounds/index.js';
import { fixCompoundBoundaries } from '../compounds/index.js';

const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);

/**
 * Split text into words (canonical function)
 */
export const splitTextIntoWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return [];
  
  // Check for Vietnamese compounds first
  if (lang === 'vi' && (text.includes('«') || text.includes('»'))) {
    return splitIntoWordsWithCompounds(text);
  }
  
  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, 'word');
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        return segments.filter(s => s.isWordLike).map(s => s.segment);
      } catch {
        return text.split('');
      }
    }
    return text.split('');
  }
  
  return text.trim().split(/\s+/).filter(w => w.length > 0);
};

/**
 * Split translation by word ratio across utterances
 */
export const splitTranslationByWordRatio = (translationText, utterances, lang = 'vi') => {
  if (!translationText || !utterances || utterances.length === 0) {
    return utterances.map(() => '');
  }

  const totalWordLength = utterances.reduce((sum, utt) => sum + (utt.wordLength || 0), 0);
  
  if (totalWordLength === 0) {
    return utterances.map(() => '');
  }

  const translationWords = splitTextIntoWords(translationText, lang);
  const totalTranslationWords = translationWords.length;
  
  if (totalTranslationWords === 0) {
    return utterances.map(() => '');
  }

  const elementTranslations = [];
  let currentIndex = 0;

  utterances.forEach((utt, idx) => {
    const ratio = utt.wordLength / totalWordLength;
    let wordsToTake = Math.round(totalTranslationWords * ratio);
    
    if (currentIndex + wordsToTake > translationWords.length) {
      wordsToTake = translationWords.length - currentIndex;
    }
    
    if (idx === utterances.length - 1) {
      wordsToTake = translationWords.length - currentIndex;
    }
    
    if (wordsToTake === 0 && currentIndex < translationWords.length) {
      wordsToTake = 1;
    }

    // Avoid splitting after conjunctions/prepositions
    if (currentIndex + wordsToTake < translationWords.length && wordsToTake > 0) {
      const lastWord = translationWords[currentIndex + wordsToTake - 1];
      const nextWord = translationWords[currentIndex + wordsToTake];
      
      const lastWordClean = lastWord.replace(/[«»]/g, '').toLowerCase();
      const nextWordClean = nextWord.replace(/[«»]/g, '').toLowerCase();
      
      const dontEndWith = new Set([
        'và', 'hoặc', 'hay', 'nhưng', 'mà', 'nên', 'vì', 'do', 
        'để', 'cho', 'với', 'của', 'trong', 'trên', 'dưới', 'ngoài',
        'các', 'những', 'một', 'mỗi', 'từng', 'bất', 'thật', 'rất',
        'đã', 'đang', 'sẽ', 'có', 'là', 'bị', 'được', 'hãy', 'không'
      ]);
      
      const dontStartWith = new Set([
        'hơn', 'nhất', 'lắm', 'quá', 'thôi'
      ]);
      
      if (dontEndWith.has(lastWordClean) && wordsToTake < totalTranslationWords && idx < utterances.length - 1) {
        wordsToTake++;
      }
      
      if (dontStartWith.has(nextWordClean) && wordsToTake < totalTranslationWords && idx < utterances.length - 1) {
        wordsToTake++;
      }
      
      if (currentIndex + wordsToTake > translationWords.length) {
        wordsToTake = translationWords.length - currentIndex;
      }
    }

    const portion = translationWords.slice(currentIndex, currentIndex + wordsToTake).join(' ');
    elementTranslations.push(portion.trim());
    
    currentIndex += wordsToTake;
  });

  // Distribute remaining words
  if (currentIndex < translationWords.length) {
    const remaining = translationWords.slice(currentIndex).join(' ');
    if (elementTranslations.length > 0) {
      elementTranslations[elementTranslations.length - 1] += ' ' + remaining;
    } else {
      elementTranslations.push(remaining);
    }
  }

  // Fix compound boundaries for Vietnamese
  if (lang === 'vi' && elementTranslations.length > 1) {
    const fixed = fixCompoundBoundaries(elementTranslations);
    return fixed;
  }

  return elementTranslations;
};