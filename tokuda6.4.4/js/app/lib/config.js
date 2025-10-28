/**
 * Application Configuration
 */

export const CONFIG = {
  // Subtitle parsing
  SPLIT_COUNT: 1,
  MIN_MARKERS_PER_PARAGRAPH: 4,
  MAX_MARKERS_PER_PARAGRAPH: 7,
  UTTERANCES_PER_SEGMENT: 6,
  RANDOM_SEED: 0,

  // Timing
  POLL_INTERVAL: 500,
  SSE_CHUNK_DELAY: 10,
  UI_UPDATE_INTERVAL: 50,

  // Logging
  MAX_EVENT_LOG_ITEMS: 100,
  ENABLE_DEBUG_LOGS: false
};

// Languages without spaces between words
export const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);

// Delimiter for text splitting
export const SPLIT_DELIMITER = ' <<<SPLIT>>> ';

// Compound word markers
export const COMPOUND_MARKERS = {
  OPEN: '«',
  CLOSE: '»'
};

// Vietnamese boundary words (for smart splitting)
export const VIETNAMESE_BOUNDARY_WORDS = {
  dontEndWith: new Set([
    'và', 'hoặc', 'hay', 'nhưng', 'mà', 'nên', 'vì', 'do', 'để',
    'cho', 'với', 'của', 'trong', 'trên', 'dưới', 'ngoài',
    'các', 'những', 'một', 'mỗi', 'từng', 'bất', 'thật', 'rất',
    'đã', 'đang', 'sẽ', 'có', 'là', 'bị', 'được', 'hãy', 'không'
  ]),
  dontStartWith: new Set(['hơn', 'nhất', 'lắm', 'quá', 'thôi', 'nữa'])
};

export const MIN_WORDS_PER_SEGMENT = 2;