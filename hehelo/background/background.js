// Injection Manager (inlined)
// Injection Manager (inlined)
class InjectionManager {
  constructor() {
    this.injectedTabs = new Set();
  }

  async injectScript(tabId, scriptPath, scriptName) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [scriptPath],
        world: 'MAIN'
      });
      
      console.log(`✅ ${scriptName} injected into tab ${tabId}`);
      return true;
    } catch (error) {
      console.error(`❌ ${scriptName} injection failed:`, error);
      return false;
    }
  }

  async injectXHRInterceptor(tabId) {
    return await this.injectScript(
      tabId, 
      'injected/xhr-interceptor.js',
      'XHR Interceptor'
    );
  }

  async injectAutomation(tabId) {
    return await this.injectScript(
      tabId,
      'injected/ai-automation.js',
      'AI Automation'
    );
  }

  // ⭐ NEW: Audio Injector
  async injectAudioInjector(tabId) {
    return await this.injectScript(
      tabId,
      'injected/audio-injector.js',
      'Audio Injector'
    );
  }

  async injectAll(tabId) {
    if (this.injectedTabs.has(tabId)) {
      console.log(`⚠️ Scripts already injected into tab ${tabId}`);
      return false;
    }

    console.log(`📝 Starting injection sequence for tab ${tabId}...`);

    // Step 1: Inject Audio Injector first (to bypass autoplay immediately)
    console.log('🔊 Step 1: Injecting Audio Injector...');
    const audioSuccess = await this.injectAudioInjector(tabId);
    if (!audioSuccess) {
      console.warn('⚠️ Audio Injector failed (non-critical), continuing...');
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Step 2: Inject XHR interceptor
    console.log('📡 Step 2: Injecting XHR Interceptor...');
    const xhrSuccess = await this.injectXHRInterceptor(tabId);
    
    if (!xhrSuccess) {
      console.error('❌ XHR Interceptor injection failed, aborting...');
      return false;
    }

    // Step 3: Wait, then inject automation
    console.log('⏳ Step 3: Waiting 1 second before automation...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🤖 Step 4: Injecting AI Automation...');
    const automationSuccess = await this.injectAutomation(tabId);

    if (xhrSuccess && automationSuccess) {
      this.injectedTabs.add(tabId);
      console.log(`✅ All scripts successfully injected into tab ${tabId}`);
      return true;
    }

    console.error('❌ Automation injection failed');
    return false;
  }

  removeTab(tabId) {
    this.injectedTabs.delete(tabId);
    console.log(`🗑️ Removed tab ${tabId} from injection tracking`);
  }

  hasInjected(tabId) {
    return this.injectedTabs.has(tabId);
  }
}

// Initialize injection manager
const injectionManager = new InjectionManager();
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
    url: chrome.runtime.getURL('monitor/monitor.html'),
    active: true
  });
  monitorTabId = tab.id;
  console.log('📊 Monitor tab opened:', monitorTabId);
});

// Send message to monitor tab
function sendToMonitor(message) {
  if (monitorTabId) {
    chrome.tabs.sendMessage(monitorTabId, message).catch(() => {
      console.warn('⚠️ Failed to send message to monitor tab');
      monitorTabId = null;
    });
  }
}

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message:', message.action || message.type, 'from tab:', sender.tab?.id);

  if (message.action === 'monitorReady') {
    monitorTabId = sender.tab.id;
    console.log('✅ Monitor tab registered:', monitorTabId);
    sendToMonitor({
      type: 'status',
      message: 'Monitor connected',
      statusType: 'active'
    });
  }
  
  if (message.action === 'openAIStudio') {
    console.log('🚀 Opening AI Studio...');
    chrome.tabs.create({
      url: 'https://aistudio.google.com/prompts/new_chat',
      active: true
    }, (tab) => {
      aiStudioTabId = tab.id;
      chrome.storage.local.set({ aiStudioTabId: tab.id });
      console.log('✅ AI Studio tab opened:', aiStudioTabId);
    });
  }
  
  if (message.action === 'contentScriptReady') {
    console.log('✅ Content script ready in tab:', sender.tab?.id);
  }
  
  // Forward logs to monitor
  if (message.type === 'log' || message.type === 'status') {
    sendToMonitor(message);
  }
});

// Auto-inject when AI Studio tab loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only inject on complete status, AI Studio URL, and if not already injected
  if (changeInfo.status === 'complete' && 
      tab.url && 
      tab.url.includes('aistudio.google.com') &&
      !injectionManager.hasInjected(tabId)) {  // ← ADD THIS CHECK
    
    console.log('📄 AI Studio page loaded in tab:', tabId);
    
    // Wait for page to settle
    setTimeout(async () => {
      console.log('⏳ Starting injection process...');
      const success = await injectionManager.injectAll(tabId);
      
      if (success) {
        console.log('🎉 Injection sequence completed successfully');
        sendToMonitor({
          type: 'log',
          message: '✅ All scripts injected - auto-run will start soon',
          logType: 'info'
        });
      } else {
        console.error('💥 Injection sequence failed');
        sendToMonitor({
          type: 'log',
          message: '❌ Script injection failed - check console for details',
          logType: 'error'
        });
      }
    }, 500);
  }
});

// Cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === monitorTabId) {
    console.log('🗑️ Monitor tab closed');
    monitorTabId = null;
  }
  if (tabId === aiStudioTabId) {
    console.log('🗑️ AI Studio tab closed');
    aiStudioTabId = null;
  }
  injectionManager.removeTab(tabId);
});

// Log when service worker starts
console.log('🔧 Background service worker started');