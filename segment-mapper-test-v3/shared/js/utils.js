/**
 * Shared Utility Functions
 * Single source of truth for common utilities
 */

/**
 * Debounce function with cancel and flush support
 */
export function debounce(func, delay) {
    let timeoutId;
    
    function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    }
    
    debounced.cancel = function() {
        clearTimeout(timeoutId);
        timeoutId = undefined;
    };
    
    debounced.flush = function() {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
        }
    };
    
    return debounced;
}

/**
 * Throttle function with pending, flush, and cancel support
 */
export function throttle(func, limit) {
    let inThrottle = false;
    let lastArgs = null;
    let lastThis = null;
    let timeoutId = null;
    
    function throttled(...args) {
        lastArgs = args;
        lastThis = this;
        
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            lastArgs = null;
            
            timeoutId = setTimeout(() => {
                inThrottle = false;
                timeoutId = null;
                
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

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Truncate string to specified length
 */
export function truncate(str, maxLength) {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}