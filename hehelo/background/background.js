class InjectionManager {
  constructor() {
    this.injectedTabs = new Set();
    this.readyScripts = new Map();
  }

  async injectScript(tabId, scriptPath, scriptName) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [scriptPath],
        world: 'MAIN'
      });
      console.log(`✅ ${scriptName} injected`);
      return true;
    } catch (error) {
      console.error(`❌ ${scriptName} failed:`, error);
      return false;
    }
  }

  waitForScriptReady(tabId, scriptName, timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const tabReady = this.readyScripts.get(tabId) || {};
      
      if (tabReady[scriptName]) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        const tabReady = this.readyScripts.get(tabId) || {};
        if (tabReady[scriptName] || Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  markScriptReady(tabId, scriptName) {
    if (!this.readyScripts.has(tabId)) {
      this.readyScripts.set(tabId, {});
    }
    this.readyScripts.get(tabId)[scriptName] = true;
  }

  async injectAll(tabId) {
    if (this.injectedTabs.has(tabId)) return false;

    // ⭐ FIX: Add the tabId immediately to prevent race conditions from duplicate onUpdated events.
    this.injectedTabs.add(tabId);
    console.log(`🚀 Parallel injection for tab ${tabId}...`);
    const startTime = Date.now();

    // Inject all scripts in parallel
    const [audioSuccess, xhrSuccess, automationSuccess] = await Promise.all([
      this.injectScript(tabId, 'injected/audio-injector.js', 'Audio'),
      this.injectScript(tabId, 'injected/xhr-interceptor.js', 'XHR'),
      this.injectScript(tabId, 'injected/ai-automation.js', 'Automation')
    ]);

    if (!xhrSuccess || !automationSuccess) {
      console.error('❌ Critical injection failed');
      // If a critical script fails, remove the tabId to allow for a potential retry on reload.
      this.injectedTabs.delete(tabId);
      return false;
    }

    // Wait for all ready signals in parallel
    await Promise.all([
      this.waitForScriptReady(tabId, 'xhr-interceptor'),
      this.waitForScriptReady(tabId, 'ai-automation'),
      audioSuccess ? this.waitForScriptReady(tabId, 'audio-injector', 2000) : Promise.resolve()
    ]);

    console.log(`✅ All ready in ${Date.now() - startTime}ms`);
    return true;
  }

  removeTab(tabId) {
    this.injectedTabs.delete(tabId);
    this.readyScripts.delete(tabId);
  }

  hasInjected(tabId) {
    return this.injectedTabs.has(tabId);
  }
}

const injectionManager = new InjectionManager();
let monitorTabId = null;

// Open/focus monitor tab
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
    url: chrome.runtime.getURL('monitor/monitor.html'),
    active: true
  });
  monitorTabId = tab.id;
});

// Send to monitor
function sendToMonitor(message) {
  if (monitorTabId) {
    chrome.tabs.sendMessage(monitorTabId, message).catch(() => {
      monitorTabId = null;
    });
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender) => {
  const { action, type } = message;

  if (action === 'monitorReady') {
    monitorTabId = sender.tab.id;
    sendToMonitor({ type: 'status', message: 'Monitor connected', statusType: 'active' });
  }
  
  if (action === 'openAIStudio') {
    chrome.tabs.create({ url: 'https://aistudio.google.com/prompts/new_chat', active: true });
  }

  if (action === 'scriptReady' && sender.tab?.id && message.scriptName) {
    injectionManager.markScriptReady(sender.tab.id, message.scriptName);
  }
  
  if (type === 'log' || type === 'status') {
    sendToMonitor(message);
  }
});

// Auto-inject on AI Studio page load
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url?.includes('aistudio.google.com') &&
      !injectionManager.hasInjected(tabId)) {
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const success = await injectionManager.injectAll(tabId);
    sendToMonitor({
      type: 'log',
      message: success ? '✅ Scripts ready - auto-run starting' : '❌ Injection failed',
      logType: success ? 'info' : 'error'
    });
  }
});

// Cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === monitorTabId) monitorTabId = null;
  injectionManager.removeTab(tabId);
});

console.log('🔧 Background service worker started');