/**
 * Debugger Renderers
 * Rendering functions for debug UI components
 */

import { escapeHtml, formatJSON } from '../debugger-utils.js';

export function renderDataTable(data) {
    let html = '<table class="data-table">';
    Object.keys(data).forEach(key => {
        html += `<tr><th>${key}</th><td class="mono">${escapeHtml(String(data[key]))}</td></tr>`;
    });
    return html + '</table>';
}

export function renderFlow(items) {
    let html = '<div class="process-flow">';
    items.forEach(item => {
        html += `<div class="flow-item"><span class="flow-icon ${item.type}">${item.icon}</span><span>${item.text}</span></div>`;
    });
    return html + '</div>';
}

export function renderComparison(comparison) {
    return `<div class="comparison-grid">
        <div class="comparison-item">
            <div class="comparison-label">Source Text</div>
            <div class="comparison-text">${escapeHtml(comparison.source)}</div>
        </div>
        <div class="comparison-arrow">➜</div>
        <div class="comparison-item">
            <div class="comparison-label">Target Text</div>
            <div class="comparison-text">${escapeHtml(comparison.target)}</div>
        </div>
    </div>`;
}

export function renderDiagnostics(diagnostics) {
    let html = '<div class="diagnostic-box"><h4>🔬 Diagnostic Analysis</h4><ul class="diagnostic-list">';
    diagnostics.forEach(diag => {
        html += `<li>${diag}</li>`;
    });
    html += '</ul></div>';
    return html;
}

export function renderProgress(progress) {
    return `<div class="waiting-progress">
        <h4>⏳ Generation Progress</h4>
        <div style="font-size: 12px; margin-bottom: 8px;">
            Matched: ${progress.current} / ${progress.total} segments (${progress.percent}%)
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progress.percent}%">${progress.percent}%</div>
        </div>
    </div>`;
}

export function renderSummaryJSON(obj) {
    return `<div class="summary-json">${formatJSON(obj)}</div>`;
}

export function renderJSONInSteps(obj) {
    return `<div class="json-display">${formatJSON(obj)}</div>`;
}

export function renderAlert(alert) {
    if (!alert) return '';
    return `<div class="alert ${alert.type}">${alert.message.replace(/\n/g, '<br>')}</div>`;
}