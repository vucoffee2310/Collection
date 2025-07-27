// js/modules/config.js
// Stores all configuration, constants, and selectors.

const YSD_CONFIG = {
    // SRT Processor settings
    scriptConfig: {
        smallGroupSize: 5,
        largeGroupSize: 10,
        largeKeyLen: 6,
        mediumKeyLen: 1,
        keyChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        mergeMaxWords: 0,
        randomSeed: 42,
    },

    // DOM Element IDs
    CONTAINER_ID: 'captionDownloadContainer',
    PROCESSED_LINKS_CONTAINER_ID: 'processedLinksContainer',
    TOGGLE_CONTAINER_ID: 'copyToggleContainer',

    // Storage Key for user settings
    COPY_SETTING_KEY: 'copyToClipboardEnabled',

    // Selectors for finding where to inject the UI on the YouTube page
    INSERTION_POINT_SELECTORS: [
        '#bottom-row',
        '#meta #meta-contents #container #top-row'
    ]
};