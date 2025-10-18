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
    
    debounced.flush = function() {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
        }
    };
    
    return debounced;
}

/**
 * Fixed throttle with proper flush support
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
            // Execute immediately
            func.apply(this, args);
            inThrottle = true;
            lastArgs = null; // Clear immediately after execution
            
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
        // else: call is throttled, lastArgs will be executed after timeout
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