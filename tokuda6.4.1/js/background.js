/**
 * Background Service Worker
 * Captures POT (Proof of Origin Token) from YouTube API requests
 * + Handles AI Studio tab automation with proper message routing
 */

let lastPot = null;
let lastVideoId = null;
let aiStudioTabId = null;
let youtubeTabId = null;

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === "xmlhttprequest" || details.type === "fetch") {
      const url = new URL(details.url);
      const pot = url.searchParams.get("pot");
      const fromExt = url.searchParams.get("fromExt");
      const videoId = url.searchParams.get("v");

      if (!fromExt && pot) {
        lastPot = pot;
        lastVideoId = videoId;
      }
    }
  },
  {
    urls: ["https://www.youtube.com/api/timedtext?*"],
  }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPot") {
    const isValid = request.videoId === lastVideoId;
    sendResponse({
      pot: isValid ? lastPot : null,
      videoId: lastVideoId,
      valid: isValid,
    });
    return true;
  }

  if (request.action === "openAIStudio") {
    youtubeTabId = sender.tab?.id;

    console.log(`📋 Opening AI Studio from YouTube tab ${youtubeTabId}`);

    chrome.tabs.create(
      {
        url: "https://aistudio.google.com/prompts/new_chat",
        active: true,
      },
      (tab) => {
        aiStudioTabId = tab.id;

        let injected = false;
        const timeoutId = setTimeout(() => {
          if (!injected) {
            console.error("⏱️ AI Studio page load timeout");
            if (youtubeTabId) {
              chrome.tabs.sendMessage(youtubeTabId, {
                action: "aiStudioError",
                error: "AI Studio page took too long to load (30s timeout)",
              });
            }
          }
        }, 30000);

        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(timeoutId);

            console.log(
              `✅ AI Studio tab ${tabId} loaded, injecting script...`
            );

            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError) {
                console.error("❌ Tab was closed before injection");
                return;
              }

              chrome.scripting
                .executeScript({
                  target: { tabId: tab.id },
                  files: ["js/app/automation/script.js"],
                })
                .then(() => {
                  console.log("✅ Automation script injected");
                  injected = true;

                  chrome.tabs
                    .sendMessage(tab.id, {
                      action: "startAutomation",
                      promptText: request.promptText,
                      cardName: request.cardName || "AI Studio Automation",
                    })
                    .catch((err) => {
                      console.error("❌ Failed to send start message:", err);
                      if (youtubeTabId) {
                        chrome.tabs.sendMessage(youtubeTabId, {
                          action: "aiStudioError",
                          error: "Failed to start automation: " + err.message,
                        });
                      }
                    });
                })
                .catch((err) => {
                  console.error("❌ Script injection failed:", err);

                  if (youtubeTabId) {
                    chrome.tabs.sendMessage(youtubeTabId, {
                      action: "aiStudioError",
                      error: "Failed to inject script: " + err.message,
                    });
                  }
                });
            });
          }
        });

        sendResponse({ success: true, tabId: tab.id });
      }
    );
    return true;
  }

  if (
    request.action === "aiStudioUpdate" ||
    request.action === "aiStudioError" ||
    request.action === "aiStudioStarted"
  ) {
    console.log(
      `📨 Relaying ${request.action} from AI Studio to YouTube tab ${youtubeTabId}`
    );

    if (youtubeTabId) {
      chrome.tabs.sendMessage(youtubeTabId, request).catch((err) => {
        console.error("❌ Failed to send message to YouTube tab:", err);
      });
    }

    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === aiStudioTabId) {
    console.log("🚪 AI Studio tab closed");
    aiStudioTabId = null;

    if (youtubeTabId) {
      chrome.tabs
        .sendMessage(youtubeTabId, {
          action: "aiStudioClosed",
        })
        .catch((err) => {
          console.error("Failed to notify YouTube tab:", err);
        });
    }
  }

  if (tabId === youtubeTabId) {
    console.log("🚪 YouTube tab closed");
    youtubeTabId = null;
  }
});