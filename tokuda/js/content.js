(async () => {
  // ✅ Single import for faster loading
  const { getVideoId, $ } = await import(chrome.runtime.getURL('js/modules/utils.js'));
  const { createUI } = await import(chrome.runtime.getURL('js/modules/ui.js'));

  let currentVideoId = null;
  let debounceTimer = null;

  // ✅ Get tracks from YouTube's already-parsed data (no fetching!)
  const getTracksFromWindow = () => {
    try {
      // Try multiple sources where YouTube stores player data
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

  // ✅ Fallback: fetch only if window data unavailable
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

  // ✅ Main update function
  const updateUI = async () => {
    const videoId = getVideoId();
    
    // No video ID = remove UI
    if (!videoId) {
      $('#captionDownloadContainer')?.remove();
      currentVideoId = null;
      return;
    }
    
    // Same video = skip
    if (videoId === currentVideoId) return;
    currentVideoId = videoId;
    
    // Try to get tracks from window first (instant!)
    let tracks = getTracksFromWindow();
    
    // If not available, wait a bit and try again
    if (!tracks) {
      await new Promise(resolve => setTimeout(resolve, 300));
      tracks = getTracksFromWindow();
    }
    
    // Still no tracks? Fetch from API (slow fallback)
    if (!tracks) {
      tracks = await fetchTracksFromAPI(videoId);
    }
    
    createUI(tracks || []);
  };

  // ✅ Debounced update to prevent rapid re-renders
  const debouncedUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateUI, 100);
  };

  // ✅ Listen to YouTube's SPA navigation events (most reliable)
  const observeNavigation = () => {
    // Method 1: YouTube's custom event (fires on navigation)
    document.addEventListener('yt-navigate-finish', debouncedUpdate);
    
    // Method 2: History API changes (backup)
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
    
    // Method 3: MutationObserver for DOM changes (fallback)
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

  // ✅ Wait for DOM ready
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