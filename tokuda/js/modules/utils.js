export const $ = (s) => document.querySelector(s);

export const getVideoId = () => new URL(location.href).searchParams.get('v');

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    console.log('✅ Copied');
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { 
      value: text, 
      style: 'position:fixed;opacity:0' 
    });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

export const combinations = (arr, size) => {
  if (size > arr.length || !arr.length) return [];
  if (size === arr.length) return [arr];
  if (size === 1) return arr.map(x => [x]);
  const result = [];
  const bt = (start, combo) => {
    if (combo.length === size) return result.push([...combo]);
    for (let i = start; i <= arr.length - (size - combo.length); i++) {
      bt(i + 1, [...combo, arr[i]]);
    }
  };
  bt(0, []);
  return result;
};

export const countWords = (text, lang = 'en') => {
  if (!text || !text.trim()) return 0;
  
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang) && typeof Intl?.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
      const segments = Array.from(segmenter.segment(text));
      return segments.filter(s => s.isWordLike).length;
    } catch {
      return text.replace(/\s+/g, '').length;
    }
  }
  
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const splitTranslationByWordRatio = (translationText, utterances, lang = 'vi') => {
  if (!translationText || !utterances || utterances.length === 0) {
    return utterances.map(() => '');
  }

  const totalWordLength = utterances.reduce((sum, utt) => sum + (utt.wordLength || 0), 0);
  
  if (totalWordLength === 0) {
    return utterances.map(() => '');
  }

  let translationWords = [];
  const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
  
  if (NON_SPACED_LANGS.has(lang) && typeof Intl?.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
      const segments = Array.from(segmenter.segment(translationText));
      translationWords = segments.filter(s => s.isWordLike).map(s => s.segment);
    } catch {
      translationWords = translationText.split('');
    }
  } else {
    // ✅ FIX: Split by spaces but DON'T keep the spaces in the array
    translationWords = translationText.trim().split(/\s+/).filter(w => w.length > 0);
  }

  const totalTranslationWords = translationWords.length;
  const elementTranslations = [];
  let currentIndex = 0;

  utterances.forEach((utt, idx) => {
    const ratio = utt.wordLength / totalWordLength;
    let wordsToTake = Math.round(totalTranslationWords * ratio);
    
    // Ensure we don't exceed bounds
    if (currentIndex + wordsToTake > translationWords.length) {
      wordsToTake = translationWords.length - currentIndex;
    }
    
    if (idx === utterances.length - 1) {
      // Last utterance takes all remaining words
      wordsToTake = translationWords.length - currentIndex;
    }

    // ✅ FIX: Take actual words and rejoin with spaces
    const portion = translationWords.slice(currentIndex, currentIndex + wordsToTake).join(' ');
    elementTranslations.push(portion.trim());
    
    currentIndex += wordsToTake;
  });

  return elementTranslations;
};