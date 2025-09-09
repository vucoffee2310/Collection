document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const elementInfoDiv = document.getElementById('elementInfo');

  startBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'startInspectMode'
      });
      
      startBtn.disabled = true;
      stopBtn.disabled = false;
      showStatus('Inspect mode started. Click any element to copy as Markdown.', 'success');
      elementInfoDiv.innerHTML = '<p>Click any element to copy its content as Markdown.</p>';
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
    }
  });

  stopBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'stopInspectMode'
      });
      
      startBtn.disabled = false;
      stopBtn.disabled = true;
      showStatus('Inspect mode stopped', 'success');
      elementInfoDiv.innerHTML = '';
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'inspectModeStarted') {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      elementInfoDiv.innerHTML = '<p>Click any element to copy its content as Markdown.</p>';
    } else if (message.type === 'inspectModeStopped') {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      elementInfoDiv.innerHTML = '';
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});