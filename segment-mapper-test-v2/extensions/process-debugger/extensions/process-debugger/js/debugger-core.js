/**
 * Process Debugger Core - With auto-scroll and expand/collapse
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
        this.severityCounts = { success: 0, info: 0, warning: 0, critical: 0 };
        
        // Source/target segments
        this.sourceSegments = [];
        this.targetSegments = [];
        this.generationStartTime = null;

        // DOM elements
        this.detailsPanel = document.getElementById('eventDetailsPanel');
        this.panelTitle = document.getElementById('panelTitle');
        this.panelBody = document.getElementById('panelBody');
        this.panelClose = document.getElementById('panelClose');
        this.eventCounter = document.getElementById('eventCounter');
        this.perfIndicator = document.getElementById('perfIndicator');
        this.breakdownSection = document.getElementById('breakdownSection');
        
        // Auto-scroll state
        this.autoScrollEnabled = false;
        this.userScrolledAway = false;
        
        // Performance tracking
        this.renderTimes = [];
        this.maxRenderTimeTracked = 20;
        
        // Batch processing
        this.eventQueue = [];
        this.processingQueue = false;

        // Debounced functions
        this.debouncedBreakdownRender = debounce(() => this.renderMarkerBreakdown(), 1000);
        this.throttledStatsUpdate = throttle(() => this.updateStatsDisplay(), 200);
        this.throttledEventCounter = throttle(() => {
            this.eventCounter.textContent = this.eventCount;
        }, 100);

        this.init();
    }

    init() {
        console.log('[Process Debugger] Initializing...');
        this.setupEventListeners();
        this.setupMessageListener();
        this.setupPanelListeners();
        this.setupScrollDetection();
        this.renderMarkerBreakdown();
        this.updatePerfIndicator();
        
        this.notifyParent('DEBUG_READY');
        console.log('[Process Debugger] Initialization complete');
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
        
        // Expand/Collapse all
        document.getElementById('expandAllBtn').onclick = () => this.expandAll();
        document.getElementById('collapseAllBtn').onclick = () => this.collapseAll();
    }

    setupPanelListeners() {
        // Close panel
        this.panelClose.onclick = () => this.closePanel();
        
        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.detailsPanel.style.display !== 'none') {
                this.closePanel();
            }
        });
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
                console.log('[Process Debugger] Received source segments:', e.data.segments.length);
                this.sourceSegments = e.data.segments;
                this.targetSegments = [];
                this.generationStartTime = Date.now();
                document.getElementById('sourceCount').textContent = this.sourceSegments.length;
                this.renderMarkerBreakdown();
            } else if (e.data.type === 'TARGET_SEGMENT') {
                console.log('[Process Debugger] Received target segment:', e.data.segment.marker);
                this.targetSegments.push(e.data.segment);
                this.queueSegment(e.data.segment);
            } else if (e.data.type === 'RESET') {
                console.log('[Process Debugger] Received reset command');
                this.clearEvents();
            }
        });
    }

    queueSegment(segment) {
        this.eventQueue.push(segment);
        
        if (!this.processingQueue) {
            this.processingQueue = true;
            requestAnimationFrame(() => this.processQueue());
        }
    }

    processQueue() {
        const startTime = performance.now();
        const maxProcessingTime = 16;
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
            this.throttledStatsUpdate();
            this.throttledEventCounter();
            this.debouncedBreakdownRender();

            const renderTime = performance.now() - startTime;
            this.trackRenderTime(renderTime);
            
            // Auto-scroll to bottom if enabled and user hasn't scrolled away
            if (this.autoScrollEnabled && !this.userScrolledAway) {
                this.scrollToBottom();
            }
        }

        if (this.eventQueue.length > 0) {
            requestAnimationFrame(() => this.processQueue());
        } else {
            this.processingQueue = false;
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
        
        // If panel is open, could expand any nested elements
        console.log('[Debug] Expanded all sections');
    }

    collapseAll() {
        // Collapse breakdown section
        this.breakdownSection.open = false;
        
        // Close panel if open
        if (this.detailsPanel.style.display !== 'none') {
            this.closePanel();
        }
        
        console.log('[Debug] Collapsed all sections');
    }

    storeEvent(marker, eventData) {
        if (!this.eventsByMarker.has(marker)) {
            this.eventsByMarker.set(marker, []);
        }
        this.eventsByMarker.get(marker).push(eventData);
        
        this.severityCounts[eventData.severity]++;
        this.updateSeverityDisplay();
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
            this.severityCounts[eventData.severity]++;
        });

        this.updateSeverityDisplay();
        this.throttledStatsUpdate();
        this.eventCounter.textContent = this.eventCount;
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
        this.severityCounts = { success: 0, info: 0, warning: 0, critical: 0 };
        this.targetSegments = [];
        this.eventQueue = [];
        this.renderTimes = [];
        this.updateStatsDisplay();
        this.updateSeverityDisplay();
        this.eventCounter.textContent = 0;
        this.renderMarkerBreakdown();
        this.updatePerfIndicator();
        this.closePanel();
        console.log('[Process Debugger] Events cleared');
    }

    renderMarkerBreakdown() {
        const startTime = performance.now();
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
            this.showEventPanel(marker);
        };

        const renderTime = performance.now() - startTime;
        this.trackRenderTime(renderTime);
    }

    showEventPanel(marker) {
        const events = this.eventsByMarker.get(marker) || [];
        
        if (events.length === 0) {
            this.panelTitle.textContent = `No Events for ${marker}`;
            this.panelBody.innerHTML = '<p style="text-align: center; padding: 40px; color: #999;">No events recorded for this marker yet.</p>';
        } else {
            this.panelTitle.textContent = `${marker} Timeline (${events.length} event${events.length > 1 ? 's' : ''})`;
            this.panelBody.innerHTML = this.renderEventsTimeline(events);
        }
        
        this.detailsPanel.style.display = 'block';
        this.detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    closePanel() {
        this.detailsPanel.style.display = 'none';
    }

    trackRenderTime(time) {
        this.renderTimes.push(time);
        if (this.renderTimes.length > this.maxRenderTimeTracked) {
            this.renderTimes.shift();
        }
        this.updatePerfIndicator();
    }

    updatePerfIndicator() {
        if (this.renderTimes.length === 0) {
            this.perfIndicator.textContent = '';
            this.perfIndicator.className = 'perf-indicator';
            return;
        }

        const avgTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
        this.perfIndicator.textContent = `${avgTime.toFixed(1)}ms`;

        if (avgTime > 50) {
            this.perfIndicator.className = 'perf-indicator error';
        } else if (avgTime > 20) {
            this.perfIndicator.className = 'perf-indicator warning';
        } else {
            this.perfIndicator.className = 'perf-indicator';
        }
    }

    updateStatsDisplay() {
        document.getElementById('totalEvents').textContent = this.stats.total;
        document.getElementById('matchedCount').textContent = this.stats.matched;
        document.getElementById('orphanCount').textContent = this.stats.orphan;
        document.getElementById('gapCount').textContent = this.stats.gap;
    }

    updateSeverityDisplay() {
        document.getElementById('countSuccess').textContent = `${this.severityCounts.success} Success`;
        document.getElementById('countInfo').textContent = `${this.severityCounts.info} Info`;
        document.getElementById('countWarning').textContent = `${this.severityCounts.warning} Warning`;
        document.getElementById('countCritical').textContent = `${this.severityCounts.critical} Critical`;
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