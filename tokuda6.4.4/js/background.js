/**
 * Background Service Worker
 * Captures POT token + handles AI Studio tab automation
 */

let lastPot = null;
let lastVideoId = null;
let aiStudioTabId = null;
let youtubeTabId = null;

// ===== POT Token Interception =====
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === 'xmlhttprequest' || details.type === 'fetch') {
      const url = new URL(details.url);
      const pot = url.searchParams.get('pot');
      const fromExt = url.searchParams.get('fromExt');
      const videoId = url.searchParams.get('v');

      if (!fromExt && pot) {
        lastPot = pot;
        lastVideoId = videoId;
      }
    }
  },
  { urls: ['https://www.youtube.com/api/timedtext?*'] }
);

// ===== Message Routing =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPot') {
    sendResponse({
      pot: request.videoId === lastVideoId ? lastPot : null,
      videoId: lastVideoId,
      valid: request.videoId === lastVideoId
    });
    return true;
  }

  if (request.action === 'openAIStudio') {
    handleOpenAIStudio(request, sender);
    sendResponse({ success: true });
    return true;
  }

  if (['aiStudioUpdate', 'aiStudioError', 'aiStudioStarted'].includes(request.action)) {
    relayToYouTube(request);
    return true;
  }
});

// ===== AI Studio Tab Management =====
const handleOpenAIStudio = (request, sender) => {
  youtubeTabId = sender.tab?.id;
  console.log(`📋 Opening AI Studio from YouTube tab ${youtubeTabId}`);

  chrome.tabs.create(
    { url: 'https://aistudio.google.com/prompts/new_chat', active: true },
    (tab) => {
      aiStudioTabId = tab.id;
      let injected = false;

      const timeoutId = setTimeout(() => {
        if (!injected) {
          console.error('⏱️ AI Studio page load timeout');
          notifyYouTube({ action: 'aiStudioError', error: 'Page load timeout (30s)' });
        }
      }, 30000);

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeoutId);
          injectAutomationScript(tab.id, request);
          injected = true;
        }
      });
    }
  );
};

const injectAutomationScript = (tabId, request) => {
  console.log(`✅ AI Studio tab ${tabId} loaded, injecting script...`);

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Tab was closed before injection');
      return;
    }

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        files: ['js/app/automation.js']
      })
      .then(() => {
        console.log('✅ Automation script injected');
        chrome.tabs
          .sendMessage(tab.id, {
            action: 'startAutomation',
            promptText: request.promptText,
            cardName: request.cardName || 'AI Studio Automation'
          })
          .catch((err) => {
            console.error('❌ Failed to send start message:', err);
            notifyYouTube({ action: 'aiStudioError', error: 'Failed to start automation: ' + err.message });
          });
      })
      .catch((err) => {
        console.error('❌ Script injection failed:', err);
        notifyYouTube({ action: 'aiStudioError', error: 'Failed to inject script: ' + err.message });
      });
  });
};

const relayToYouTube = (message) => {
  if (youtubeTabId) {
    chrome.tabs.sendMessage(youtubeTabId, message).catch((err) => {
      console.error('❌ Failed to relay to YouTube tab:', err);
    });
  }
};

const notifyYouTube = (message) => {
  if (youtubeTabId) {
    chrome.tabs.sendMessage(youtubeTabId, message).catch((err) => {
      console.error('❌ Failed to notify YouTube tab:', err);
    });
  }
};

// ===== Tab Cleanup =====
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === aiStudioTabId) {
    console.log('🚪 AI Studio tab closed');
    aiStudioTabId = null;
    notifyYouTube({ action: 'aiStudioClosed' });
  }

  if (tabId === youtubeTabId) {
    console.log('🚪 YouTube tab closed');
    youtubeTabId = null;
  }
});