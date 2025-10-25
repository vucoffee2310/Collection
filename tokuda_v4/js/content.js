/**
 * Content Script - YouTube Integration
 * Injects subtitle tools UI into YouTube video pages
 */

(async () => {
  const { getVideoId, $ } = await import(chrome.runtime.getURL('js/app/utils/dom.js'));
  const { createUI } = await import(chrome.runtime.getURL('js/app/ui/main.js'));

  let currentVideoId = null;
  let debounceTimer = null;

  /**
   * Get caption tracks from YouTube's player response
   */
  const getTracksFromWindow = () => {
    try {
      const sources = [
        window.ytInitialPlayerResponse,
        window.ytplayer?.config?.args?.player_response,
        document.querySelector('ytd-app')?.data?.playerResponse
      ];

      for (const source of sources) {
        if (!source) continue;
        
        const data = typeof source === 'string' ? JSON.parse(source) : source;
        const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (tracks?.length) {
          return tracks;
        }
      }
    } catch (err) {
      console.warn('Failed to get tracks from window:', err);
    }
    
    return null;
  };

  /**
   * Fetch caption tracks from YouTube page HTML (fallback)
   */
  const fetchTracksFromAPI = async (videoId) => {
    try {
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
      const html = await response.text();
      const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      
      if (match) {
        const data = JSON.parse(match[1]);
        return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      }
    } catch (err) {
      console.error('Failed to fetch tracks:', err);
    }
    
    return [];
  };

  /**
   * Update UI with current video's caption tracks
   */
  const updateUI = async () => {
    const videoId = getVideoId();
    
    if (!videoId) {
      $('#captionDownloadContainer')?.remove();
      currentVideoId = null;
      return;
    }
    
    if (videoId === currentVideoId) return;
    currentVideoId = videoId;
    
    // Try to get tracks from window first
    let tracks = getTracksFromWindow();
    
    // Wait and retry if not immediately available
    if (!tracks) {
      await new Promise(resolve => setTimeout(resolve, 300));
      tracks = getTracksFromWindow();
    }
    
    // Fallback to API fetch
    if (!tracks) {
      tracks = await fetchTracksFromAPI(videoId);
    }
    
    createUI(tracks || []);
  };

  /**
   * Debounced UI update to avoid excessive re-renders
   */
  const debouncedUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateUI, 100);
  };

  /**
   * Observe YouTube navigation (SPA routing)
   */
  const observeNavigation = () => {
    // YouTube custom navigation event
    document.addEventListener('yt-navigate-finish', debouncedUpdate);
    
    // History API interception
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      debouncedUpdate();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      debouncedUpdate();
    };
    
    window.addEventListener('popstate', debouncedUpdate);
    
    // DOM mutation observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const hasVideoPlayer = document.querySelector('ytd-watch-flexy');
          if (hasVideoPlayer && getVideoId() !== currentVideoId) {
            debouncedUpdate();
            break;
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };

  /**
   * Initialize extension
   */
  const init = () => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        updateUI();
        observeNavigation();
      });
    } else {
      updateUI();
      observeNavigation();
    }
  };

  init();
})();