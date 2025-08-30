// This listener is triggered when the user clicks the extension icon in the toolbar.
chrome.action.onClicked.addListener((tab) => {
  // Define the properties for the new tab.
  const createProperties = {
    url: chrome.runtime.getURL('viewer.html') // The URL to open.
  };

  // Use the chrome.tabs.create API to open viewer.html in a new tab.
  chrome.tabs.create(createProperties);
});