/**
 * Background Service Worker
 * Captures POT (Proof of Origin Token) from YouTube API requests
 * Handles AI Studio tab automation
 */

let lastPot = null;
let lastVideoId = null;

// AI Studio automation state
let aiStudioTabId = null;
let injectedTabs = new Set();

chrome.webRequest.onBeforeRequest.addListener(
    details => {
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
    {
        urls: ["https://www.youtube.com/api/timedtext?*"]
    }
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // ===== POT Token =====
    if (request.action === 'getPot') {
        const isValid = request.videoId === lastVideoId;
        sendResponse({ 
            pot: isValid ? lastPot : null,
            videoId: lastVideoId,
            valid: isValid
        });
        return true;
    }
    
    // ===== Open AI Studio =====
    if (request.action === 'openAIStudio') {
        chrome.tabs.create({
            url: 'https://aistudio.google.com/prompts/new_chat',
            active: true
        }, (tab) => {
            aiStudioTabId = tab.id;
            
            // Store data for injection
            chrome.storage.session.set({
                [`aiStudioData_${tab.id}`]: {
                    promptText: request.promptText,
                    cardName: request.cardName || 'AI Studio Automation',
                    sourceTabId: sender.tab?.id
                }
            });
            
            sendResponse({ success: true, tabId: tab.id });
        });
        return true;
    }
    
    // ===== Update Dashboard (from AI Studio) =====
    if (request.action === 'updateDashboard') {
        console.log('📨 BACKGROUND received updateDashboard:', {
            textLength: request.responseText?.length,
            isComplete: request.isComplete,
            senderTabId: sender.tab?.id
        });
        
        chrome.storage.session.get([`aiStudioData_${sender.tab.id}`], (result) => {
            const data = result[`aiStudioData_${sender.tab.id}`];
            
            console.log('📨 Retrieved data:', {
                hasData: !!data,
                sourceTabId: data?.sourceTabId
            });
            
            if (data?.sourceTabId) {
                console.log('📨 Sending to source tab:', data.sourceTabId);
                
                chrome.tabs.sendMessage(data.sourceTabId, {
                    action: 'aiStudioUpdate',
                    responseText: request.responseText,
                    isComplete: request.isComplete,
                    isError: request.isError,
                    timestamp: request.timestamp
                }).then(() => {
                    console.log('✅ Message sent to source tab successfully');
                    
                    // Clean up storage only when complete
                    if (request.isComplete) {
                        chrome.storage.session.remove([`aiStudioData_${sender.tab.id}`]);
                        console.log('🧹 Cleaned up storage for completed automation');
                    }
                }).catch(err => {
                    console.error('❌ Failed to send update to source tab:', err);
                });
            } else {
                console.warn('⚠️ No source tab ID found in storage');
            }
        });
        
        sendResponse({ received: true });
        return true;
    }
    
    // ===== Start Playing =====
    if (request.action === 'startPlaying') {
        console.log('🎬 AI Studio automation started');
        return true;
    }
});

// Inject automation script ONCE when AI Studio loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && 
        tab.url?.startsWith('https://aistudio.google.com/prompts/new_chat') &&
        !injectedTabs.has(tabId)) {
        
        chrome.storage.session.get([`aiStudioData_${tabId}`], (result) => {
            const data = result[`aiStudioData_${tabId}`];
            
            if (data) {
                console.log('✅ Injecting automation script into AI Studio (Tab:', tabId, ')');
                
                injectedTabs.add(tabId);
                
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: runAutomation,
                    args: [data.promptText, data.cardName]
                }).then(() => {
                    console.log('✅ Automation script injected successfully');
                }).catch(err => {
                    console.error('❌ Failed to inject script:', err);
                    injectedTabs.delete(tabId);
                });
            }
        });
    }
});

// Function to inject (imports and runs the automation)
function runAutomation(promptText, cardName) {
    // Prevent multiple executions
    if (window.__AUTOMATION_RUNNING__) {
        console.log('⚠️ Automation already running, skipping...');
        return;
    }
    
    window.__AUTOMATION_RUNNING__ = true;
    console.log('🎯 Starting automation with direct import...');
    
    // Dynamically import and run
    import(chrome.runtime.getURL('js/app/automation/script.js'))
        .then(module => {
            console.log('✅ Automation module loaded');
            module.automationScript(promptText, cardName);
        })
        .catch(err => {
            console.error('❌ Failed to load automation script:', err);
            window.__AUTOMATION_RUNNING__ = false;
        });
}

// Clean up when AI Studio tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    injectedTabs.delete(tabId);
    
    if (tabId === aiStudioTabId) {
        aiStudioTabId = null;
        chrome.storage.session.remove([`aiStudioData_${tabId}`]);
        console.log('🗑️ AI Studio tab closed');
    }
});