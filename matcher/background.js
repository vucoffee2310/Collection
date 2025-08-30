// file: background.js

// This listener is triggered when the user clicks the extension icon in the toolbar.
chrome.action.onClicked.addListener((tab) => {
  // Define the properties of the window to be created.
  const windowOptions = {
    url: chrome.runtime.getURL('viewer.html'), // Get the full URL to our viewer.html
    type: 'popup', // Creates a window without the browser address bar, etc.
    width: 400,    // Set a desired width for the window
    height: 600    // Set a desired height for the window
  };

  // Use the chrome.windows.create API to open the new window.
  chrome.windows.create(windowOptions);
});
