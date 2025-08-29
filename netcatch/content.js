// A safe way to clone the request body
async function getRequestBody(request) {
    if (request.method === 'POST' || request.method === 'PUT') {
        try {
            // Clone the request, because the body can only be read once
            const clonedRequest = request.clone();
            const body = await clonedRequest.json(); // Assumes body is JSON
            return body;
        } catch (e) {
            console.error('Could not parse request body as JSON.', e);
            return null;
        }
    }
    return null;
}

// Keep a reference to the original fetch function
const originalFetch = window.fetch;

// Override the window.fetch function
window.fetch = async function(...args) {
    // The first argument is either a URL string or a Request object
    let url = typeof args[0] === 'string' ? args[0] : args[0].url;
    let request = new Request(...args);

    // Check if this is the request we are interested in
    if (url.includes('v1/player')) {
        console.log('Content Script: Intercepted v1/player request!');
        
        const body = await getRequestBody(request);

        if (body) {
            // Send the captured data to the background script
            chrome.runtime.sendMessage({
                type: 'PLAYER_REQUEST',
                data: {
                    url: url,
                    payload: body,
                    method: request.method
                }
            });
        }
    }

    // IMPORTANT: Call the original fetch function to let the request proceed
    return originalFetch.apply(this, args);
};

console.log('v1/player catcher content script injected.');