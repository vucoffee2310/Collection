// ⭐ SINGLETON: Ensure only ONE content script instance is active
(function() {
  const INSTANCE_ID = 'content-script-' + Date.now();
  
  // Check if another instance is already running
  if (window.__CONTENT_SCRIPT_INSTANCE__) {
    console.warn('⚠️ Content script already running, this instance will exit');
    return;
  }
  
  // Mark this window as having an active content script
  window.__CONTENT_SCRIPT_INSTANCE__ = INSTANCE_ID;
  
  // Cleanup on unload
  window.addEventListener('unload', () => {
    if (window.__CONTENT_SCRIPT_INSTANCE__ === INSTANCE_ID) {
      delete window.__CONTENT_SCRIPT_INSTANCE__;
    }
  });

  console.log('✅ Content script instance started:', INSTANCE_ID);

  // === ACTUAL CONTENT SCRIPT CODE STARTS HERE ===

  chrome.runtime.sendMessage({ action: 'contentScriptReady' }).catch(() => {});

  // Helpers
  const sendLog = (message, logType = 'info', content = null) => {
    chrome.runtime.sendMessage({ type: 'log', message, logType, content }).catch(() => {});
  };

  const sendStatus = (message, statusType = 'active') => {
    chrome.runtime.sendMessage({ type: 'status', message, statusType }).catch(() => {});
  };

  const safe = (value, defaultValue = 'N/A') => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  const safeStr = (str, start, end) => {
    if (!str) return 'N/A';
    const text = String(str);
    return text.length > end ? text.substring(start, end) + '...' : text;
  };

  // Message handlers by source
  const handlers = {
    'xhr-interceptor': {
      'ready': () => {
        sendLog('✅ XHR Interceptor activated', 'info');
        sendStatus('✅ Interceptor active', 'active');
      },
      'request-detected': (data) => {
        sendLog(`🎯 ${safe(data.method)} ${safeStr(data.url, 0, 80)}`, 'request');
        sendStatus('🔍 Request intercepted', 'active');
      },
      'request': (data) => {
        const info = [
          `Prompt: ${safeStr(data.prompt, 0, 100)}`,
          data.model && `Model: ${data.model}`,
          data.temperature !== undefined && `Temperature: ${data.temperature}`,
          data.topP !== undefined && `Top P: ${data.topP}`,
          data.topK !== undefined && `Top K: ${data.topK}`,
          data.maxOutputTokens !== undefined && `Max Tokens: ${data.maxOutputTokens}`
        ].filter(Boolean).join('\n');
        sendLog('📤 Request sent', 'request', info);
        sendStatus('📤 Sending...', 'active');
      },
      'thinking-update': (data) => {
        sendLog(
          `💭 Thinking chunk ${safe(data.count)} (+${safe(data.chunkLength)} chars, total: ${safe(data.totalLength)})`,
          'thinking',
          safe(data.content, '')
        );
      },
      'streaming-update': (data) => {
        sendLog(
          `💬 Output chunk ${safe(data.count)} (+${safe(data.chunkLength)} chars, total: ${safe(data.totalLength)})`,
          'answer',
          safe(data.content, '')
        );
      },
      'complete': (data) => {
        const summary = `Duration: ${safe(data.duration)}ms\n` +
                       `Chunks - Thinking: ${safe(data.thinkingCount)}, Output: ${safe(data.streamingCount)}\n` +
                       `Length - Thinking: ${safe(data.thinking, '').length}, Output: ${safe(data.streaming, '').length}\n\n` +
                       `--- THINKING ---\n${safe(data.thinking, '')}\n\n` +
                       `--- OUTPUT ---\n${safe(data.streaming, '')}`;
        sendLog(`✅ Complete (${safe(data.duration)}ms)`, 'complete', summary);
        sendStatus('✅ Complete', 'active');
      },
      'error': (data) => {
        sendLog(`❌ XHR Error: ${safe(data.message)}`, 'error');
        sendStatus('❌ Error', 'error');
      }
    },
    
    'ai-automation': {
      'ready': () => sendLog('✅ Automation ready', 'info'),
      'start': () => {
        sendLog('🤖 Starting configuration...', 'info');
        sendStatus('🤖 Configuring...', 'active');
      },
      'action': (data) => {
        const messages = {
          'setting-temperature': `⚙️ Temperature: ${data.value}`,
          'setting-thinking-budget': `⚙️ Thinking Budget: ${data.value}`,
          'setting-google-search': `⚙️ Google Search: ${data.value ? 'ON' : 'OFF'}`,
          'setting-top-p': `⚙️ Top P: ${data.value}`,
          'sending-message': `📝 Message: ${safeStr(data.message, 0, 50)}`,
          'message-sent': `✅ Message sent`
        };
        if (messages[data.action]) sendLog(messages[data.action], 'info');
      },
      'complete': () => {
        sendLog('✅ Auto-run complete!', 'complete');
        sendStatus('✅ Complete', 'active');
      },
      'error': (data) => {
        sendLog(`❌ Automation error: ${safe(data.message)}`, 'error');
        sendStatus('❌ Failed', 'error');
      }
    },
    
    'audio-injector': {
      'ready': () => sendLog('🔊 Audio ready - autoplay bypassed', 'info'),
      'started': () => sendLog('▶️ Audio started', 'info'),
      'stopped': () => sendLog('⏹️ Audio stopped', 'info'),
      'error': (data) => sendLog(`❌ Audio: ${safe(data.message)}`, 'error')
    }
  };

  // Main message listener
  window.addEventListener('message', (event) => {
    // ⭐ Double-check this instance is still active
    if (window.__CONTENT_SCRIPT_INSTANCE__ !== INSTANCE_ID) {
      console.warn('⚠️ This content script instance is no longer active, ignoring message');
      return;
    }

    if (event.source !== window) return;
    
    const { source, type } = event.data || {};
    if (!source || !type) return;

    // Forward ready signals
    if (type === 'ready') {
      chrome.runtime.sendMessage({ action: 'scriptReady', scriptName: source }).catch(() => {});
    }

    // Handle messages
    const handler = handlers[source]?.[type];
    if (handler) handler(event.data);
  });

  sendLog('✅ Content script loaded', 'info');
  console.log('🔌 Content script ready - instance:', INSTANCE_ID);

})();