import { Parser } from './parser.js';
import { Mapper } from './mapper.js';
import { AIStream } from './stream.js';
import { Logger } from './logger.js';
import { debounce } from './utils.js';

// --- DOM Element Lookups (Composition Root) ---
const elements = {
    logDisplay: document.getElementById('log-display'),
    sourceInput: document.getElementById('sourceInput'),
    startButton: document.getElementById('btn'),
    openDebugButton: document.getElementById('openDebugWindow'),
    mapDisplay: document.getElementById('display'),
    requestDetails: document.getElementById('request-details'),
    requestData: document.getElementById('request-data'),
    networkResponseDetails: document.getElementById('network-response-details'),
    generationSummary: document.getElementById('generation-summary'),
    responseDataStream: document.getElementById('response-data-stream')
};

// --- Class Instantiation & Dependency Injection ---
const logger = new Logger(elements.logDisplay);
const mapper = new Mapper(elements.mapDisplay);

// Debug window management
let debugWindow = null;
let debugWindowReady = false;

const streamDependencies = {
    mapper: mapper,
    logger: logger,
    sourceInputElement: elements.sourceInput,
    buttonElement: elements.startButton,
    requestDetailsEl: elements.requestDetails,
    requestDataEl: elements.requestData,
    networkResponseDetailsEl: elements.networkResponseDetails,
    generationSummaryEl: elements.generationSummary,
    responseDataStreamEl: elements.responseDataStream,
    // Debug window communication
    sendToDebugWindow: (type, data) => {
        if (debugWindow && !debugWindow.closed && debugWindowReady) {
            debugWindow.postMessage({ type, ...data }, '*');
        }
    }
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
    
    // Send to debug window
    if (debugWindow && !debugWindow.closed && debugWindowReady) {
        debugWindow.postMessage({ 
            type: 'SOURCE_SEGMENTS', 
            segments: segments 
        }, '*');
    }
}

function openDebugWindow() {
    if (debugWindow && !debugWindow.closed) {
        debugWindow.focus();
        return;
    }

    debugWindowReady = false;
    debugWindow = window.open(
        'process-debug.html',
        'ProcessDebug',
        'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no'
    );

    if (debugWindow) {
        logger.info('Process debug window opened');
        
        // Send current source segments once the debug window is ready
        window.addEventListener('message', (event) => {
            if (event.data.type === 'DEBUG_READY') {
                debugWindowReady = true;
                logger.info('Debug window ready to receive data');
                
                // Send current source segments
                const fullText = elements.sourceInput.value;
                const contentForMapping = Parser.extractContentForMapping(fullText);
                if (contentForMapping) {
                    const segments = Parser.parseWithUniqueMarkers(contentForMapping);
                    debugWindow.postMessage({ 
                        type: 'SOURCE_SEGMENTS', 
                        segments: segments 
                    }, '*');
                }
            }
        });
    } else {
        logger.error('Failed to open debug window. Please allow popups.');
        alert('Failed to open debug window. Please allow popups for this site.');
    }
}

// --- Event Listeners ---
window.addEventListener('load', () => {
    logger.log("Application initialized.");
    autoParseSource();
});

elements.sourceInput.addEventListener('input', debounce(autoParseSource, 300));
elements.startButton.addEventListener('click', () => stream.toggle());
elements.openDebugButton.addEventListener('click', openDebugWindow);