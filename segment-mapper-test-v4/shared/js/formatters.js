/**
 * Shared Formatting Functions
 */

import { escapeHtml } from './utils.js';

/**
 * Format JSON with syntax highlighting
 */
export function formatJSON(obj) {
    return JSON.stringify(obj, null, 2)
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "([^"]+)"/g, (m, p) =>
            p.includes('PENDING')
                ? `: <span class="json-pending">"${escapeHtml(p)}"</span>`
                : `: <span class="json-string">"${escapeHtml(p)}"</span>`
        )
        .replace(/: null/g, ': <span class="json-null">null</span>')
        .replace(/"([a-z]-\d+)"/g, '<span class="json-marker">"$1"</span>');
}

/**
 * Get summary of source markers grouped by base marker
 */
export function getSourceMarkerSummary(sourceSegments) {
    const summary = {};
    sourceSegments.forEach(seg => {
        const base = seg.marker.split('-')[0];
        if (!summary[base]) summary[base] = [];
        summary[base].push(seg.marker);
    });

    const result = {};
    Object.keys(summary).sort().forEach(base => {
        result[`(${base}) count`] = summary[base].length;
        result[`(${base}) markers`] = summary[base].join(', ');
    });

    return Object.keys(result).length === 0
        ? { 'Status': 'No source segments loaded' }
        : result;
}