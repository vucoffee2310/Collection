/**
 * Process Debugger Core - REFACTORED for On-Demand Rendering
 * Events stored in memory, rendered only when requested via modal
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
        // Core data storage (NO DOM rendering until requested)
        this.eventsByMarker = new Map(); // marker -> [eventData objects]
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
        document.getElementById('clearBtn').onclick = () => this.clearEvents();
        document.getElementById('analyzeWaitingBtn').onclick = () => this.analyzeWaitingSegments();
        document.getElementById('gapStatBox').onclick = () => this.analyzeWaitingSegments();
        document.getElementById('refreshBreakdownBtn').onclick = () => this.renderMarkerBreakdown();

        document.getElementById('autoRefreshCheckbox').onchange = (e) => {
            this.autoRefreshBreakdown = e.target.checked;
        };

        // Removed: scroll buttons, expand/collapse all, auto-scroll
    }

    setupPanelListeners() {
        // Close panel on button
        this.panelClose.onclick = () => this.closePanel();
        
        // Close panel on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.detailsPanel.style.display !== 'none') {
                this.closePanel();
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
        const maxProcessingTime = 16; // ~60fps
        let processedCount = 0;

        // Process events in batches (NO DOM rendering)
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

            // Store event in memory (NO DOM rendering)
            this.storeEvent(segment.marker, eventData);
            processedCount++;
        }

        // Batch updates
        if (processedCount > 0) {
            this.throttledStatsUpdate();
            this.throttledEventCounter();
            this.debouncedBreakdownRender();

            const renderTime = performance.now() - startTime;
            this.trackRenderTime(renderTime);
        }

        // Continue processing if more events exist
        if (this.eventQueue.length > 0) {
            requestAnimationFrame(() => this.processQueue());
        } else {
            this.processingQueue = false;
        }
    }

    storeEvent(marker, eventData) {
        if (!this.eventsByMarker.has(marker)) {
            this.eventsByMarker.set(marker, []);
        }
        this.eventsByMarker.get(marker).push(eventData);
        
        // Update severity counts
        this.severityCounts[eventData.severity]++;
        this.updateSeverityDisplay();
    }

    analyzeWaitingSegments() {
        const waitingSegments = this.getWaitingSegments();

        if (waitingSegments.length === 0) {
            alert('No waiting segments to analyze. All source segments have been matched!');
            return;
        }

        // Create waiting events and store them
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
        
        alert(`Added ${waitingSegments.length} waiting segment analysis. Click cards to view details.`);
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

        // Process source segments
        this.sourceSegments.forEach(source => {
            const hasTarget = targetMap.has(source.marker);
            const status = hasTarget ? 'matched' : 'waiting';
            if (!hasTarget) waitingMarkers.push(source.marker);
            allMarkers.push({ marker: source.marker, status });
        });

        // Process orphan segments
        const sourceMarkerSet = new Set(this.sourceSegments.map(s => s.marker));
        this.targetSegments.forEach(target => {
            if (!sourceMarkerSet.has(target.marker)) {
                allMarkers.push({ marker: target.marker, status: 'orphan' });
            }
        });

        this.stats.gap = waitingMarkers.length;
        this.throttledStatsUpdate();

        // Build the grid of cards
        const gridHtml = `<div class="breakdown-grid">${
            allMarkers.map(item => 
                `<div class="breakdown-card status-${item.status}" data-marker="${item.marker}" title="Click to see ${item.marker} event details">
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

        // Add click handler to grid container (event delegation)
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
            this.panelTitle.textContent = `Event Timeline: ${marker} (${events.length} event${events.length > 1 ? 's' : ''})`;
            this.panelBody.innerHTML = this.renderEventsTimeline(events);
            
            // Setup expand/collapse buttons
            this.panelBody.querySelectorAll('.expand-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const detailsId = btn.dataset.target;
                    this.toggleDetails(detailsId, btn);
                });
            });
        }
        
        // Show panel and scroll to it
        this.detailsPanel.style.display = 'block';
        this.detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderEventsTimeline(events) {
        let html = '<div class="event-timeline">';
        
        events.forEach((eventData, index) => {
            const severityClass = eventData.severity;
            const detailsId = `panel-details-${eventData.number}`;
            
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
                    <div class="event-summary">
                        ${renderSummaryJSON(eventData.jsonPair)}
                        <div class="summary-status">
                            ${eventData.statusText ? `<div class="status-text"><strong>${eventData.statusText.replace('Status: ', '')}</strong></div>` : ''}
                            <button class="expand-btn" data-target="${detailsId}">
                                <span class="icon">▼</span> Show ${eventData.steps.length} Debug Steps
                            </button>
                        </div>
                    </div>
                    <div class="event-details" id="${detailsId}">
                        <div class="details-title">
                            🔍 Step-by-Step ${eventData.type === 'orphan' ? 'ORPHAN' : eventData.type === 'waiting' ? 'WAITING' : 'MATCHED'} Processing Details
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

    toggleDetails(detailsId, button) {
        const details = document.getElementById(detailsId);
        details.classList.toggle('visible');
        button.classList.toggle('expanded');
        const stepCount = button.textContent.match(/\d+/)[0];
        button.innerHTML = details.classList.contains('visible')
            ? '<span class="icon">▼</span> Hide Debug Steps'
            : `<span class="icon">▼</span> Show ${stepCount} Debug Steps`;
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
        this.perfIndicator.textContent = `Avg: ${avgTime.toFixed(1)}ms`;

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
        document.getElementById('severitySuccess').innerHTML = 
            `<span class="severity-icon">✓</span> ${this.severityCounts.success} Success`;
        document.getElementById('severityInfo').innerHTML = 
            `<span class="severity-icon">ℹ</span> ${this.severityCounts.info} Info`;
        document.getElementById('severityWarning').innerHTML = 
            `<span class="severity-icon">⚠</span> ${this.severityCounts.warning} Warning`;
        document.getElementById('severityCritical').innerHTML = 
            `<span class="severity-icon">✗</span> ${this.severityCounts.critical} Critical`;
    }
}

// Initialize debugger when DOM is ready
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