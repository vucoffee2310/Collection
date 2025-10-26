/**
 * Subtitle Transformer
 * Converts subtitles to marked paragraphs
 */

import { MarkerGenerator } from './marker-generator.js';
import { splitTextAtMiddle } from '../../utils/text/text-splitter.js';
import { mergeLowMarkerParagraphs } from '../../utils/text/paragraph-merger.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  SPLIT_COUNT: 1,
  SPLIT_DELIMITER: ' <<<SPLIT>>> '
};

/**
 * Subtitle Transformer class
 */
export class SubtitleTransformer {
  /**
   * Create transformer
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.markerGenerator = new MarkerGenerator(config);
  }
  
  /**
   * Convert utterances to marked paragraphs
   * @param {Array<Object>} utteranceData - Parsed utterances with timing
   * @param {string} lang - Language code
   * @returns {Object} - { text, metadata }
   */
  convertToMarkedParagraphs(utteranceData, lang = 'en') {
    if (!Array.isArray(utteranceData) || utteranceData.length === 0) {
      return { text: '', metadata: [] };
    }
    
    this.markerGenerator.reset();
    
    const paragraphs = [];
    const markerMetadata = [];
    let currentIndex = 0;
    
    while (currentIndex < utteranceData.length) {
      const paragraph = this.generateParagraph(
        utteranceData,
        currentIndex,
        lang
      );
      
      paragraphs.push(paragraph.text);
      markerMetadata.push(...paragraph.metadata);
      currentIndex = paragraph.nextIndex;
    }
    
    // Merge paragraphs with low marker counts
    const mergedText = mergeLowMarkerParagraphs(
      paragraphs.join('\n\n').replace(
        new RegExp(this.config.SPLIT_DELIMITER, 'g'),
        '\n\n'
      )
    );
    
    return {
      text: mergedText,
      metadata: markerMetadata
    };
  }
  
  /**
   * Generate single paragraph with markers
   * @private
   */
  generateParagraph(utteranceData, startIndex, lang) {
    const segmentCount = this.markerGenerator.getMarkersPerParagraph();
    const segments = [];
    const metadata = [];
    let currentIndex = startIndex;
    
    for (let i = 0; i < segmentCount && currentIndex < utteranceData.length; i++) {
      const segment = this.markerGenerator.generateSegment(
        utteranceData,
        currentIndex
      );
      
      segments.push(segment);
      metadata.push({ utterances: segment.utterances });
      currentIndex += segment.utteranceCount;
    }
    
    // Apply splitting to longest segments
    const processedSegments = this.applySplitting(segments, lang);
    
    // Join segments into paragraph
    const paragraphText = processedSegments.join(' ');
    
    return {
      text: paragraphText,
      metadata: metadata,
      nextIndex: currentIndex
    };
  }
  
  /**
   * Apply splitting to longest segments
   * @private
   */
  applySplitting(segments, lang) {
    if (segments.length === 0) {
      return [];
    }
    
    // Find longest segments
    const indexed = segments.map((seg, idx) => ({
      segment: seg,
      index: idx,
      length: seg.text.length
    }));
    
    indexed.sort((a, b) => b.length - a.length);
    
    const toSplit = new Set(
      indexed.slice(0, this.config.SPLIT_COUNT).map(item => item.index)
    );
    
    // Process segments
    return segments.map((seg, idx) => {
      const full = `${seg.marker} ${seg.text}`;
      
      if (!toSplit.has(idx)) {
        return full;
      }
      
      // Split at middle
      const { before, after } = splitTextAtMiddle(full, lang);
      return `${before}${this.config.SPLIT_DELIMITER}${after}`;
    });
  }
}

/**
 * Convert subtitles to marked paragraphs (convenience function)
 * @param {Array<Object>} utteranceData - Parsed utterances
 * @param {string} lang - Language code
 * @param {Object} config - Optional configuration
 * @returns {Object} - { text, metadata }
 */
export const convertSubtitlesToMarkedParagraphs = (utteranceData, lang = 'en', config = {}) => {
  const transformer = new SubtitleTransformer(config);
  return transformer.convertToMarkedParagraphs(utteranceData, lang);
};