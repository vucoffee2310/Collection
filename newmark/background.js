// background.js
// Manifest V3 - Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "startInspecting",
      title: "Start Inspecting (I)",
      contexts: ["all"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("[Background] Menu creation failed:", chrome.runtime.lastError.message);
      } else {
        console.log("[Background] ✅ Context menu item created successfully");
      }
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "startInspecting") {
    if (!tab?.id) {
      console.warn("[Background] No active tab to send message to");
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { action: "startInspectMode" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            `[Background] Failed to trigger inspect mode in tab ${tab.id}:`,
            chrome.runtime.lastError.message
          );
        } else {
          console.log(`[Background] ✅ Inspect mode started in tab ${tab.id}`);
        }
      }
    );
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "start-inspecting") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        console.warn("[Background] No active tab for keyboard shortcut");
        return;
      }

      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "startInspectMode" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              `[Background] Keyboard shortcut failed in tab ${activeTab.id}:`,
              chrome.runtime.lastError.message
            );
          } else {
            console.log(`[Background] ✅ Keyboard shortcut activated inspect mode in tab ${activeTab.id}`);
          }
        }
      );
    });
  }
});

console.log("[Background] Service worker initialized.");