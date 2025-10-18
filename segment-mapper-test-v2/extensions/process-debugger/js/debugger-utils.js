/**
 * Debugger Utilities
 */

export function debounce(func, wait) {
    let timeout;
    
    const debounced = function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
    
    debounced.cancel = function() {
        clearTimeout(timeout);
        timeout = undefined;
    };
    
    debounced.flush = function() {
        if (timeout !== undefined) {
            clearTimeout(timeout);
            timeout = undefined;
        }
    };
    
    return debounced;
}

export function throttle(func, limit) {
    let inThrottle = false;
    let lastArgs = null;
    let lastThis = null;
    let timeoutId = null;

    function throttled(...args) {
        lastArgs = args;
        lastThis = this;

        if (!inThrottle) {
            // Execute immediately
            func.apply(this, args);
            inThrottle = true;
            lastArgs = null;

            // Schedule throttle reset
            timeoutId = setTimeout(() => {
                inThrottle = false;
                timeoutId = null;

                // Execute pending call if exists
                if (lastArgs !== null) {
                    const savedArgs = lastArgs;
                    const savedThis = lastThis;
                    lastArgs = null;
                    lastThis = null;
                    throttled.apply(savedThis, savedArgs);
                }
            }, limit);
        }
    }

    throttled.pending = function() {
        return lastArgs !== null;
    };

    throttled.flush = function() {
        if (lastArgs !== null) {
            clearTimeout(timeoutId);
            const savedArgs = lastArgs;
            const savedThis = lastThis;
            lastArgs = null;
            lastThis = null;
            inThrottle = false;
            timeoutId = null;
            func.apply(savedThis, savedArgs);
        }
    };

    throttled.cancel = function() {
        clearTimeout(timeoutId);
        inThrottle = false;
        lastArgs = null;
        lastThis = null;
        timeoutId = null;
    };

    return throttled;
}

export const truncate = (str, len) =>
    str.length > len ? str.substring(0, len) + '...' : str;

export const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

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