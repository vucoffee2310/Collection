/**
 * Process Debugger Core
 * Main debugger class and initialization
 */

import { debounce, truncate, escapeHtml } from './debugger-utils.js';
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

class ProcessDebugger {
    constructor() {
        this.timeline = document.getElementById('timeline');
        this.eventCounter = document.getElementById('eventCounter');
        this.perfIndicator = document.getElementById('perfIndicator');
        this.autoScroll = false;
        this.autoRefreshBreakdown = true;
        this.limitEvents = true;
        this.maxEvents = 100;
        this.eventCount = 0;
        this.stats = { total: 0, matched: 0, orphan: 0, gap: 0 };
        this.sourceSegments = [];
        this.targetSegments = [];
        this.generationStartTime = null;

        // Performance tracking
        this.renderTimes = [];
        this.maxRenderTimeTracked = 20;

        // Debounced functions for performance
        this.debouncedBreakdownRender = debounce(() => this.renderMarkerBreakdown(), 300);
        this.debouncedStatsUpdate = debounce(() => this.updateStatsDisplay(), 100);

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMessageListener();
        this.renderMarkerBreakdown();
        this.updatePerfIndicator();
    }

    setupEventListeners() {
        document.getElementById('clearBtn').onclick = () => this.clearTimeline();
        document.getElementById('analyzeWaitingBtn').onclick = () => this.analyzeWaitingSegments();
        document.getElementById('gapStatBox').onclick = () => this.analyzeWaitingSegments();

        document.getElementById('autoScrollBtn').onclick = (e) => {
            this.autoScroll = !this.autoScroll;
            e.target.textContent = this.autoScroll ? 'Auto-Scroll: ON' : 'Auto-Scroll: OFF';
            e.target.classList.toggle('active', this.autoScroll);
        };

        document.getElementById('expandAllBtn').onclick = () => this.expandAll();
        document.getElementById('collapseAllBtn').onclick = () => this.collapseAll();
        document.getElementById('scrollToTopBtn').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('scrollToBottomBtn').onclick = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

        document.getElementById('refreshBreakdownBtn').onclick = () => this.renderMarkerBreakdown();

        document.getElementById('autoRefreshCheckbox').onchange = (e) => {
            this.autoRefreshBreakdown = e.target.checked;
        };

        document.getElementById('limitEventsCheckbox').onchange = (e) => {
            this.limitEvents = e.target.checked;
        };
    }

    setupMessageListener() {
        window.addEventListener('message', (e) => {
            if (e.data.type === 'SOURCE_SEGMENTS') {
                this.sourceSegments = e.data.segments;
                this.targetSegments = [];
                this.generationStartTime = Date.now();
                document.getElementById('sourceCount').textContent = this.sourceSegments.length;
                this.renderMarkerBreakdown();
            } else if (e.data.type === 'TARGET_SEGMENT') {
                this.targetSegments.push(e.data.segment);
                this.processSegment(e.data.segment);
            } else if (e.data.type === 'RESET') {
                this.clearTimeline();
            }
        });

        if (window.opener) {
            window.opener.postMessage({ type: 'DEBUG_READY' }, '*');
        }
    }

    analyzeWaitingSegments() {
        const waitingSegments = this.getWaitingSegments();

        if (waitingSegments.length === 0) {
            alert('No waiting segments to analyze. All source segments have been matched!');
            return;
        }

        waitingSegments.forEach((segment, index) => {
            setTimeout(() => {
                const eventData = createWaitingEvent(segment, this);
                this.renderEvent(eventData);
                this.eventCount++;
                this.eventCounter.textContent = this.eventCount;

                if (this.autoScroll && index === waitingSegments.length - 1) {
                    requestAnimationFrame(() => {
                        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
                    });
                }
            }, index * 50);
        });
    }

    getWaitingSegments() {
        const targetMap = new Map();
        this.targetSegments.forEach(t => targetMap.set(t.marker, t));
        return this.sourceSegments.filter(source => !targetMap.has(source.marker));
    }

