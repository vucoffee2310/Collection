/**
 * Process Debugger Core - With improved historical sync handling
 */

import { debounce, throttle, escapeHtml } from './debugger-utils.js';
import { createWaitingEvent, createMatchedEvent, createOrphanEvent } from './debugger-events.js';
import {
    renderDataTable,
    renderFlow,
    renderComparison,
    renderDiagnostics,
    renderProgress,
    renderSummaryJSON,
    renderJSONInSteps,
    renderAlert
} from './debugger-renderers.js';

console.log('[Process Debugger] Module loaded');

class ProcessDebugger {
    constructor() {
        // Core data storage
        this.eventsByMarker = new Map();
        this.eventCount = 0;
        this.stats = { total: 0, matched: 0, orphan: 0, gap: 0 };
        
        // Source/target segments
        this.sourceSegments = [];
        this.targetSegments = [];
        this.generationStartTime = null;

        // DOM elements
        this.timelineContainer = document.getElementById('timeline-container');
        this.breakdownSection = document.getElementById('breakdownSection');
        
        // Auto-scroll state
        this.autoScrollEnabled = false;
        this.userScrolledAway = false;
        
        // Batch processing with larger buffer for historical sync
        this.eventQueue = [];
        this.processingQueue = false;
        this.isSyncingHistorical = false; // Flag to indicate historical sync

        // Throttled functions for performance.
        // Throttle ensures the breakdown UI updates periodically during a fast stream of events (like historical sync) without freezing the browser.
        this.throttledBreakdownRender = throttle(() => this.renderMarkerBreakdown(), 300);
        this.throttledStatsUpdate = throttle(() => this.updateStatsDisplay(), 200);

        this.init();
    }

    init() {
        console.log('[Process Debugger] Initializing...');
        this.setupEventListeners();
        this.setupMessageListener();
        this.setupScrollDetection();
        this.renderMarkerBreakdown();
        
        this.notifyParent('DEBUG_READY');
        console.log('[Process Debugger] Initialization complete - sent DEBUG_READY signal');
    }

    notifyParent(type, data = {}) {
        if (window.opener) {
            try {
                window.opener.postMessage({ type, ...data }, '*');
                console.log(`[Process Debugger] Sent ${type} to parent window`);
            } catch (e) {
                console.error(`[Process Debugger] Failed to notify parent with ${type}:`, e);
            }
        }
    }

    setupEventListeners() {
        // Clear button
        document.getElementById('clearBtn').onclick = () => this.clearEvents();
        
        // Analyze waiting button
        document.getElementById('analyzeWaitingBtn').onclick = () => this.analyzeWaitingSegments();
        document.getElementById('gapStatBox').onclick = () => this.analyzeWaitingSegments();
        
        // Auto-scroll toggle
        const autoScrollBtn = document.getElementById('autoScrollBtn');
        autoScrollBtn.onclick = () => {
            this.autoScrollEnabled = !this.autoScrollEnabled;
            autoScrollBtn.textContent = `Auto-Scroll: ${this.autoScrollEnabled ? 'ON' : 'OFF'}`;
            autoScrollBtn.classList.toggle('active', this.autoScrollEnabled);
            if (this.autoScrollEnabled) {
                this.userScrolledAway = false;
            }
        };
        
        // Combined Expand/Collapse toggle
        const toggleExpandBtn = document.getElementById('toggleExpandBtn');
        toggleExpandBtn.onclick = () => {
            if (this.breakdownSection.open) {
                this.collapseAll();
                toggleExpandBtn.textContent = 'Expand All';
            } else {
                this.expandAll();
                toggleExpandBtn.textContent = 'Collapse All';
            }
        };
    }

