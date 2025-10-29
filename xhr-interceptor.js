(function() {
  'use strict';

  console.log('🔌 Loading XHR Interceptor...');

  const originalXHR = window.XMLHttpRequest;
  const TARGET_BASE_URL = "https://alkalimakersuite-pa.clients6.google.com";
  const TARGET_ENDPOINT = "GenerateContent";

  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    const originalSetRequestHeader = xhr.setRequestHeader;
    
    let requestURL = '';
    let requestMethod = '';
    let shouldLog = false;
    let processedLength = 0;
    let thinking = "", streaming = "";
    let thinkingCount = 0, streamingCount = 0;
    let pollInterval = null;
    let requestBody = null;
    let requestStartTime = null;
    
    xhr.open = function(method, url, ...rest) {
      requestURL = url;
      requestMethod = method;
      shouldLog = url.includes(TARGET_BASE_URL) && url.includes(TARGET_ENDPOINT);
      
      if (shouldLog) {
        console.log('🎯 Intercepted GenerateContent request:', { 
          method, 
          url: url.substring(0, 100) + '...' 
        });
        
        window.postMessage({ 
          source: 'xhr-interceptor',
          type: 'request-detected',
          method: method,
          url: url,
          timestamp: new Date().toISOString()
        }, '*');
      }
      
      return originalOpen.apply(this, [method, url, ...rest]);
    };
    
    xhr.setRequestHeader = function(...args) {
      return originalSetRequestHeader.apply(this, args);
    };
    
    function parseChunk(text) {
      try {
        const clean = text.trim().replace(/^,/, '');
        if (!clean) return null;
        
        const data = JSON.parse(clean);
        let content = null, isThinking = false;
        
        function scan(arr) {
          if (!Array.isArray(arr)) return false;
          if (arr.length >= 2 && arr[0] === null && typeof arr[1] === 'string') {
            content = arr[1];
            isThinking = arr.length > 10 && arr[arr.length - 1] === 1;
            return true;
          }
          return arr.some(item => Array.isArray(item) && scan(item));
        }
        
        scan(data);
        return content ? { type: isThinking ? 'thinking' : 'streaming', content } : null;
      } catch (e) {
        return null;
      }
    }
    
    function splitJsonObjects(line) {
      const objects = [];
      let depth = 0;
      let current = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '[') depth++;
        else if (char === ']') depth--;
        
        current += char;
        
        if (depth === 0 && char === ',') {
          if (current.trim()) {
            objects.push(current.trim().slice(0, -1));
          }
          current = '';
        }
      }
      
      if (current.trim()) {
        objects.push(current.trim());
      }
      
      return objects;
    }
    
    function process() {
      try {
        if (!xhr.responseText || xhr.responseText.length <= processedLength) return;
        
        const newData = xhr.responseText.substring(processedLength);
        const lines = newData.split('\n').filter(l => l.trim());
        
        lines.forEach(line => {
          const jsonObjects = splitJsonObjects(line);
          
          jsonObjects.forEach(jsonStr => {
            const parsed = parseChunk(jsonStr);
            if (!parsed) return;
            
            if (parsed.type === 'thinking') {
              thinking += parsed.content;
              thinkingCount++;
              
              console.log(`[THINKING CHUNK ${thinkingCount}]:`, parsed.content.substring(0, 50) + '...');
              
              window.postMessage({ 
                source: 'xhr-interceptor',
                type: 'thinking-update',
                content: parsed.content,
                total: thinking,
                count: thinkingCount,
                chunkLength: parsed.content.length,
                totalLength: thinking.length,
                timestamp: new Date().toISOString()
              }, '*');
            } else {
              streaming += parsed.content;
              streamingCount++;
              
              console.log(`[OUTPUT CHUNK ${streamingCount}]:`, parsed.content.substring(0, 50) + '...');
              
              window.postMessage({ 
                source: 'xhr-interceptor',
                type: 'streaming-update',
                content: parsed.content,
                total: streaming,
                count: streamingCount,
                chunkLength: parsed.content.length,
                totalLength: streaming.length,
                timestamp: new Date().toISOString()
              }, '*');
            }
          });
        });
        
        processedLength = xhr.responseText.length;
      } catch (e) {
        console.error('XHR Process error:', e);
        window.postMessage({ 
          source: 'xhr-interceptor',
          type: 'error',
          message: 'Processing error: ' + e.message,
          timestamp: new Date().toISOString()
        }, '*');
      }
    }
    
    function showFinal() {
      try {
        const duration = requestStartTime ? Date.now() - requestStartTime : 0;
        
        console.log('✅ XHR COMPLETE:', {
          thinkingChunks: thinkingCount,
          outputChunks: streamingCount,
          thinkingLength: thinking.length,
          outputLength: streaming.length,
          duration: duration + 'ms'
        });
        
        window.postMessage({ 
          source: 'xhr-interceptor',
          type: 'complete',
          thinking: thinking,
          thinkingCount: thinkingCount,
          streaming: streaming,
          streamingCount: streamingCount,
          duration: duration,
          timestamp: new Date().toISOString()
        }, '*');
      } catch (e) {
        console.error('XHR Final error:', e);
      }
    }
    
    xhr.send = function(body) {
      if (shouldLog) {
        processedLength = 0;
        thinking = streaming = "";
        thinkingCount = streamingCount = 0;
        requestBody = body;
        requestStartTime = Date.now();
        
        console.log('📤 Sending GenerateContent request...');
        
        try {
          const payload = JSON.parse(body);
          const prompt = payload.contents?.[0]?.parts?.[0]?.text || 'N/A';
          const model = payload.model || 'unknown';
          const generationConfig = payload.generationConfig || {};
          const systemInstruction = payload.systemInstruction?.parts?.[0]?.text || null;
          
          const requestInfo = {
            model: model,
            prompt: prompt,
            promptLength: prompt.length,
            temperature: generationConfig.temperature,
            topP: generationConfig.topP,
            topK: generationConfig.topK,
            maxOutputTokens: generationConfig.maxOutputTokens,
            systemInstruction: systemInstruction,
            timestamp: new Date().toISOString()
          };
          
          console.log('📋 Request details:', requestInfo);
          
          window.postMessage({ 
            source: 'xhr-interceptor',
            type: 'request',
            ...requestInfo,
            fullPayload: payload
          }, '*');
        } catch (e) {
          console.error('Failed to parse request:', e);
          window.postMessage({ 
            source: 'xhr-interceptor',
            type: 'request',
            prompt: 'Failed to parse',
            error: e.message,
            timestamp: new Date().toISOString()
          }, '*');
        }
        
        // Start polling for response
        pollInterval = setInterval(() => {
          try { 
            process(); 
          } catch (e) {
            console.error('Poll error:', e);
          }
        }, 50);
        
        // Listen for completion
        xhr.addEventListener('readystatechange', () => {
          try {
            if (xhr.readyState === 4) {
              clearInterval(pollInterval);
              console.log('📊 XHR readyState 4 - Status:', xhr.status, 'StatusText:', xhr.statusText);
              
              setTimeout(() => {
                process();
                showFinal();
              }, 100);
            }
          } catch (e) {
            console.error('ReadyState error:', e);
          }
        });
        
        xhr.addEventListener('error', () => {
          console.error('❌ XHR Error event');
          if (pollInterval) clearInterval(pollInterval);
          
          window.postMessage({ 
            source: 'xhr-interceptor',
            type: 'error',
            message: 'XHR request failed',
            timestamp: new Date().toISOString()
          }, '*');
        });
        
        xhr.addEventListener('load', () => {
          console.log('✅ XHR Load event - Status:', xhr.status);
        });
        
        xhr.addEventListener('abort', () => {
          console.warn('⚠️ XHR Abort event');
          if (pollInterval) clearInterval(pollInterval);
        });
      }
      
      return originalSend.apply(this, arguments);
    };
    
    return xhr;
  };

  console.log('✅ XHR Interceptor Active');
  console.log('🎯 Monitoring:', TARGET_BASE_URL + '/*' + TARGET_ENDPOINT);

})();