    expandAll() {
        document.querySelectorAll('.event-details').forEach(d => d.classList.add('visible'));
        document.querySelectorAll('.expand-btn').forEach(b => {
            b.classList.add('expanded');
            b.innerHTML = '<span class="icon">▼</span> Hide Details';
        });
    }

    collapseAll() {
        document.querySelectorAll('.event-details').forEach(d => d.classList.remove('visible'));
        document.querySelectorAll('.expand-btn').forEach(b => {
            b.classList.remove('expanded');
            b.innerHTML = '<span class="icon">▼</span> Show Details';
        });
    }

    clearTimeline() {
        this.timeline.innerHTML = `<div class="timeline-empty">Timeline cleared. New events will appear here.<br><br><small>Events will accumulate here. Enable "Limit events" to prevent performance issues.</small></div>`;
        this.eventCount = 0;
        this.stats = { total: 0, matched: 0, orphan: 0, gap: 0 };
        this.targetSegments = [];
        this.renderTimes = [];
        this.updateStatsDisplay();
        this.eventCounter.textContent = 0;
        this.renderMarkerBreakdown();
        this.updatePerfIndicator();
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

        const rows = [];
        const orphanRows = [];
        const waitingMarkers = [];

        this.sourceSegments.forEach(source => {
            const target = targetMap.get(source.marker);
            const hasTarget = !!target;
            const status = hasTarget ? 'matched' : 'waiting';

            if (!hasTarget) waitingMarkers.push(source.marker);

            rows.push({
                marker: source.marker,
                status: status,
                statusText: hasTarget ? '✅ Matched' : '⏳ Waiting',
                sourcePreview: truncate(source.text, 40),
                targetPreview: hasTarget ? truncate(target.text, 40) : '—'
            });
        });

        this.targetSegments.forEach(target => {
            if (!this.sourceSegments.find(s => s.marker === target.marker)) {
                orphanRows.push({
                    marker: target.marker,
                    status: 'orphan',
                    statusText: '⚠️ Orphan',
                    sourcePreview: '—',
                    targetPreview: truncate(target.text, 40)
                });
            }
        });

        this.stats.gap = waitingMarkers.length;
        this.debouncedStatsUpdate();

        const allRows = [...rows, ...orphanRows];
        let html = '<table class="breakdown-table"><thead><tr>';
        html += '<th style="width: 80px;">Marker</th>';
        html += '<th style="width: 100px;">Status</th>';
        html += '<th style="width: 45%;">Source Preview</th>';
        html += '<th style="width: 45%;">Target Preview</th>';
        html += '</tr></thead><tbody>';

        allRows.forEach(row => {
            html += `<tr><td><strong>${row.marker}</strong></td>`;
            html += `<td><span class="status-badge status-${row.status}">${row.statusText}</span></td>`;
            html += `<td>${escapeHtml(row.sourcePreview)}</td>`;
            html += `<td>${escapeHtml(row.targetPreview)}</td></tr>`;
        });

        html += '</tbody></table>';

        if (waitingMarkers.length > 0) {
            html += `<div class="waiting-list">`;
            html += `<strong>⏳ ${waitingMarkers.length} marker(s) still waiting for AI response:</strong>`;
            html += `<div class="waiting-markers">${waitingMarkers.join(', ')}</div>`;
            html += `</div>`;
        }

        container.innerHTML = html;

        const renderTime = performance.now() - startTime;
        this.trackRenderTime(renderTime);
    }

