// js/content.js
// This script runs on the YouTube page and has one job:
// to provide video details to the popup when asked.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getVideoDetails") {
        const videoId = new URLSearchParams(window.location.search).get('v');
        const title = document.title.replace(/ - YouTube$/, '').trim();
        sendResponse({ videoId, title });
    }
    // Return true to indicate you wish to send a response asynchronously
    return true; 
});