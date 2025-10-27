/**
 * Content Script - YouTube Integration
 */

(async () => {
  const { getVideoId, $ } = await import(chrome.runtime.getURL('js/app/utils/dom.js'));
  const { createUI } = await import(chrome.runtime.getURL('js/app/ui/main.js'));

  let currentVideoId = null;
  let debounceTimer = null;

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

  const debouncedUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateUI, 100);
  };

  const observeNavigation = () => {
    document.addEventListener('yt-navigate-finish', debouncedUpdate);
    
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