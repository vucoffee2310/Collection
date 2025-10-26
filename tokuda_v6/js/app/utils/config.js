/**
 * Application Configuration
 * Central configuration for all app constants
 */

export const CONFIG = {
  // Marker generation
  SPLIT_COUNT: 1,
  MIN_MARKERS_PER_PARAGRAPH: 4,
  MAX_MARKERS_PER_PARAGRAPH: 7,
  UTTERANCES_PER_SEGMENT: 6,
  
  // Processing
  POLL_INTERVAL: 500,
  RANDOM_SEED: 0,
  
  // AI API
  API_KEY: "AIzaSyCQgCQRrggBobJ-knaLqy3ORvpozHISWIk",
  GEMINI_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse",
  
  // Streaming
  SSE_CHUNK_SIZE: 150,
  SSE_CHUNK_DELAY: 10,
  UI_UPDATE_INTERVAL: 50,
  
  // UI
  MAX_EVENT_LOG_ITEMS: 100
};

/**
 * Languages that don't use spaces between words
 */
export const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);

/**
 * Delimiter for splitting text segments
 */
export const SPLIT_DELIMITER = ' <<<SPLIT>>> ';