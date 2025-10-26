/**
 * Content Script - YouTube Integration
 * Uses dynamic imports with chrome.runtime.getURL()
 */

(async () => {
  // ✅ CORRECT: Dynamic imports with chrome.runtime.getURL
  const { getVideoId } = await import(chrome.runtime.getURL('js/app/utils/dom/video-id.js'));
  const { $ } = await import(chrome.runtime.getURL('js/app/utils/dom/query.js'));
  const { createUI } = await import(chrome.runtime.getURL('js/app/ui/orchestrators/main-ui-controller.js'));

  let currentVideoId = null;
  let debounceTimer = null;

  /**
   * Get tracks from window objects
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
   * Fetch tracks from YouTube API
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
   * Update UI with tracks
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
    
    let tracks = getTracksFromWindow();
    
    if (!tracks) {
      await new Promise(resolve => setTimeout(resolve, 300));
      tracks = getTracksFromWindow();
    }
    
    if (!tracks) {
      tracks = await fetchTracksFromAPI(videoId);
    }
    
    createUI(tracks || []);
  };

  /**
   * Debounced update
   */
  const debouncedUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateUI, 100);
  };

  /**
   * Observe navigation changes
   */
  const observeNavigation = () => {
    // YouTube's custom navigation event
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
    
    // DOM mutation observer
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
   * Initialize
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

  // Start
  init();
})();