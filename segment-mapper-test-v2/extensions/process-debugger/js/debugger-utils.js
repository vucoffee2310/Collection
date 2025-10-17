/**
 * Debugger Utilities
 * Helper functions for the process debugger
 */

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function formatJSON(obj) {
    return JSON.stringify(obj, null, 2)
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "([^"]+)"/g, (m, p) => {
            if (p.includes('PENDING')) {
                return `: <span class="json-pending">"${escapeHtml(p)}"</span>`;
            }
            return `: <span class="json-string">"${escapeHtml(p)}"</span>`;
        })
        .replace(/: null/g, ': <span class="json-null">null</span>')
        .replace(/"([a-z]-\d+)"/g, '<span class="json-marker">"$1"</span>');
}

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

    if (Object.keys(result).length === 0) {
        result['Status'] = 'No source segments loaded';
    }

    return result;
}