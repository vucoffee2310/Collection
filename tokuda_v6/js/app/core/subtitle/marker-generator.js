/**
 * Marker Generator
 * Generates random markers with seeded RNG for reproducibility
 */

// ✅ UPDATED IMPORT PATH
import { SeededRandom } from '../../utils/random/seeded-rng.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  MIN_MARKERS_PER_PARAGRAPH: 4,
  MAX_MARKERS_PER_PARAGRAPH: 7,
  UTTERANCES_PER_SEGMENT: 6,
  RANDOM_SEED: 0
};

/**
 * Marker Generator class
 */
export class MarkerGenerator {
  /**
   * Create marker generator
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = new SeededRandom(this.config.RANDOM_SEED);
  }
  
  /**
   * Reset RNG to initial seed
   */
  reset() {
    this.rng.reset(this.config.RANDOM_SEED);
  }
  
  /**
   * Generate random marker letter
   * @returns {string} - Marker letter (a-z)
   */
  generateMarkerLetter() {
    const code = this.rng.nextInt(0, 25);
    return String.fromCharCode(97 + code); // 'a' = 97
  }
  
  /**
   * Generate marker with letter
   * @returns {string} - Marker in format (x)
   */
  generateMarker() {
    const letter = this.generateMarkerLetter();
    return `(${letter})`;
  }
  
  /**
   * Get random number of markers per paragraph
   * @returns {number} - Marker count
   */
  getMarkersPerParagraph() {
    return this.rng.nextInt(
      this.config.MIN_MARKERS_PER_PARAGRAPH,
      this.config.MAX_MARKERS_PER_PARAGRAPH
    );
  }
  
  /**
   * Get utterances per segment
   * @returns {number} - Utterance count
   */
  getUtterancesPerSegment() {
    return this.config.UTTERANCES_PER_SEGMENT;
  }
  
  /**
   * Generate segment with marker and utterances
   * @param {Array<Object>} utterances - Available utterances
   * @param {number} startIndex - Start index in utterances array
   * @returns {Object} - Segment object
   */
  generateSegment(utterances, startIndex) {
    const marker = this.generateMarker();
    const count = this.getUtterancesPerSegment();
    const segmentUtterances = [];
    let text = '';
    
    for (let i = 0; i < count && startIndex + i < utterances.length; i++) {
      const utt = utterances[startIndex + i];
      text += utt.utterance + ' ';
      segmentUtterances.push({
        utterance: utt.utterance,
        timestamp: utt.timestamp,
        start: utt.start,
        end: utt.end,
        duration: utt.duration,
        index: utt.index,
        wordLength: utt.wordLength,
        elementTranslation: ""
      });
    }
    
    return {
      marker,
      text: text.trim(),
      utterances: segmentUtterances,
      utteranceCount: segmentUtterances.length
    };
  }
  
  /**
   * Generate metadata for markers
   * @param {Array<Object>} segments - Generated segments
   * @returns {Array<Object>} - Metadata array
   */
  generateMetadata(segments) {
    return segments.map(segment => ({
      utterances: segment.utterances
    }));
  }
}

/**
 * Create marker generator with default config
 * @param {Object} config - Optional configuration
 * @returns {MarkerGenerator} - Generator instance
 */
export const createMarkerGenerator = (config) => {
  return new MarkerGenerator(config);
};