// A dictionary to store found requests, keyed by tabId
let requests = {};

// Reset data when a tab is updated (reloaded or new URL)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        requests[tabId] = [];
        updateBadge(tabId);
    }
});

// Clean up data when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    delete requests[tabId];
});

// The core listener for network requests
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        // ... (The rest of this function is identical to the previous version) ...
        const { tabId, url, method } = details;

        if (tabId === -1) return;
        if (!requests[tabId]) requests[tabId] = [];

        let payload = null;
        let poToken = null;

        if (details.requestBody && details.requestBody.raw) {
            try {
                const decodedBody = new TextDecoder("utf-8").decode(details.requestBody.raw[0].bytes);
                const parsedBody = JSON.parse(decodedBody);
                poToken = parsedBody?.serviceIntegrityDimensions?.poToken || null;
                payload = JSON.stringify(parsedBody, null, 2);
            } catch (e) {
                console.error("Error parsing payload:", e);
                payload = new TextDecoder("utf-8").decode(details.requestBody.raw[0].bytes);
            }
        }

        requests[tabId].push({ url, payload, method, poToken });
        chrome.storage.local.set({ [tabId]: requests[tabId] });
        updateBadge(tabId);
    },
    // The ONLY change is in the URL filter below
    { urls: ["*://*.youtube.com/*v1/player*"] },
    ["requestBody"]
);

// Function to update the badge text on the icon
function updateBadge(tabId) {
    const count = requests[tabId] ? requests[tabId].length : 0;
    chrome.action.setBadgeText({
        tabId: tabId,
        text: count > 0 ? count.toString() : ''
    });
    chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#E83030'
    });
}