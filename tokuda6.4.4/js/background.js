// tokuda6.4.4/js/background.js
/**
 * Background Service Worker - With Audio Injector
 */

let lastPot = null;
let lastVideoId = null;
let aiStudioTabId = null;
let youtubeTabId = null;
let tabGroupId = null;

// Keep-alive
let keepAlive;
const startKeepAlive = () => {
  if (keepAlive) clearInterval(keepAlive);
  keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
};
startKeepAlive();
chrome.runtime.onStartup.addListener(startKeepAlive);
chrome.runtime.onInstalled.addListener(startKeepAlive);

// POT interception
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = new URL(details.url);
    const pot = url.searchParams.get('pot');
    const fromExt = url.searchParams.get('fromExt');
    const videoId = url.searchParams.get('v');
    if (!fromExt && pot) {
      lastPot = pot;
      lastVideoId = videoId;
    }
  },
  { urls: ['https://www.youtube.com/api/timedtext?*'] }
);

// Safe message sender
const sendToYouTube = (message) => {
  if (!youtubeTabId) return;
  chrome.tabs.get(youtubeTabId, (tab) => {
    if (chrome.runtime.lastError) {
      youtubeTabId = null;
    } else {
      chrome.tabs.sendMessage(youtubeTabId, message).catch(() => {});
    }
  });
};

// Message routing
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPot') {
    sendResponse({
      pot: request.videoId === lastVideoId ? lastPot : null,
      videoId: lastVideoId,
      valid: request.videoId === lastVideoId
    });
    return false;
  }

  if (request.action === 'openAIStudio') {
    youtubeTabId = sender.tab?.id;
    
    chrome.tabs.get(youtubeTabId, (youtubeTab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: 'YouTube tab not found' });
        return;
      }

      chrome.tabs.create(
        {
          url: 'https://aistudio.google.com/prompts/new_chat',
          active: false,
          index: youtubeTab.index + 1
        },
        async (aiStudioTab) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
            return;
          }

          aiStudioTabId = aiStudioTab.id;

          // Create tab group
          try {
            if (youtubeTab.groupId && youtubeTab.groupId !== -1) {
              await chrome.tabs.group({
                tabIds: [aiStudioTabId],
                groupId: youtubeTab.groupId
              });
              tabGroupId = youtubeTab.groupId;
            } else {
              tabGroupId = await chrome.tabs.group({
                tabIds: [youtubeTabId, aiStudioTabId]
              });
              
              await chrome.tabGroups.update(tabGroupId, {
                title: 'Translation Workspace',
                color: 'blue'
              });
            }
          } catch (err) {
            console.warn('Tab grouping failed:', err);
          }

          let injected = false;
          const timeout = setTimeout(() => {
            if (!injected) {
              sendToYouTube({ action: 'aiStudioError', error: 'Page load timeout (30s)' });
            }
          }, 30000);

          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === aiStudioTab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              clearTimeout(timeout);

              // ===== INJECT BOTH SCRIPTS =====
              chrome.scripting.executeScript({
                target: { tabId },
                files: [
                  'js/app/audio-injector.js',  // ← Inject audio first
                  'js/app/automation.js'        // ← Then automation
                ]
              }).then(() => {
                // Wait for scripts to initialize
                setTimeout(() => {
                  // Start audio (already auto-starts, but ensure it)
                  chrome.tabs.sendMessage(tabId, { action: 'startAudio' }).catch(() => {});
                  
                  // Then start automation
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, {
                      action: 'startAutomation',
                      promptText: request.promptText,
                      cardName: request.cardName || 'AI Studio'
                    }).then(() => {
                      injected = true;
                    }).catch((err) => {
                      sendToYouTube({ action: 'aiStudioError', error: 'Failed to start: ' + err.message });
                    });
                  }, 200);
                }, 500);
              }).catch((err) => {
                sendToYouTube({ action: 'aiStudioError', error: 'Failed to inject: ' + err.message });
              });
            }
          });

          sendResponse({ success: true });
        }
      );
    });
    
    return true;
  }

  if (['aiStudioUpdate', 'aiStudioError', 'aiStudioStarted'].includes(request.action)) {
    sendToYouTube(request);
    return false;
  }

  return false;
});

// Tab cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === aiStudioTabId) {
    aiStudioTabId = null;
    sendToYouTube({ action: 'aiStudioClosed' });
  }
  if (tabId === youtubeTabId) {
    youtubeTabId = null;
  }
});