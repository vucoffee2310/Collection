/**
 * Robust debounce function with leading/trailing edge options.
 * Ensures the last call is always executed if trailing is enabled.
 * 
 * @param {Function} func The function to debounce
 * @param {number} delay The delay in milliseconds
 * @param {Object} options Configuration options
 * @param {boolean} options.leading Execute on leading edge (default: false)
 * @param {boolean} options.trailing Execute on trailing edge (default: true)
 * @param {number} options.maxWait Maximum time func is allowed to be delayed
 * @returns {Function} The debounced function with cancel() and flush() methods
 */
export function debounce(func, delay, options = {}) {
    const { leading = false, trailing = true, maxWait } = options;
    
    let timeoutId;
    let lastCallTime;
    let lastInvokeTime = 0;
    let lastArgs;
    let lastThis;
    let result;
    
    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
    }
    
    function shouldInvoke(time) {
        const timeSinceLastCall = time - (lastCallTime || 0);
        const timeSinceLastInvoke = time - lastInvokeTime;
        
        return (
            lastCallTime === undefined ||
            timeSinceLastCall >= delay ||
            timeSinceLastCall < 0 ||
            (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
        );
    }
    
    function leadingEdge(time) {
        lastInvokeTime = time;
        timeoutId = setTimeout(timerExpired, delay);
        return leading ? invokeFunc(time) : result;
    }
    
    function trailingEdge(time) {
        timeoutId = undefined;
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
    }
    
    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = delay - timeSinceLastCall;
        const remainingWait = maxWait !== undefined
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
        timeoutId = setTimeout(timerExpired, remainingWait);
    }
    
    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;
        
        if (isInvoking) {
            if (timeoutId === undefined) {
                return leadingEdge(time);
            }
            if (maxWait !== undefined) {
                timeoutId = setTimeout(timerExpired, delay);
                return invokeFunc(time);
            }
        }
        
        if (timeoutId === undefined) {
            timeoutId = setTimeout(timerExpired, delay);
        }
        
        return result;
    }
    
    debounced.cancel = function() {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timeoutId = undefined;
    };
    
    debounced.flush = function() {
        return timeoutId === undefined ? result : trailingEdge(Date.now());
    };
    
    debounced.pending = function() {
        return timeoutId !== undefined;
    };
    
    return debounced;
}

/**
 * Robust throttle function with leading/trailing edge options.
 * Ensures the last call is executed if trailing is enabled.
 * 
 * @param {Function} func The function to throttle
 * @param {number} limit The throttle limit in milliseconds
 * @param {Object} options Configuration options
 * @param {boolean} options.leading Execute on leading edge (default: true)
 * @param {boolean} options.trailing Execute on trailing edge (default: true)
 * @returns {Function} The throttled function with cancel() and flush() methods
 */
export function throttle(func, limit, options = {}) {
    const { leading = true, trailing = true } = options;
    return debounce(func, limit, {
        leading,
        trailing,
        maxWait: limit
    });
}