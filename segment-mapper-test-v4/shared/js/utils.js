/**
 * Shared Utility Functions
 * Single source of truth for common utilities
 */

/**
 * Debounce function with cancel, flush, and pending support
 */
export function debounce(func, delay) {
  let timeoutId;
  let lastArgs = null;
  let lastThis = null;

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      lastArgs = null;
      lastThis = null;
      func.apply(this, args);
    }, delay);
  }

  debounced.cancel = function () {
    clearTimeout(timeoutId);
    timeoutId = undefined;
    lastArgs = null;
    lastThis = null;
  };

  debounced.flush = function () {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;

      if (lastArgs !== null) {
        const savedArgs = lastArgs;
        const savedThis = lastThis;
        lastArgs = null;
        lastThis = null;
        func.apply(savedThis, savedArgs);
      }
    }
  };

  debounced.pending = function () {
    return timeoutId !== undefined;
  };

  return debounced;
}

/**
 * Throttle function with pending, flush, and cancel support
 * Improved version with better state management
 */
export function throttle(func, limit) {
  let inThrottle = false;
  let lastArgs = null;
  let lastThis = null;
  let timeoutId = null;
  let lastCallTime = 0;

  function throttled(...args) {
    const now = Date.now();
    lastArgs = args;
    lastThis = this;

    if (!inThrottle) {
      // Execute immediately if not in throttle period
      func.apply(this, args);
      inThrottle = true;
      lastCallTime = now;
      lastArgs = null;
      lastThis = null;

      // Clear timeout if exists
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      // Set timeout to reset throttle
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

  throttled.pending = function () {
    return lastArgs !== null;
  };

  throttled.flush = function () {
    if (lastArgs !== null) {
      // Cancel timeout
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Execute pending call
      const savedArgs = lastArgs;
      const savedThis = lastThis;
      lastArgs = null;
      lastThis = null;
      inThrottle = false;

      func.apply(savedThis, savedArgs);
    }
  };

  throttled.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    inThrottle = false;
    lastArgs = null;
    lastThis = null;
    lastCallTime = 0;
  };

  throttled.reset = function () {
    throttled.cancel();
  };

  return throttled;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Truncate string to specified length
 */
export function truncate(str, maxLength) {
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
}