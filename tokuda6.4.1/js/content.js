/**
 * Content Script - YouTube Integration
 */

(async () => {
    const { getVideoId } = await import(chrome.runtime.getURL('js/app/utils/helpers.js'));
    const { createUI } = await import(chrome.runtime.getURL('js/app/ui/main.js'));
  
    let currentVideoId = null;
    let debounceTimer = null;
    let navigationCleanup = null;
  
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
        const container = document.querySelector('#captionDownloadContainer');
        if (container) container.remove();
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
      if (navigationCleanup) {
        navigationCleanup();
      }
  
      const handleNavigate = debouncedUpdate;
      const handlePopState = debouncedUpdate;
      
      document.addEventListener('yt-navigate-finish', handleNavigate);
      window.addEventListener('popstate', handlePopState);
      
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
      
      navigationCleanup = () => {
        document.removeEventListener('yt-navigate-finish', handleNavigate);
        window.removeEventListener('popstate', handlePopState);
        observer.disconnect();
        
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
        
        console.log('🧹 Navigation listeners cleaned up');
      };
    };
  
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'aiStudioUpdate' || 
          request.action === 'aiStudioError' || 
          request.action === 'aiStudioStarted' ||
          request.action === 'aiStudioClosed') {
        
        console.log(`📨 Content script received: ${request.action}`);
        
        window.dispatchEvent(new CustomEvent('aiStudioMessage', {
          detail: request
        }));
        
        sendResponse({ received: true });
      }
      
      return true;
    });
  
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
      if (navigationCleanup) {
        navigationCleanup();
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    });
  
    init();
  })();