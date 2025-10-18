/**
 * Process Debugger Core - Complete implementation with all requirements
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
        // ============================================
        // CORE DATA STORAGE
        // ============================================
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

        // ============================================
        // BATCH PROCESSING
        // ============================================
        this.eventQueue = [];
        this.processingQueue = false;
        this.isSyncingHistorical = false;

        // ============================================
        // SESSION TRACKING
        // ============================================
        this.sessionStartTime = Date.now();

        // ============================================
        // PERFORMANCE OPTIMIZATION
        // ============================================
        // Debounced breakdown render (waits for quiet period)
        this.debouncedBreakdownRender = debounce(() => this.renderMarkerBreakdown(), 150);
        // Throttled stats update (max once per 200ms)
        this.throttledStatsUpdate = throttle(() => this.updateStatsDisplay(), 200);

        this.init();
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    init() {
        console.log('[Process Debugger] Initializing...');
        this.setupEventListeners();
        this.setupMessageListener();
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

    // ============================================
    // EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // Clear button (in breakdown header)
        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent toggling breakdown section
                this.clearEvents();
            };
        }

        // Save log button
        const saveLogBtn = document.getElementById('saveLogBtn');
        if (saveLogBtn) {
            saveLogBtn.onclick = () => this.saveLog();
            this.updateSaveButtonState();
        }
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
                
                if (!this.isSyncingHistorical && this.eventQueue.length === 0) {
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

    // ============================================
    // EVENT PROCESSING
    // ============================================
    queueSegment(segment) {
        this.eventQueue.push(segment);
        
        // Detect historical sync (many segments arriving rapidly)
        if (this.eventQueue.length > 20) {
            this.isSyncingHistorical = true;
            console.log('[Process Debugger] 📦 Historical sync detected - buffering segments:', this.eventQueue.length);
        }

        if (!this.processingQueue) {
            this.processingQueue = true;
            // Delay processing during historical sync to allow batching
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
            
            // Force immediate final render
            this.renderMarkerBreakdown();
            this.updateStatsDisplay();
            return;
        }

        const startTime = performance.now();
        const maxProcessingTime = this.isSyncingHistorical ? 50 : 16;
        const batchSize = this.isSyncingHistorical ? 10 : 1;
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
            
            // Update stats immediately (fast)
            this.updateStatsDisplay();
            
            // Debounce breakdown (waits for burst to finish)
            this.debouncedBreakdownRender();
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
            }
            
            // Cancel pending debounced call and render NOW
            this.debouncedBreakdownRender.cancel();
            this.renderMarkerBreakdown();
            this.updateStatsDisplay();
        }
    }

    storeEvent(marker, eventData) {
        if (!this.eventsByMarker.has(marker)) {
            this.eventsByMarker.set(marker, []);
        }
        this.eventsByMarker.get(marker).push(eventData);
    }

    // ============================================
    // RENDERING
    // ============================================
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
                `<div class="breakdown-card status-${item.status}" 
                      data-marker="${item.marker}" 
                      data-status="${item.status}" 
                      title="Click to see ${item.marker} details">
                    ${item.marker}
                    <span class="save-marker-icon" 
                          data-marker="${item.marker}" 
                          data-status="${item.status}"
                          title="Save ${item.marker} log to file">💾</span>
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

        // Event delegation (handle both card click and save icon click)
        container.onclick = (event) => {
            // Check if save icon was clicked
            if (event.target.classList.contains('save-marker-icon')) {
                event.stopPropagation(); // Don't trigger card click
                const marker = event.target.dataset.marker;
                const status = event.target.dataset.status;
                this.saveMarkerLog(marker, status);
                
                // Visual feedback
                event.target.textContent = '✅';
                setTimeout(() => {
                    event.target.textContent = '💾';
                }, 1500);
                return;
            }

            // Handle card click
            const card = event.target.closest('.breakdown-card');
            if (!card) return;

            const marker = card.dataset.marker;
            const status = card.dataset.status;

            // Auto-analyze waiting cards on first click
            if (status === 'waiting' && !this.eventsByMarker.has(marker)) {
                const source = this.sourceSegments.find(s => s.marker === marker);
                if (source) {
                    const eventData = createWaitingEvent(source, this);
                    this.storeEvent(marker, eventData);
                    this.eventCount++;
                    this.throttledStatsUpdate();
                }
            }

            this.showTimelineForMarker(marker);
        };
    }

    showTimelineForMarker(marker) {
        const events = this.eventsByMarker.get(marker) || [];
        const status = this.getMarkerStatus(marker);

        let headerHtml = `<h2 class="timeline-header">
            <span>${marker} Timeline <span class="timeline-event-count">(${events.length} event${events.length > 1 ? 's' : ''})</span></span>
            <button class="save-marker-btn" data-marker="${marker}" data-status="${status}">💾 Save This Log</button>
        </h2>`;

        let bodyHtml = events.length > 0
            ? this.renderEventsTimeline(events)
            : '<p class="timeline-empty">No events recorded for this marker yet.</p>';

        this.timelineContainer.innerHTML = headerHtml + bodyHtml;

        // Add save button listener
        const saveBtn = this.timelineContainer.querySelector('.save-marker-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                this.saveMarkerLog(marker, status);

                // Visual feedback
                saveBtn.textContent = '✅ Saved!';
                saveBtn.classList.add('saved');
                setTimeout(() => {
                    saveBtn.textContent = '💾 Save This Log';
                    saveBtn.classList.remove('saved');
                }, 2000);
            };
        }

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
        
        // Update save button state
        this.updateSaveButtonState();
    }

    // ============================================
    // UTILITY METHODS
    // ============================================
    getMarkerStatus(marker) {
        const sourceMatch = this.sourceSegments.find(s => s.marker === marker);
        const targetMatch = this.targetSegments.find(t => t.marker === marker);

        if (sourceMatch && targetMatch) return 'matched';
        if (sourceMatch && !targetMatch) return 'waiting';
        if (!sourceMatch && targetMatch) return 'orphan';
        return 'unknown';
    }

    clearEvents() {
        // Confirmation if there's data
        if (this.eventCount > 0) {
            const confirmed = confirm(
                `Clear all ${this.eventCount} events?\n\n` +
                `This will reset:\n` +
                `• All event timelines\n` +
                `• Target segments\n` +
                `• Statistics\n\n` +
                `Source segments will remain loaded.`
            );
            if (!confirmed) return;
        }

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

    // ============================================
    // LOG EXPORT - GLOBAL
    // ============================================
    saveLog() {
        try {
            // Build complete log data
            const logData = {
                metadata: this.buildMetadata(),
                statistics: {
                    ...this.stats,
                    sourceCount: this.sourceSegments.length,
                    eventCount: this.eventCount
                },
                sourceSegments: this.sourceSegments,
                targetSegments: this.targetSegments,
                events: Object.fromEntries(this.eventsByMarker),
                markerBreakdown: this.buildMarkerBreakdown(),
                generationInfo: this.buildGenerationInfo()
            };

            // Convert to JSON
            const jsonString = JSON.stringify(logData, null, 2);

            // Check size and warn if large
            const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
            if (sizeInMB > 5) {
                if (!confirm(`Large log file (${sizeInMB.toFixed(1)} MB). Continue download?`)) {
                    return;
                }
            }

            // Create download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.generateFilename();
            a.click();

            // Cleanup
            URL.revokeObjectURL(url);

            // User feedback
            this.showSaveConfirmation();

            console.log('[Process Debugger] 💾 Saved full log:', this.generateFilename());

        } catch (error) {
            console.error('[Process Debugger] Failed to save log:', error);
            alert(`Failed to save log: ${error.message}`);
        }
    }

    buildMetadata() {
        return {
            exportedAt: new Date().toISOString(),
            exportedBy: 'Process Debugger v1.0',
            sessionDuration: ((Date.now() - this.sessionStartTime) / 1000).toFixed(1) + 's',
            pageUrl: window.location.href,
            userAgent: navigator.userAgent
        };
    }

    buildMarkerBreakdown() {
        const targetMap = new Map(this.targetSegments.map(t => [t.marker, t]));
        const sourceMap = new Map(this.sourceSegments.map(s => [s.marker, s]));

        const matched = [];
        const waiting = [];
        const orphan = [];

        this.sourceSegments.forEach(s => {
            if (targetMap.has(s.marker)) matched.push(s.marker);
            else waiting.push(s.marker);
        });

        this.targetSegments.forEach(t => {
            if (!sourceMap.has(t.marker)) orphan.push(t.marker);
        });

        return { matched, waiting, orphan };
    }

    buildGenerationInfo() {
        return {
            startTime: this.generationStartTime
                ? new Date(this.generationStartTime).toISOString()
                : null,
            isRunning: this.processingQueue,
            sessionDuration: ((Date.now() - this.sessionStartTime) / 1000).toFixed(1) + 's'
        };
    }

    generateFilename() {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
        return `debug-log-${date}-${time}.json`;
    }

    updateSaveButtonState() {
        const saveBtn = document.getElementById('saveLogBtn');
        if (saveBtn) {
            saveBtn.disabled = this.eventCount === 0;
            saveBtn.title = this.eventCount === 0
                ? 'No events to save yet'
                : `Save ${this.eventCount} events to JSON file`;
        }
    }

    showSaveConfirmation() {
        const saveBtn = document.getElementById('saveLogBtn');
        if (!saveBtn) return;

        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ Saved!';
        saveBtn.style.background = '#28a745';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '';
        }, 2000);
    }

    // ============================================
    // LOG EXPORT - PER MARKER
    // ============================================
    saveMarkerLog(marker, status) {
        try {
            // Build marker-specific log
            const source = this.sourceSegments.find(s => s.marker === marker);
            const target = this.targetSegments.find(t => t.marker === marker);
            const events = this.eventsByMarker.get(marker) || [];

            const logData = {
                metadata: {
                    marker: marker,
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'Process Debugger v1.0',
                    sessionUrl: window.location.href
                },
                source: source ? { marker: source.marker, text: source.text } : null,
                target: target ? { marker: target.marker, text: target.text, exists: true } : { exists: false },
                status: status,
                events: events,
                statistics: {
                    totalEvents: events.length,
                    firstEventTime: events[0]?.timestamp || null,
                    lastEventTime: events[events.length - 1]?.timestamp || null
                }
            };

            // Convert to JSON
            const jsonString = JSON.stringify(logData, null, 2);

            // Create download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.generateMarkerFilename(marker, status);
            a.click();

            // Cleanup
            URL.revokeObjectURL(url);

            console.log(`[Process Debugger] 💾 Saved log for ${marker} (${status})`);

        } catch (error) {
            console.error('[Process Debugger] Failed to save marker log:', error);
            alert(`Failed to save log for ${marker}: ${error.message}`);
        }
    }

    generateMarkerFilename(marker, status) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
        return `marker-${marker}-${status}-${date}-${time}.json`;
    }
}

// ============================================
// INITIALIZE
// ============================================
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