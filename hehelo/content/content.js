// Request injection (backup, though background handles it automatically)
chrome.runtime.sendMessage({ action: 'contentScriptReady' }).catch(() => {});

// Message forwarding functions
function sendLog(message, logType = 'info', content = null) {
  chrome.runtime.sendMessage({
    type: 'log',
    message: message,
    logType: logType,
    content: content
  }).catch(() => {});
}

function sendStatus(message, statusType = 'active') {
  chrome.runtime.sendMessage({
    type: 'status',
    message: message,
    statusType: statusType
  }).catch(() => {});
}

// Safe substring helper
function safeSubstring(str, start, end) {
  if (!str) return 'N/A';
  const text = String(str);
  return text.length > end ? text.substring(start, end) + '...' : text;
}

// Safe value getter
function safeValue(value, defaultValue = 'N/A') {
  return value !== undefined && value !== null ? value : defaultValue;
}

// Listen for messages from injected scripts
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const data = event.data;
  
  // XHR Interceptor messages
  if (data.source === 'xhr-interceptor') {
    switch(data.type) {
      case 'interceptor-ready':
        console.log('✅ XHR Interceptor is active and monitoring');
        sendLog('✅ XHR Interceptor activated - monitoring GenerateContent API', 'info');
        sendStatus('✅ Interceptor active', 'active');
        break;
        
      case 'request-detected':
        sendLog(
          `🎯 GenerateContent URL detected: ${safeValue(data.method)} ${safeSubstring(data.url, 0, 80)}`,
          'request'
        );
        sendStatus('🔍 Request intercepted', 'active');
        break;
        
      case 'request':
        const requestInfo = [
          `Prompt: ${safeSubstring(data.prompt, 0, 100)}`,
          data.model ? `Model: ${data.model}` : '',
          data.temperature !== undefined ? `Temperature: ${data.temperature}` : '',
          data.topP !== undefined ? `Top P: ${data.topP}` : '',
          data.topK !== undefined ? `Top K: ${data.topK}` : '',
          data.maxOutputTokens !== undefined ? `Max Tokens: ${data.maxOutputTokens}` : ''
        ].filter(Boolean).join('\n');
        
        sendLog('📤 Request sent to GenerateContent', 'request', requestInfo);
        sendStatus('📤 Sending request...', 'active');
        break;
        
      case 'thinking-update':
        sendLog(
          `💭 Thinking chunk ${safeValue(data.count, 0)} (+${safeValue(data.chunkLength, 0)} chars, total: ${safeValue(data.totalLength, 0)})`, 
          'thinking', 
          safeValue(data.content, '')
        );
        break;
        
      case 'streaming-update':
        sendLog(
          `💬 Output chunk ${safeValue(data.count, 0)} (+${safeValue(data.chunkLength, 0)} chars, total: ${safeValue(data.totalLength, 0)})`, 
          'answer', 
          safeValue(data.content, '')
        );
        break;
        
      case 'complete':
        const thinkingText = safeValue(data.thinking, '');
        const streamingText = safeValue(data.streaming, '');
        const thinkingCount = safeValue(data.thinkingCount, 0);
        const streamingCount = safeValue(data.streamingCount, 0);
        const duration = safeValue(data.duration, 0);
        
        const summary = `Duration: ${duration}ms\n` +
                       `Total chunks - Thinking: ${thinkingCount}, Output: ${streamingCount}\n` +
                       `Total length - Thinking: ${thinkingText.length} chars, Output: ${streamingText.length} chars\n\n` +
                       `--- THINKING ---\n${thinkingText}\n\n` +
                       `--- OUTPUT ---\n${streamingText}`;
        
        sendLog(
          `✅ XHR Complete (${duration}ms) - Thinking: ${thinkingCount} chunks, Output: ${streamingCount} chunks`, 
          'complete', 
          summary
        );
        sendStatus('✅ Request complete', 'active');
        break;
        
      case 'error':
        sendLog(`❌ XHR Error: ${safeValue(data.message, 'Unknown error')}`, 'error');
        sendStatus('❌ XHR error', 'error');
        break;
        
      default:
        console.log('Unknown XHR interceptor message:', data.type, data);
        break;
    }
  }
  
  // AI Automation messages
  if (data.source === 'ai-automation') {
    switch(data.type) {
      case 'ready':
        console.log('✅ AI Automation is ready - waiting for XHR interceptor...');
        sendLog('✅ AI Automation ready - waiting for XHR interceptor signal', 'info');
        break;
        
      case 'start':
        sendLog('🤖 AUTO-RUNNING: Starting configuration...', 'info');
        sendStatus('🤖 Auto-configuring...', 'active');
        break;
        
      case 'action':
        const action = safeValue(data.action, 'unknown');
        const value = data.value;
        const message = data.message;
        
        const actionMessages = {
          'setting-temperature': `⚙️ Setting Temperature: ${value}`,
          'setting-thinking-budget': `⚙️ Setting Thinking Budget: ${value}`,
          'setting-google-search': `⚙️ Setting Google Search: ${value ? 'ON' : 'OFF'}`,
          'setting-top-p': `⚙️ Setting Top P: ${value}`,
          'sending-message': `📝 Preparing message: ${safeSubstring(message, 0, 50)}`,
          'message-sent': `✅ Message sent - XHR interceptor will capture response`
        };
        
        if (actionMessages[action]) {
          sendLog(actionMessages[action], 'info');
        } else {
          console.log('Unknown automation action:', action, data);
        }
        break;
        
      case 'complete':
        sendLog('✅ AUTO-RUN COMPLETE! Watch for XHR streaming response...', 'complete');
        sendStatus('✅ Auto-run complete', 'active');
        break;
        
      case 'error':
        sendLog(`❌ Automation error: ${safeValue(data.message, 'Unknown error')}`, 'error');
        sendStatus('❌ Automation failed', 'error');
        break;
        
      default:
        console.log('Unknown automation message:', data.type, data);
        break;
    }
  }
});

// Listen for messages from injected scripts
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const data = event.data;
  
  // Safety check
  if (!data || typeof data !== 'object') {
    return;
  }
  
  if (!data.source) {
    return;
  }
  
  // XHR Interceptor messages
  if (data.source === 'xhr-interceptor') {
    // ... existing XHR handler code ...
  }
  
  // AI Automation messages
  if (data.source === 'ai-automation') {
    // ... existing automation handler code ...
  }
  
  // ⭐ NEW: Audio Injector messages
  if (data.source === 'audio-injector') {
    switch(data.type) {
      case 'ready':
        console.log('✅ Audio Injector is ready');
        sendLog('🔊 Audio Injector ready - autoplay policy bypassed', 'info');
        break;
        
      case 'started':
        console.log('🔊 Audio started');
        sendLog('▶️ Audio started (minimal volume)', 'info');
        break;
        
      case 'stopped':
        console.log('⏹️ Audio stopped');
        sendLog('⏹️ Audio stopped', 'info');
        break;
        
      case 'status':
        console.log('📊 Audio status:', data);
        sendLog(`📊 Audio: ${data.audioContextState}, oscillator: ${data.oscillatorActive ? 'active' : 'inactive'}`, 'info');
        break;
        
      case 'error':
        console.error('❌ Audio error:', data.message);
        sendLog(`❌ Audio error: ${data.message}`, 'error');
        break;
        
      default:
        console.log('Unknown audio injector message:', data.type, data);
        break;
    }
  }
});

// Initial message
sendLog('✅ Content script loaded', 'info');
console.log('🔌 Content script ready - listening for events');