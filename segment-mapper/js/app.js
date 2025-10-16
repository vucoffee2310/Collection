import { Parser } from './parser.js';
import { Mapper } from './mapper.js';
import { AIStream } from './stream.js';
import { Logger } from './logger.js';
// START: RELEVANT CHANGE
import { debounce } from './utils.js';
// END: RELEVANT CHANGE

// --- DOM Element Lookups (Composition Root) ---
const elements = {
    logDisplay: document.getElementById('log-display'),
    sourceInput: document.getElementById('sourceInput'),
    startButton: document.getElementById('btn'),
    mapDisplay: document.getElementById('display'),
    requestDetails: document.getElementById('request-details'),
    requestData: document.getElementById('request-data'),
    responseDetails: document.getElementById('response-details'),
    responseDataStream: document.getElementById('response-data-stream')
};

// --- Class Instantiation & Dependency Injection ---
const logger = new Logger(elements.logDisplay);
const mapper = new Mapper(elements.mapDisplay);

const streamDependencies = {
    mapper: mapper,
    logger: logger,
    sourceInputElement: elements.sourceInput,
    buttonElement: elements.startButton,
    requestDetailsEl: elements.requestDetails,
    requestDataEl: elements.requestData,
    responseDetailsEl: elements.responseDetails,
    responseDataStreamEl: elements.responseDataStream
};
const stream = new AIStream(streamDependencies);

// --- Functions ---
function autoParseSource() {
    const fullText = elements.sourceInput.value;
    const contentForMapping = Parser.extractContentForMapping(fullText);
    
    if (!contentForMapping) {
        mapper.setSource([]);
        return;
    }
    const segments = Parser.parseWithUniqueMarkers(contentForMapping);
    mapper.setSource(segments);
}

// --- Event Listeners ---
window.addEventListener('load', () => {
    logger.log("Application initialized.");
    autoParseSource();
});

// START: RELEVANT CHANGE
// The autoParseSource function is now debounced by 300ms.
elements.sourceInput.addEventListener('input', debounce(autoParseSource, 300));
// END: RELEVANT CHANGE

elements.startButton.addEventListener('click', () => stream.toggle());
