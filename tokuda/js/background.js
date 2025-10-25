let lastPot = null;
let lastVideoId = null;

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
    if (request.action === 'getPot') {
        const isValid = request.videoId === lastVideoId;
        sendResponse({ 
            pot: isValid ? lastPot : null,
            videoId: lastVideoId,
            valid: isValid
        });
        return true;
    }
});