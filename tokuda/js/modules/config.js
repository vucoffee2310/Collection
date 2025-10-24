export const CONFIG = {
  SPLIT_COUNT: 1,
  MIN_MARKERS_PER_PARAGRAPH: 4,
  MAX_MARKERS_PER_PARAGRAPH: 7,
  UTTERANCES_PER_SEGMENT: 5,
  POLL_INTERVAL: 500,
  RANDOM_SEED: 0,
  API_KEY: "AIzaSyAzddIKNOOyH3qWYcdkAWNoKKobVzRa2RXQ",
  GEMINI_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse",
  SSE_CHUNK_SIZE: 150,
  SSE_CHUNK_DELAY: 10,
  UI_UPDATE_INTERVAL: 50,
  MAX_EVENT_LOG_ITEMS: 100
};

export const NON_SPACED_LANGS = new Set(['ja', 'th', 'zh', 'lo', 'km']);
export const SPLIT_DELIMITER = ' <<<SPLIT>>> ';