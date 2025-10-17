import { Parser } from './parser.js';
import { Mapper } from './mapper.js';
import { AIStream } from './stream.js';
import { Logger } from './logger.js';
import { debounce } from './utils.js';

console.log('[Main App] main.js module loaded');

// --- DOM Element Lookups (Composition Root) ---
const elements = {
    sourceInput: document.getElementById('sourceInput'),
    startButton: document.getElementById('btn'),
    openDebugButton: document.getElementById('openDebugWindow'),
    mapDisplay: document.getElementById('display'),
    reportDisplay: document.getElementById('report-display')
};

console.log('[Main App] DOM elements found:', Object.keys(elements).filter(k => elements[k] !== null).length);

// --- Class Instantiation & Dependency Injection ---
const logger = new Logger();
const mapper = new Mapper(elements.mapDisplay);

// Debug window management (optional extension)
let debugWindow = null;
let debugWindowReady = false;
let debugMessageQueue = [];

const DEBUG_EXTENSION_PATH = '../extensions/process-debugger/debug.html';

console.log('[Main App] Debug extension path:', DEBUG_EXTENSION_PATH);

// Store current segments for when debug window connects
let currentSourceSegments = [];

const streamDependencies = {
    mapper: mapper,
    logger: logger,
    sourceInputElement: elements.sourceInput,
    buttonElement: elements.startButton,
    reportDisplayEl: elements.reportDisplay,
    // Debug window communication (optional extension)
    sendToDebugWindow: (type, data) => {
        if (debugWindow && !debugWindow.closed) {
            if (debugWindowReady) {
                try {
                    debugWindow.postMessage({ type, ...data }, '*');
                    console.log('[Main App] ✅ Sent to debug window:', type);
                } catch (e) {
                    console.error('[Main App] ❌ Failed to send message:', e);
                }
            } else {
                console.log('[Main App] 📦 Queueing message (window not ready):', type);
                debugMessageQueue.push({ type, ...data });
            }
        }
    }
};

const stream = new AIStream(streamDependencies);

console.log('[Main App] Stream initialized');

// --- Functions ---
function autoParseSource() {
    const fullText = elements.sourceInput.value;
    const contentForMapping = Parser.extractContentForMapping(fullText);
    
    if (!contentForMapping) {
        mapper.setSource([]);
        currentSourceSegments = [];
        console.log('[Main App] No content for mapping found');
        return;
    }
    
    const segments = Parser.parseWithUniqueMarkers(contentForMapping);
    mapper.setSource(segments);
    
    currentSourceSegments = segments;
    console.log('[Main App] ✅ Parsed source segments:', segments.length);
    
    if (debugWindow && !debugWindow.closed && debugWindowReady) {
        try {
            debugWindow.postMessage({ 
                type: 'SOURCE_SEGMENTS', 
                segments: segments 
            }, '*');
            console.log('[Main App] ✅ Sent source segments to debug window');
        } catch (e) {
            console.error('[Main App] ❌ Failed to send source segments:', e);
        }
    }
}

function openDebugWindow() {
    console.log('[Main App] Opening debug window...');
    console.log('[Main App] Debug path:', DEBUG_EXTENSION_PATH);
    console.log('[Main App] Current location:', window.location.href);
    
    if (debugWindow && !debugWindow.closed) {
        console.log('[Main App] Debug window already open, focusing...');
        debugWindow.focus();
        logger.info('[Debug Extension] Debug window already open, focusing...');
        
        if (debugWindowReady && currentSourceSegments.length > 0) {
            try {
                debugWindow.postMessage({ 
                    type: 'SOURCE_SEGMENTS', 
                    segments: currentSourceSegments 
                }, '*');
                console.log('[Main App] ✅ Re-sent source segments to existing debug window');
            } catch (e) {
                console.error('[Main App] ❌ Failed to resend segments:', e);
            }
        }
        return;
    }

    debugWindowReady = false;
    debugMessageQueue = [];
    
    debugWindow = window.open(
        DEBUG_EXTENSION_PATH,
        'ProcessDebug',
        'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no'
    );

    if (debugWindow) {
        logger.info('[Debug Extension] Process debug window opened');
        console.log('[Main App] ✅ Debug window opened successfully');
        
        setTimeout(() => {
            if (debugWindow && debugWindow.closed) {
                console.error('[Main App] ❌ Debug window was closed immediately');
                logger.warn('[Debug Extension] Debug window was closed immediately - extension may not be installed');
            } else {
                console.log('[Main App] ⏳ Debug window still open, waiting for ready signal...');
            }
        }, 1000);
    } else {
        console.error('[Main App] ❌ Failed to open debug window (popups blocked?)');
        logger.error('[Debug Extension] Failed to open debug window.');
        alert('Failed to open debug window.\n\nPossible reasons:\n1. Popups are blocked - please allow popups for this site\n2. Debug extension not installed (extensions/process-debugger/)\n3. Not running from web server (use: python -m http.server 8000)\n\nThe main app will continue to work without the debugger.');
    }
}

// Message listener for debug window (optional extension)
window.addEventListener('message', (event) => {
    console.log('[Main App] 📨 Received message:', event.data.type, event.data);
    
    if (event.data.type === 'DEBUG_READY') {
        debugWindowReady = true;
        logger.info('[Debug Extension] Debug window ready to receive data');
        console.log('[Main App] ✅ Debug window is ready!');
        
        if (debugMessageQueue.length > 0) {
            console.log('[Main App] 📦 Sending', debugMessageQueue.length, 'queued messages');
            debugMessageQueue.forEach(msg => {
                try {
                    debugWindow.postMessage(msg, '*');
                    console.log('[Main App] ✅ Sent queued message:', msg.type);
                } catch (e) {
                    console.error('[Main App] ❌ Failed to send queued message:', e);
                }
            });
            debugMessageQueue = [];
        }
        
        if (currentSourceSegments.length > 0) {
            try {
                debugWindow.postMessage({ 
                    type: 'SOURCE_SEGMENTS', 
                    segments: currentSourceSegments 
                }, '*');
                console.log('[Main App] ✅ Sent current source segments:', currentSourceSegments.length);
                logger.info(`[Debug Extension] Sent ${currentSourceSegments.length} source segments`);
            } catch (e) {
                console.error('[Main App] ❌ Failed to send initial segments:', e);
            }
        } else {
            console.log('[Main App] ⚠️ No source segments to send yet');
            logger.info('[Debug Extension] No source segments loaded yet');
        }
    }
});

// --- Event Listeners ---
window.addEventListener('load', () => {
    console.log('[Main App] 🚀 Window loaded event fired');
    logger.log("Application initialized.");
    autoParseSource();
    
    if (elements.openDebugButton) {
        elements.openDebugButton.title = 'Opens debug extension (optional) - Shows real-time processing details';
    }
    
    console.log('[Main App] 📊 Current source segments:', currentSourceSegments.length);
});

const debouncedAutoParseSource = debounce(autoParseSource, 500);

elements.sourceInput.addEventListener('input', debouncedAutoParseSource);
elements.startButton.addEventListener('click', () => {
    console.log('[Main App] 🎬 Generate button clicked');
    stream.toggle();
});

if (elements.openDebugButton) {
    elements.openDebugButton.addEventListener('click', openDebugWindow);
    console.log('[Main App] ✅ Debug button listener attached');
}

console.log('[Main App] 🎉 All initialization complete');