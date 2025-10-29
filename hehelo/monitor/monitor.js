const openBtn = document.getElementById('openBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const monitor = document.getElementById('monitor');
const status = document.getElementById('status');
const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');

const totalLogsEl = document.getElementById('totalLogs');
const requestCountEl = document.getElementById('requestCount');
const thinkingCountEl = document.getElementById('thinkingCount');
const answerCountEl = document.getElementById('answerCount');

let logCount = 0;
let requestCount = 0;
let thinkingCount = 0;
let answerCount = 0;
let allLogs = [];

function updateStats() {
  totalLogsEl.textContent = logCount;
  requestCountEl.textContent = requestCount;
  thinkingCountEl.textContent = thinkingCount;
  answerCountEl.textContent = answerCount;
}

function addLog(message, type = 'info', content = null) {
  const emptyState = monitor.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  const typeLabels = {
    info: 'INFO',
    thinking: 'THINKING',
    answer: 'ANSWER',
    error: 'ERROR',
    request: 'REQUEST',
    complete: 'COMPLETE'
  };
  
  // Safety checks
  const safeMessage = message ? String(message) : 'No message';
  const safeType = type || 'info';
  const safeContent = content ? String(content) : null;
  
  entry.innerHTML = `
    <div class="log-header">
      <span class="log-type">${typeLabels[safeType] || 'INFO'}</span>
      <span class="log-time">${time}</span>
    </div>
    <div class="log-message">${escapeHtml(safeMessage)}</div>
    ${safeContent ? `<div class="log-content">${escapeHtml(safeContent)}</div>` : ''}
  `;
  
  monitor.appendChild(entry);
  monitor.scrollTop = monitor.scrollHeight;
  
  logCount++;
  if (safeType === 'request') requestCount++;
  if (safeType === 'thinking') thinkingCount++;
  if (safeType === 'answer') answerCount++;
  updateStats();
  
  allLogs.push({ time, type: safeType, message: safeMessage, content: safeContent });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function setStatus(message, type = 'active') {
  status.textContent = message;
  status.className = type;
}

function setConnectionStatus(connected) {
  if (connected) {
    connectionDot.classList.remove('disconnected');
    connectionText.textContent = 'Connected';
  } else {
    connectionDot.classList.add('disconnected');
    connectionText.textContent = 'Disconnected';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'log') {
    addLog(message.message, message.logType || 'info', message.content || null);
  } else if (message.type === 'status') {
    setStatus(message.message, message.statusType || 'active');
  } else if (message.type === 'connection') {
    setConnectionStatus(message.connected);
  }
});

const runAutomationBtn = document.getElementById('runAutomationBtn');

runAutomationBtn.addEventListener('click', async () => {
  runAutomationBtn.disabled = true;
  runAutomationBtn.textContent = '⏳ Running...';
  
  try {
    chrome.runtime.sendMessage({ 
      action: 'runAutomation',
      message: 'Hello! Please test these automation settings.'
    });
    
    addLog('🤖 Triggering automation...', 'info');
    setStatus('Running automation...', 'active');
    
    setTimeout(() => {
      runAutomationBtn.disabled = false;
      runAutomationBtn.textContent = '🤖 Run Automation';
    }, 3000);
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
    setStatus('Error running automation', 'error');
    runAutomationBtn.disabled = false;
    runAutomationBtn.textContent = '🤖 Run Automation';
  }
});

openBtn.addEventListener('click', async () => {
  openBtn.disabled = true;
  openBtn.textContent = '⏳ Opening...';
  
  try {
    chrome.runtime.sendMessage({ action: 'openAIStudio' });
    setStatus('AI Studio tab opened. Waiting for page to load...', 'active');
    addLog('Opening AI Studio in new tab...', 'info');
    
    setTimeout(() => {
      openBtn.disabled = false;
      openBtn.textContent = '🚀 Open AI Studio';
    }, 2000);
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
    setStatus('Error opening tab', 'error');
    openBtn.disabled = false;
    openBtn.textContent = '🚀 Open AI Studio';
  }
});

const startAudioBtn = document.getElementById('startAudioBtn');
const stopAudioBtn = document.getElementById('stopAudioBtn');

// Start audio
startAudioBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://aistudio.google.com/*' });
    
    if (tabs.length === 0) {
      addLog('❌ No AI Studio tab found', 'error');
      return;
    }
    
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      world: 'MAIN',
      func: function() {
        if (window.audioInjector) {
          window.audioInjector.start();
        }
      }
    });
    
    addLog('🔊 Audio start requested', 'info');
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
  }
});

// Stop audio
stopAudioBtn.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://aistudio.google.com/*' });
    
    if (tabs.length === 0) {
      addLog('❌ No AI Studio tab found', 'error');
      return;
    }
    
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      world: 'MAIN',
      func: function() {
        if (window.audioInjector) {
          window.audioInjector.stop();
        }
      }
    });
    
    addLog('⏹️ Audio stop requested', 'info');
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
  }
});

clearBtn.addEventListener('click', () => {
  monitor.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📊</div>
      <div class="empty-state-text">No logs yet</div>
      <div class="empty-state-subtext">Click "Open AI Studio" to start monitoring</div>
    </div>
  `;
  logCount = 0;
  requestCount = 0;
  thinkingCount = 0;
  answerCount = 0;
  allLogs = [];
  updateStats();
  setStatus('Log cleared', 'active');
  setTimeout(() => { status.className = ''; }, 2000);
});

exportBtn.addEventListener('click', () => {
  const exportData = {
    exportTime: new Date().toISOString(),
    stats: { total: logCount, requests: requestCount, thinking: thinkingCount, answers: answerCount },
    logs: allLogs
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ai-studio-monitor-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  setStatus('Log exported successfully', 'active');
  setTimeout(() => { status.className = ''; }, 2000);
});

addLog('Monitor initialized and ready', 'info');
setConnectionStatus(true);
chrome.runtime.sendMessage({ action: 'monitorReady' });

