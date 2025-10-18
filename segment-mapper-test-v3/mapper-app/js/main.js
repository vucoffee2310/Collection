import { Parser } from './parser.js';
import { Mapper } from './mapper.js';
import { AIStream } from './stream.js';
import { Logger } from './logger.js';
import { debounce } from '../../shared/js/utils.js';
import { ProcessDebugger } from '../../extensions/process-debugger/js/debugger-core.js';

console.log('[Main App] main.js module loaded');

// --- DOM Element Lookups ---
const elements = {
    sourceInput: document.getElementById('sourceInput'),
    generateButton: document.getElementById('generateBtn'),
    switchViewBtn: document.getElementById('switchViewBtn'),
    mapDisplay: document.getElementById('display'),
    reportDisplay: document.getElementById('report-display'),
    mapperView: document.getElementById('mapperView'),
    debugView: document.getElementById('debugView'),
    appTitle: document.getElementById('appTitle'),
};

// --- Class Instantiation & Dependency Injection ---
const logger = new Logger();
const mapper = new Mapper(elements.mapDisplay, logger);
const debuggerInstance = new ProcessDebugger();

// Direct communication with the debugger instance
const streamDependencies = {
    mapper: mapper,
    logger: logger,
    sourceInputElement: elements.sourceInput,
    buttonElement: elements.generateButton,
    reportDisplayEl: elements.reportDisplay,
    
    onGenerationStart: () => {
        debuggerInstance.clearEvents();
    },
    
    onGenerationEnd: () => {
        // No action needed
    },
    
    onTargetSegment: (segment) => {
        debuggerInstance.queueSegment(segment);
    },
};

const stream = new AIStream(streamDependencies);

// --- Functions ---

function autoParseSource() {
    const fullText = elements.sourceInput.value;
    const contentForMapping = Parser.extractContentForMapping(fullText);
    
    const segments = contentForMapping ? Parser.parseWithUniqueMarkers(contentForMapping) : [];
    mapper.setSource(segments);
    
    console.log('[Main App] ✅ Parsed source segments:', segments.length);
    
    // Send source segments directly to the debugger instance
    debuggerInstance.handleSourceSegments(segments);
}

// --- Event Listeners ---
window.addEventListener('load', () => {
    logger.log("Application initialized.");
    autoParseSource();
});

// Create debounced version with longer delay for better UX
const debouncedAutoParseSource = debounce(autoParseSource, 500);

elements.sourceInput.addEventListener('input', () => {
    debouncedAutoParseSource();
});

elements.generateButton.addEventListener('click', () => {
    console.log('[Main App] 🎬 Generate button clicked');
    
    // IMPORTANT: Flush debounce before starting generation
    // This ensures source is fully parsed before streaming starts
    if (debouncedAutoParseSource.pending()) {
        console.log('[Main App] ⚡ Flushing pending source parse...');
        debouncedAutoParseSource.flush();
    }
    
    // Small delay to ensure DOM updates from parse have completed
    requestAnimationFrame(() => {
        stream.toggle();
    });
});

// View Switching Logic
elements.switchViewBtn.addEventListener('click', () => {
    const isDebugging = document.body.classList.toggle('debug-view-active');

    if (isDebugging) {
        elements.mapperView.classList.remove('active-view');
        elements.debugView.classList.add('active-view');
        elements.switchViewBtn.innerHTML = '🗺️ Switch to Mapper';
        elements.appTitle.innerHTML = '🔬 Process Debug';
    } else {
        elements.debugView.classList.remove('active-view');
        elements.mapperView.classList.add('active-view');
        elements.switchViewBtn.innerHTML = '🔬 Switch to Debug';
        elements.appTitle.innerHTML = 'AI Segment Mapper';
    }
});

console.log('[Main App] 🎉 All initialization complete');