/**
 * Content Script - YouTube Integration
 * Injects UI and monitors navigation
 */

(async () => {
  const { getVideoId } = await import(chrome.runtime.getURL('js/app/lib/helpers.js'));
  const { createUI } = await import(chrome.runtime.getURL('js/app/ui/main.js'));

  let currentVideoId = null;
  let debounceTimer = null;
  let cleanupFn = null;

  // ===== Track Extraction =====
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
        if (tracks?.length) return tracks;
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

  // ===== UI Update =====
  const updateUI = async () => {
    const videoId = getVideoId();

    if (!videoId) {
      document.querySelector('#captionDownloadContainer')?.remove();
      currentVideoId = null;
      return;
    }

    if (videoId === currentVideoId) return;
    currentVideoId = videoId;

    let tracks = getTracksFromWindow();

    if (!tracks) {
      await new Promise((resolve) => setTimeout(resolve, 300));
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

  // ===== Navigation Monitoring =====
  const observeNavigation = () => {
    if (cleanupFn) cleanupFn();

    const handleNavigate = debouncedUpdate;
    const handlePopState = debouncedUpdate;

    document.addEventListener('yt-navigate-finish', handleNavigate);
    window.addEventListener('popstate', handlePopState);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      debouncedUpdate();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      debouncedUpdate();
    };

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

    observer.observe(document.body, { childList: true, subtree: true });

    cleanupFn = () => {
      document.removeEventListener('yt-navigate-finish', handleNavigate);
      window.removeEventListener('popstate', handlePopState);
      observer.disconnect();
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      console.log('🧹 Navigation listeners cleaned up');
    };
  };

  // ===== Message Relay (from background to page) =====
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (['aiStudioUpdate', 'aiStudioError', 'aiStudioStarted', 'aiStudioClosed'].includes(request.action)) {
      console.log(`📨 Content script received: ${request.action}`);
      window.dispatchEvent(new CustomEvent('aiStudioMessage', { detail: request }));
      sendResponse({ received: true });
    }
    return true;
  });

  // ===== Initialization =====
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

  window.addEventListener('beforeunload', () => {
    if (cleanupFn) cleanupFn();
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  init();
})();