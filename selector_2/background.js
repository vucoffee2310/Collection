chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "startInspecting", title: "Start Inspecting (I)", contexts: ["all"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "startInspecting" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: "startInspectMode" });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "start-inspecting") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: "startInspectMode" });
    });
  }
});