    setupScrollDetection() {
        // Detect when user manually scrolls away from auto-scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (this.autoScrollEnabled) {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    const isAtBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 100);
                    if (!isAtBottom) {
                        this.userScrolledAway = true;
                    }
                }, 100);
            }
        });
    }

    setupMessageListener() {
        window.addEventListener('message', (e) => {
            console.log('[Process Debugger] Received message:', e.data.type);
            
            if (e.data.type === 'SOURCE_SEGMENTS') {
                console.log('[Process Debugger] 📥 Received source segments:', e.data.segments.length);
                this.sourceSegments = e.data.segments;
                this.targetSegments = [];
                this.generationStartTime = Date.now();
                document.getElementById('sourceCount').textContent = this.sourceSegments.length;
                this.renderMarkerBreakdown();
                console.log('[Process Debugger] ✅ Source segments loaded and rendered');
                
            } else if (e.data.type === 'TARGET_SEGMENT') {
                const segment = e.data.segment;
                console.log('[Process Debugger] 📥 Received target segment:', segment.marker);
                
                // Check if this is likely a historical sync (many segments arriving quickly)
                if (!this.isSyncingHistorical && this.eventQueue.length === 0) {
                    // First segment might be start of historical sync
                    console.log('[Process Debugger] 🔄 Potentially starting historical sync...');
                }
                
                this.targetSegments.push(segment);
                this.queueSegment(segment);
                
            } else if (e.data.type === 'RESET') {
                console.log('[Process Debugger] 🔄 Received reset command');
                this.clearEvents();
            }
        });
    }

    queueSegment(segment) {
        this.eventQueue.push(segment);
        
        // Use larger batches during historical sync
        if (this.eventQueue.length > 20) {
            this.isSyncingHistorical = true;
            console.log('[Process Debugger] 📦 Historical sync detected - buffering segments:', this.eventQueue.length);
        }
        
        if (!this.processingQueue) {
            this.processingQueue = true;
            
            // Delay processing if we're receiving many segments (historical sync)
            const delay = this.isSyncingHistorical ? 500 : 0;
            setTimeout(() => {
                requestAnimationFrame(() => this.processQueue());
            }, delay);
        }
    }

    processQueue() {
        if (this.eventQueue.length === 0) {
            this.processingQueue = false;
            this.isSyncingHistorical = false;
            console.log('[Process Debugger] ✅ Queue processing complete');
            return;
        }
        
        const startTime = performance.now();
        const maxProcessingTime = this.isSyncingHistorical ? 50 : 16; // Longer processing time for historical sync
        const batchSize = this.isSyncingHistorical ? 10 : 1; // Larger batches for historical sync
        let processedCount = 0;

        while (this.eventQueue.length > 0 && (performance.now() - startTime) < maxProcessingTime) {
            const segment = this.eventQueue.shift();
            
            this.eventCount++;
            this.stats.total++;

            const timestamp = new Date().toLocaleTimeString();
            const sourceMatch = this.sourceSegments.find(s => s.marker === segment.marker);

            let eventData;
            if (sourceMatch) {
                this.stats.matched++;
                eventData = createMatchedEvent(segment, sourceMatch, timestamp, this);
            } else {
                this.stats.orphan++;
                eventData = createOrphanEvent(segment, timestamp, this);
            }

            this.storeEvent(segment.marker, eventData);
            processedCount++;
        }

        if (processedCount > 0) {
            console.log('[Process Debugger] 📊 Processed batch:', processedCount, 'segments, Remaining:', this.eventQueue.length);
            this.throttledStatsUpdate();
            
            // Throttled update for the marker breakdown provides responsive UI during fast streams
            this.throttledBreakdownRender();

            // Auto-scroll to bottom if enabled and user hasn't scrolled away
            if (this.autoScrollEnabled && !this.userScrolledAway && !this.isSyncingHistorical) {
                this.scrollToBottom();
            }
        }

        if (this.eventQueue.length > 0) {
            // Continue processing
            const delay = this.isSyncingHistorical && this.eventQueue.length > 50 ? 100 : 0;
            setTimeout(() => {
                requestAnimationFrame(() => this.processQueue());
            }, delay);
        } else {
            // Queue empty - finalize
            this.processingQueue = false;
            
            if (this.isSyncingHistorical) {
                console.log('[Process Debugger] ✅ Historical sync complete - processed', this.eventCount, 'total events');
                this.isSyncingHistorical = false;
                
                // Force final render after historical sync
                this.renderMarkerBreakdown();
                this.updateStatsDisplay();
            }
        }
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
            this.userScrolledAway = false;
        });
    }

    expandAll() {
        // Expand breakdown section
        this.breakdownSection.open = true;
        console.log('[Debug] Expanded all sections');
    }

    collapseAll() {
        // Collapse breakdown section
        this.breakdownSection.open = false;
        // Clear timeline view when collapsing
        this.timelineContainer.innerHTML = '';
        console.log('[Debug] Collapsed all sections');
    }

    storeEvent(marker, eventData) {
        if (!this.eventsByMarker.has(marker)) {
            this.eventsByMarker.set(marker, []);
        }
        this.eventsByMarker.get(marker).push(eventData);
    }

    analyzeWaitingSegments() {
        const waitingSegments = this.getWaitingSegments();

        if (waitingSegments.length === 0) {
            alert('No waiting segments to analyze. All source segments have been matched!');
            return;
        }

        waitingSegments.forEach(segment => {
            const eventData = createWaitingEvent(segment, this);
            this.storeEvent(segment.marker, eventData);
            this.eventCount++;
        });

        this.throttledStatsUpdate();
        this.renderMarkerBreakdown();
        
        alert(`Added ${waitingSegments.length} waiting segment analysis. Click cards to view full details.`);
    }

    getWaitingSegments() {
        const targetMap = new Map();
        this.targetSegments.forEach(t => targetMap.set(t.marker, t));
        return this.sourceSegments.filter(source => !targetMap.has(source.marker));
    }

    clearEvents() {
        this.eventsByMarker.clear();
        this.eventCount = 0;
        this.stats = { total: 0, matched: 0, orphan: 0, gap: 0 };
        this.targetSegments = [];
        this.eventQueue = [];
        this.isSyncingHistorical = false;
        this.updateStatsDisplay();
        this.renderMarkerBreakdown();
        this.timelineContainer.innerHTML = '';
        console.log('[Process Debugger] Events cleared');
    }

    renderMarkerBreakdown() {
        const container = document.getElementById('markerBreakdownTable');

        if (this.sourceSegments.length === 0) {
            container.innerHTML = '<div class="breakdown-empty">No source segments loaded yet. Start from the main page.</div>';
            return;
        }

        const targetMap = new Map();
        this.targetSegments.forEach(t => targetMap.set(t.marker, t));

        const allMarkers = [];
        const waitingMarkers = [];

        this.sourceSegments.forEach(source => {
            const hasTarget = targetMap.has(source.marker);
            const status = hasTarget ? 'matched' : 'waiting';
            if (!hasTarget) waitingMarkers.push(source.marker);
            allMarkers.push({ marker: source.marker, status });
        });

        const sourceMarkerSet = new Set(this.sourceSegments.map(s => s.marker));
        this.targetSegments.forEach(target => {
            if (!sourceMarkerSet.has(target.marker)) {
                allMarkers.push({ marker: target.marker, status: 'orphan' });
            }
        });

        this.stats.gap = waitingMarkers.length;
        this.throttledStatsUpdate();

        const gridHtml = `<div class="breakdown-grid">${
            allMarkers.map(item => 
                `<div class="breakdown-card status-${item.status}" data-marker="${item.marker}" title="Click to see ${item.marker} full details">
                    ${item.marker}
                </div>`
            ).join('')
        }</div>`;
        
        let waitingListHtml = '';
        if (waitingMarkers.length > 0) {
            waitingListHtml = `<div class="waiting-list">
                <strong>⏳ ${waitingMarkers.length} marker(s) still waiting for AI response:</strong>
                <div class="waiting-markers">${waitingMarkers.join(', ')}</div>
            </div>`;
        }
        
        container.innerHTML = gridHtml + waitingListHtml;

        container.onclick = (event) => {
            const card = event.target.closest('.breakdown-card');
            if (!card) return;

            const marker = card.dataset.marker;
            this.showTimelineForMarker(marker);
        };
    }

    showTimelineForMarker(marker) {
        const events = this.eventsByMarker.get(marker) || [];
        
        let headerHtml = `<h2 class="timeline-header">No Events for ${marker}</h2>`;
        let bodyHtml = '<p class="timeline-empty">No events recorded for this marker yet.</p>';

        if (events.length > 0) {
            headerHtml = `<h2 class="timeline-header">${marker} Timeline <span class="timeline-event-count">(${events.length} event${events.length > 1 ? 's' : ''})</span></h2>`;
            bodyHtml = this.renderEventsTimeline(events);
        }
        
        this.timelineContainer.innerHTML = headerHtml + bodyHtml;
        this.timelineContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    renderEventsTimeline(events) {
        let html = '<div class="event-timeline">';
        
        events.forEach((eventData, index) => {
            const severityClass = eventData.severity;
            
            html += `<div class="timeline-item">
                <div class="timeline-marker ${severityClass}">${index + 1}</div>
                <div class="event severity-${severityClass}">
                    <div class="event-number">#${eventData.number}</div>
                    <div class="event-header">
                        <span class="event-time">${eventData.timestamp}</span>
                        <span class="severity-badge ${severityClass}">
                            <span class="severity-icon">${eventData.statusIcon}</span>
                            ${eventData.type.toUpperCase()}
                        </span>
                    </div>
                    <div class="event-content">
                        ${renderSummaryJSON(eventData.jsonPair)}
                        ${eventData.statusText ? `<div class="status-text">${eventData.statusText.replace('Status: ', '')}</div>` : ''}
                    </div>
                    <div class="event-details">
                        <div class="details-title">
                            🔍 ${eventData.type === 'orphan' ? 'ORPHAN' : eventData.type === 'waiting' ? 'WAITING' : 'MATCHED'} Processing Details
                        </div>
                        ${this.renderSteps(eventData.steps)}
                    </div>
                </div>
            </div>`;
        });
        
        html += '</div>';
        return html;
    }

    renderSteps(steps) {
        return steps.map((step, i) => {
            const stepSeverity = step.severity || 'info';
            const severityClass = `step-${stepSeverity}`;
            const numberClass = stepSeverity;

            const contentHtml = `<div class="step-content">${step.content}${
                step.code ? `<div class="code-box">${escapeHtml(step.code)}</div>` : ''
            }${
                step.data ? renderDataTable(step.data) : ''
            }${
                step.flow ? renderFlow(step.flow) : ''
            }${
                step.comparison ? renderComparison(step.comparison) : ''
            }${
                step.json ? renderJSONInSteps(step.json) : ''
            }${
                step.diagnostic ? renderDiagnostics(step.diagnostic) : ''
            }${
                step.progress ? renderProgress(step.progress) : ''
            }${
                step.alert ? renderAlert(step.alert) : ''
            }</div>`;

            return `<div class="step ${severityClass}">
                <div class="step-title">
                    <span class="step-number ${numberClass}">${i + 1}</span>
                    <span style="flex: 1;">${step.title}</span>
                </div>
                ${contentHtml}
            </div>`;
        }).join('\n');
    }

    updateStatsDisplay() {
        document.getElementById('totalEvents').textContent = this.stats.total;
        document.getElementById('matchedCount').textContent = this.stats.matched;
        document.getElementById('orphanCount').textContent = this.stats.orphan;
        document.getElementById('gapCount').textContent = this.stats.gap;
    }
}

// Initialize
console.log('[Process Debugger] Script loaded, waiting for DOM...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Process Debugger] DOM ready, initializing...');
        new ProcessDebugger();
    });
} else {
    console.log('[Process Debugger] DOM already ready, initializing...');
    new ProcessDebugger();
}