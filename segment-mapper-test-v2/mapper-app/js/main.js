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

// Store current segments for synchronization
let currentSourceSegments = [];
let currentTargetSegments = []; // Store ALL target segments for historical sync
let isGenerationRunning = false;

const streamDependencies = {
    mapper: mapper,
    logger: logger,
    sourceInputElement: elements.sourceInput,
    buttonElement: elements.startButton,
    reportDisplayEl: elements.reportDisplay,
    
    // Callbacks to track state changes
    onGenerationStart: () => {
        isGenerationRunning = true;
        currentTargetSegments = []; // Clear on new generation
        sendToDebugWindow('RESET', {});
    },
    
    onGenerationEnd: () => {
        isGenerationRunning = false;
    },
    
    onTargetSegment: (segment) => {
        // Store every target segment for historical sync
        currentTargetSegments.push(segment);
    },
    
    // Debug window communication (optional extension)
    sendToDebugWindow: (type, data) => {
        sendToDebugWindow(type, data);
    }
};

const stream = new AIStream(streamDependencies);

console.log('[Main App] Stream initialized');

// --- Functions ---
function sendToDebugWindow(type, data) {
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

function syncDebugWindowState() {
    if (!debugWindow || debugWindow.closed || !debugWindowReady) {
        return;
    }
    
    console.log('[Main App] 🔄 Syncing complete state to debug window...');
    
    // Step 1: Send source segments
    if (currentSourceSegments.length > 0) {
        try {
            debugWindow.postMessage({ 
                type: 'SOURCE_SEGMENTS', 
                segments: currentSourceSegments 
            }, '*');
            console.log('[Main App] ✅ Sent source segments:', currentSourceSegments.length);
            logger.info(`[Debug Extension] Synced ${currentSourceSegments.length} source segments`);
        } catch (e) {
            console.error('[Main App] ❌ Failed to send source segments:', e);
            return;
        }
    }
    
    // Step 2: Send ALL historical target segments (for late-joining debug window)
    if (currentTargetSegments.length > 0) {
        console.log('[Main App] 📤 Sending historical target segments:', currentTargetSegments.length);
        
        // Send in batches to avoid overwhelming the debug window
        const batchSize = 10;
        let sentCount = 0;
        
        for (let i = 0; i < currentTargetSegments.length; i += batchSize) {
            const batch = currentTargetSegments.slice(i, i + batchSize);
            
            // Use setTimeout to space out messages
            setTimeout(() => {
                batch.forEach(segment => {
                    try {
                        debugWindow.postMessage({ 
                            type: 'TARGET_SEGMENT', 
                            segment: segment 
                        }, '*');
                        sentCount++;
                    } catch (e) {
                        console.error('[Main App] ❌ Failed to send target segment:', e);
                    }
                });
                
                console.log('[Main App] 📊 Sent batch progress:', sentCount, '/', currentTargetSegments.length);
                
                // Log completion
                if (sentCount >= currentTargetSegments.length) {
                    logger.info(`[Debug Extension] Synced ${currentTargetSegments.length} historical target segments`);
                    console.log('[Main App] ✅ Completed historical sync');
                }
            }, i / batchSize * 100); // Delay each batch by 100ms
        }
    }
    
    // Step 3: Notify about generation state
    if (isGenerationRunning) {
        logger.info('[Debug Extension] Generation is currently RUNNING - new segments will appear in real-time');
        console.log('[Main App] ⚠️ Generation is running - debug will receive new segments live');
    } else {
        logger.info('[Debug Extension] Generation is IDLE - showing all historical data');
        console.log('[Main App] ✅ Sync complete - generation is idle');
    }
}

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
    
    // Send to debug window if it's open and ready
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
        console.log('[Main App] Debug window already open, focusing and re-syncing...');
        debugWindow.focus();
        logger.info('[Debug Extension] Debug window already open, re-syncing state...');
        
        // Re-sync state even if window was already open
        if (debugWindowReady) {
            syncDebugWindowState();
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
        logger.info('[Debug Extension] Process debug window opened - waiting for initialization...');
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
        logger.info('[Debug Extension] Debug window ready - beginning state synchronization...');
        console.log('[Main App] ✅ Debug window is ready!');
        
        // Send any queued messages first
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
        
        // Perform complete state sync
        syncDebugWindowState();
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
    debouncedAutoParseSource.flush();
    stream.toggle();
});

if (elements.openDebugButton) {
    elements.openDebugButton.addEventListener('click', openDebugWindow);
    console.log('[Main App] ✅ Debug button listener attached');
}

console.log('[Main App] 🎉 All initialization complete');