/**
 * Simplified debounce - only features actually used
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
    
    return debounced;
}

/**
 * Simplified throttle with flush support (used in mapper.js)
 */
export function throttle(func, limit) {
    let inThrottle;
    let lastArgs;
    let lastThis;
    let timeoutId;
    
    function throttled(...args) {
        lastArgs = args;
        lastThis = this;
        
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            timeoutId = setTimeout(() => {
                inThrottle = false;
                if (lastArgs) {
                    throttled.apply(lastThis, lastArgs);
                }
            }, limit);
        }
    }
    
    throttled.pending = function() {
        return inThrottle;
    };
    
    throttled.flush = function() {
        if (inThrottle && lastArgs) {
            clearTimeout(timeoutId);
            func.apply(lastThis, lastArgs);
            inThrottle = false;
            lastArgs = lastThis = undefined;
        }
    };
    
    return throttled;
}