    processSegment(segment) {
        const startTime = performance.now();

        if (this.timeline.querySelector('.timeline-empty')) {
            this.timeline.innerHTML = '';
        }

        if (this.limitEvents && this.eventCount >= this.maxEvents) {
            const firstEvent = this.timeline.querySelector('.event');
            if (firstEvent) firstEvent.remove();
        } else {
            this.eventCount++;
        }

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

        this.renderEvent(eventData);
        this.debouncedStatsUpdate();
        this.eventCounter.textContent = this.eventCount;

        if (this.autoRefreshBreakdown) {
            this.debouncedBreakdownRender();
        }

        if (this.autoScroll) {
            requestAnimationFrame(() => {
                window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
            });
        }

        const renderTime = performance.now() - startTime;
        this.trackRenderTime(renderTime);
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

    renderEvent(eventData) {
        const detailsId = `details-${eventData.number}`;
        const div = document.createElement('div');
        div.className = `event severity-${eventData.severity}`;
        div.dataset.marker = eventData.marker;

        let html = `
            <div class="event-number">#${eventData.number}</div>
            <div class="event-header">
                <span class="event-time">${eventData.timestamp}</span>
                <span class="severity-badge ${eventData.severity}">
                    <span class="severity-icon">${eventData.severity === 'success' ? '✓' : eventData.severity === 'info' ? 'ℹ' : eventData.severity === 'warning' ? '⚠' : '✖'}</span>
                    ${eventData.severityLabel}
                </span>
                <span class="type-badge ${eventData.type}">${eventData.type.toUpperCase()}</span>
            </div>
            <div class="event-summary">
                ${renderSummaryJSON(eventData.jsonPair)}
                <div class="summary-status">
                    <div class="status-text">
                        <span class="status-icon">${eventData.statusIcon}</span>
                        ${eventData.statusText}
                    </div>
                    <button class="expand-btn" data-target="${detailsId}">
                        <span class="icon">▼</span> Show ${eventData.steps.length} Debug Steps
                    </button>
                </div>
            </div>
            <div class="event-details" id="${detailsId}">
                <div class="details-title">
                    🔍 Step-by-Step ${eventData.type === 'orphan' ? 'ORPHAN' : eventData.type === 'waiting' ? 'WAITING' : 'MATCHED'} Processing Details
                    <span style="margin-left: auto; font-size: 11px; color: #999;">${eventData.steps.length} detailed steps</span>
                </div>
        `;

        eventData.steps.forEach((step, i) => {
            const stepSeverity = step.severity || 'info';
            const severityClass = `step-${stepSeverity}`;
            const numberClass = stepSeverity;

            html += `<div class="step ${severityClass}">
                <div class="step-title">
                    <span class="step-number ${numberClass}">${i + 1}</span>
                    <span style="flex: 1;">${step.title}</span>
                    <span class="step-severity-label ${stepSeverity}">${stepSeverity.toUpperCase()}</span>
                </div>
                <div class="step-content">
                    ${step.content}
                    ${step.code ? `<div class="code-box">${escapeHtml(step.code)}</div>` : ''}
                    ${step.data ? renderDataTable(step.data) : ''}
                    ${step.flow ? renderFlow(step.flow) : ''}
                    ${step.comparison ? renderComparison(step.comparison) : ''}
                    ${step.json ? renderJSONInSteps(step.json) : ''}
                    ${step.diagnostic ? renderDiagnostics(step.diagnostic) : ''}
                    ${step.progress ? renderProgress(step.progress) : ''}
                    ${step.alert ? renderAlert(step.alert) : ''}
                </div>
            </div>`;
        });

        html += `</div>`;
        div.innerHTML = html;

        const expandBtn = div.querySelector('.expand-btn');
        expandBtn.addEventListener('click', () => this.toggleDetails(detailsId, expandBtn));

        this.timeline.appendChild(div);
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

    updateStatsDisplay() {
        document.getElementById('totalEvents').textContent = this.stats.total;
        document.getElementById('matchedCount').textContent = this.stats.matched;
        document.getElementById('orphanCount').textContent = this.stats.orphan;
        document.getElementById('gapCount').textContent = this.stats.gap;
    }
}

// Initialize debugger when DOM is ready
new ProcessDebugger();