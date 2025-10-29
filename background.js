let monitorTabId = null;
let aiStudioTabId = null;

// Open monitor tab when extension icon clicked
chrome.action.onClicked.addListener(async () => {
  if (monitorTabId) {
    try {
      const tab = await chrome.tabs.get(monitorTabId);
      chrome.tabs.update(monitorTabId, { active: true });
      chrome.windows.update(tab.windowId, { focused: true });
      return;
    } catch (e) {
      monitorTabId = null;
    }
  }
  
  const tab = await chrome.tabs.create({
    url: chrome.runtime.getURL('monitor.html'),
    active: true
  });
  monitorTabId = tab.id;
});

// Send message to monitor tab
function sendToMonitor(message) {
  if (monitorTabId) {
    chrome.tabs.sendMessage(monitorTabId, message).catch(() => {
      monitorTabId = null;
    });
  }
}

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'monitorReady') {
    monitorTabId = sender.tab.id;
    sendToMonitor({
      type: 'status',
      message: 'Monitor connected',
      statusType: 'active'
    });
  }
  
  if (message.action === 'openAIStudio') {
    chrome.tabs.create({
      url: 'https://aistudio.google.com/prompts/new_chat?model=gemini-flash-latest',
      active: true
    }, (tab) => {
      aiStudioTabId = tab.id;
      chrome.storage.local.set({ aiStudioTabId: tab.id });
    });
  }
  
  // Forward logs to monitor
  if (message.type === 'log' || message.type === 'status') {
    sendToMonitor(message);
  }
});

// Auto-inject XHR interceptor when AI Studio page loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('aistudio.google.com')) {
    
    setTimeout(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['xhr-interceptor.js']
      }).then(() => {
        console.log('✅ XHR Interceptor injected into tab', tabId);
        sendToMonitor({
          type: 'log',
          message: '✅ XHR Interceptor injected successfully',
          logType: 'info'
        });
      }).catch(err => {
        console.error('❌ Injection failed:', err);
        sendToMonitor({
          type: 'log',
          message: '❌ Failed to inject XHR Interceptor: ' + err.message,
          logType: 'error'
        });
      });
    }, 1000);
  }
});

// Cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === monitorTabId) {
    monitorTabId = null;
  }
  if (tabId === aiStudioTabId) {
    aiStudioTabId = null;
  }
});