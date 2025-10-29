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

// Listen for messages from injected XHR interceptor
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const data = event.data;
  
  // XHR Interceptor messages
  if (data.source === 'xhr-interceptor') {
    switch(data.type) {
      case 'request-detected':
        sendLog(`🎯 GenerateContent URL detected: ${data.method} ${data.url.substring(0, 80)}...`, 'request');
        sendStatus('🔍 Request intercepted', 'active');
        break;
        
      case 'request':
        const requestInfo = [
          `Prompt: ${data.prompt.substring(0, 100)}...`,
          data.model ? `Model: ${data.model}` : '',
          data.temperature !== undefined ? `Temperature: ${data.temperature}` : '',
          data.topP !== undefined ? `Top P: ${data.topP}` : '',
          data.topK !== undefined ? `Top K: ${data.topK}` : '',
          data.maxOutputTokens !== undefined ? `Max Tokens: ${data.maxOutputTokens}` : ''
        ].filter(Boolean).join('\n');
        
        sendLog(`📤 Request sent to GenerateContent`, 'request', requestInfo);
        sendStatus('📤 Sending request...', 'active');
        break;
        
      case 'thinking-update':
        sendLog(
          `💭 Thinking chunk ${data.count} (+${data.chunkLength} chars, total: ${data.totalLength})`, 
          'thinking', 
          data.content
        );
        break;
        
      case 'streaming-update':
        sendLog(
          `💬 Output chunk ${data.count} (+${data.chunkLength} chars, total: ${data.totalLength})`, 
          'answer', 
          data.content
        );
        break;
        
      case 'complete':
        const summary = `Duration: ${data.duration}ms\n` +
                       `Total chunks - Thinking: ${data.thinkingCount}, Output: ${data.streamingCount}\n` +
                       `Total length - Thinking: ${data.thinking.length} chars, Output: ${data.streaming.length} chars\n\n` +
                       `--- THINKING ---\n${data.thinking}\n\n` +
                       `--- OUTPUT ---\n${data.streaming}`;
        
        sendLog(
          `✅ XHR Complete (${data.duration}ms) - Thinking: ${data.thinkingCount} chunks, Output: ${data.streamingCount} chunks`, 
          'complete', 
          summary
        );
        sendStatus('✅ Request complete', 'active');
        break;
        
      case 'error':
        sendLog(`❌ XHR Error: ${data.message}`, 'error');
        sendStatus('❌ XHR error', 'error');
        break;
    }
  }
});

// Initial message
sendLog('✅ Content script loaded - XHR monitoring active', 'info');
console.log('🔌 Content script ready - listening for XHR events');