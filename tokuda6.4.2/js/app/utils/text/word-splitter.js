/**
 * Word Splitter - Split text into words and distribute translations
 */

import { getSegmenter } from "./word-counter.js";
import { countWords } from "./word-counter.js";
import { splitIntoWordsWithCompounds } from "../compounds/splitter.js"; // ✅ CHANGED
import { fixCompoundBoundaries } from "../compounds/merger.js"; // ✅ CHANGED
import { NON_SPACED_LANGS } from "../config.js";

export const splitTextIntoWords = (text, lang = "en") => {
  if (!text || !text.trim()) return [];

  if (lang === "vi") {
    const hasMarkers = text.includes("«") || text.includes("»");
    if (hasMarkers) {
      return splitIntoWordsWithCompounds(text);
    }
  }

  if (NON_SPACED_LANGS.has(lang)) {
    const segmenter = getSegmenter(lang, "word");
    if (segmenter) {
      try {
        const segments = Array.from(segmenter.segment(text));
        return segments.filter((s) => s.isWordLike).map((s) => s.segment);
      } catch (err) {
        console.error(`Segmenter failed for ${lang}:`, err);
        return text.split("");
      }
    }
    return text.split("");
  }

  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
};

export const countWordsConsistent = (text, lang = "en") => {
  return countWords(text, lang, true);
};

export const splitTranslationByWordRatio = (
  translationText,
  utterances,
  lang = "vi"
) => {
  if (!translationText || !utterances || utterances.length === 0) {
    return utterances.map(() => "");
  }

  const totalWordLength = utterances.reduce(
    (sum, utt) => sum + (utt.wordLength || 0),
    0
  );

  if (totalWordLength === 0) {
    return utterances.map(() => "");
  }

  const translationWords = splitTextIntoWords(translationText, lang);
  const totalTranslationWords = translationWords.length;

  if (totalTranslationWords === 0) {
    return utterances.map(() => "");
  }

  const targetPositions = [];
  let cumulativeRatio = 0;

  utterances.forEach((utt, idx) => {
    cumulativeRatio += utt.wordLength / totalWordLength;
    const targetEnd = Math.round(totalTranslationWords * cumulativeRatio);
    targetPositions.push(targetEnd);
  });

  targetPositions[targetPositions.length - 1] = totalTranslationWords;

  const elementTranslations = [];
  let currentStart = 0;

  targetPositions.forEach((targetEnd, idx) => {
    let actualEnd = targetEnd;

    if (
      idx < utterances.length - 1 &&
      actualEnd < totalTranslationWords &&
      actualEnd > currentStart
    ) {
      const lastWord = translationWords[actualEnd - 1];
      const nextWord = translationWords[actualEnd];

      const lastWordClean = lastWord.replace(/[«»]/g, "").toLowerCase();
      const nextWordClean = nextWord.replace(/[«»]/g, "").toLowerCase();

      const dontEndWith = new Set([
        "và",
        "hoặc",
        "hay",
        "nhưng",
        "mà",
        "nên",
        "vì",
        "do",
        "để",
        "cho",
        "với",
        "của",
        "trong",
        "trên",
        "dưới",
        "ngoài",
        "các",
        "những",
        "một",
        "mỗi",
        "từng",
        "bất",
        "thật",
        "rất",
        "đã",
        "đang",
        "sẽ",
        "có",
        "là",
        "bị",
        "được",
        "hãy",
        "không",
      ]);

      const dontStartWith = new Set([
        "hơn",
        "nhất",
        "lắm",
        "quá",
        "thôi",
        "nữa",
      ]);

      const remainingWords = totalTranslationWords - actualEnd;
      const remainingSegments = utterances.length - idx - 1;

      const minWordsPerSegment = 2;

      if (
        dontEndWith.has(lastWordClean) &&
        remainingWords > remainingSegments * minWordsPerSegment &&
        actualEnd + 1 <= totalTranslationWords
      ) {
        actualEnd++;
      } else if (
        dontStartWith.has(nextWordClean) &&
        remainingWords > remainingSegments * minWordsPerSegment &&
        actualEnd + 1 <= totalTranslationWords
      ) {
        actualEnd++;
      }
    }

    const portion = translationWords.slice(currentStart, actualEnd).join(" ");
    elementTranslations.push(portion.trim());

    currentStart = actualEnd;
  });

  if (lang === "vi" && elementTranslations.length > 1) {
    const hasCompounds =
      translationText.includes("«") || translationText.includes("»");
    if (hasCompounds) {
      return fixCompoundBoundaries(elementTranslations);
    }
  }

  return elementTranslations;
};
