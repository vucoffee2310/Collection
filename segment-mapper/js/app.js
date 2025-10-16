import { Parser } from './parser.js';
import { Mapper } from './mapper.js';
import { AIStream } from './stream.js';
import { DebugLogger } from './debugLogger.js'; // Import the new logger

// --- DOM Elements ---
const sourceInputElement = document.getElementById('sourceInput');
const startButton = document.getElementById('btn');

// --- Initialization ---
const mapper = new Mapper();
const logger = new DebugLogger(); // Create an instance of the logger
const stream = new AIStream(mapper, sourceInputElement, logger); // Pass it to the stream handler

// --- Functions ---
function autoParseSource() {
    const fullText = sourceInputElement.value;
    const contentForMapping = Parser.extractContentForMapping(fullText);
    
    if (!contentForMapping) {
        mapper.setSource([]);
        return;
    }
    const segments = Parser.parseWithUniqueMarkers(contentForMapping);
    mapper.setSource(segments);
}

// --- Event Listeners ---
sourceInputElement.addEventListener('input', autoParseSource);
window.addEventListener('load', autoParseSource);
startButton.addEventListener('click', () => stream.toggle());
