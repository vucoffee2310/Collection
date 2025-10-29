(function () {
  "use strict";

  // ⭐ FIX: Add a singleton guard to prevent re-execution.
  if (window.__XHR_INTERCEPTOR_LOADED__) {
    console.warn('⚠️ XHR Interceptor script already loaded. Aborting.');
    return;
  }
  window.__XHR_INTERCEPTOR_LOADED__ = true;

  const originalXHR = window.XMLHttpRequest;
  const TARGET_URL = "https://alkalimakersuite-pa.clients6.google.com";
  const TARGET_ENDPOINT = "GenerateContent";

  const postMsg = (type, data = {}) => {
    window.postMessage({ source: "xhr-interceptor", type, ...data, timestamp: new Date().toISOString() }, "*");
  };

  window.XMLHttpRequest = function () {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    let shouldLog = false;
    let processedLength = 0;
    let thinking = "", streaming = "";
    let thinkingCount = 0, streamingCount = 0;
    let requestStartTime = null;

    xhr.open = function (method, url, ...rest) {
      shouldLog = url.includes(TARGET_URL) && url.includes(TARGET_ENDPOINT);
      if (shouldLog) postMsg('request-detected', { method, url });
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    const parseChunk = (text) => {
      try {
        const clean = text.trim().replace(/^,/, "");
        if (!clean) return null;

        const data = JSON.parse(clean);
        let content = null, isThinking = false;

        const scan = (arr) => {
          if (!Array.isArray(arr)) return false;
          if (arr.length >= 2 && arr[0] === null && typeof arr[1] === "string") {
            content = arr[1];
            isThinking = arr.length > 10 && arr[arr.length - 1] === 1;
            return true;
          }
          return arr.some(item => Array.isArray(item) && scan(item));
        };

        return scan(data) && content ? { type: isThinking ? "thinking" : "streaming", content } : null;
      } catch (e) {
        return null;
      }
    };

    const splitJsonObjects = (line) => {
      const objects = [];
      let depth = 0, current = "";

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === "[") depth++;
        else if (char === "]") depth--;
        current += char;
        if (depth === 0 && char === ",") {
          if (current.trim()) objects.push(current.trim().slice(0, -1));
          current = "";
        }
      }
      if (current.trim()) objects.push(current.trim());
      return objects;
    };

    const processChunk = () => {
      try {
        if (!xhr.responseText || xhr.responseText.length <= processedLength) return;

        const newData = xhr.responseText.substring(processedLength);
        const lines = newData.split("\n").filter(l => l.trim());

        lines.forEach(line => {
          splitJsonObjects(line).forEach(jsonStr => {
            const parsed = parseChunk(jsonStr);
            if (!parsed) return;

            if (parsed.type === "thinking") {
              thinking += parsed.content;
              thinkingCount++;
              postMsg('thinking-update', { content: parsed.content, total: thinking, count: thinkingCount, chunkLength: parsed.content.length, totalLength: thinking.length });
            } else {
              streaming += parsed.content;
              streamingCount++;
              postMsg('streaming-update', { content: parsed.content, total: streaming, count: streamingCount, chunkLength: parsed.content.length, totalLength: streaming.length });
            }
          });
        });

        processedLength = xhr.responseText.length;
      } catch (e) {
        postMsg('error', { message: e.message });
      }
    };

    const showFinal = () => {
      const duration = requestStartTime ? Date.now() - requestStartTime : 0;
      postMsg('complete', { thinking, thinkingCount, streaming, streamingCount, duration });
    };

    xhr.send = function (body) {
      if (shouldLog) {
        processedLength = 0;
        thinking = streaming = "";
        thinkingCount = streamingCount = 0;
        requestStartTime = Date.now();

        try {
          const payload = typeof body === "string" ? JSON.parse(body) : body ? JSON.parse(String(body)) : null;
          
          if (payload) {
            let prompt = "N/A";
            if (payload.contents?.[0]?.parts?.[0]?.text) prompt = payload.contents[0].parts[0].text;
            else if (payload.text) prompt = payload.text;

            const model = payload.model || payload.modelName || "unknown";
            const generationConfig = payload.generationConfig || {};

            postMsg('request', {
              model,
              prompt,
              promptLength: prompt.length,
              temperature: generationConfig.temperature,
              topP: generationConfig.topP,
              topK: generationConfig.topK,
              maxOutputTokens: generationConfig.maxOutputTokens,
              systemInstruction: payload.systemInstruction?.parts?.[0]?.text || null
            });
          }
        } catch (e) {
          postMsg('request', { prompt: 'Parse error: ' + e.message, model: 'unknown', error: e.message });
        }

        xhr.addEventListener("progress", processChunk);
        xhr.addEventListener("readystatechange", () => {
          if (xhr.readyState === 3) processChunk();
          else if (xhr.readyState === 4) {
            processChunk();
            setTimeout(showFinal, 100);
          }
        });
        xhr.addEventListener("error", () => postMsg('error', { message: 'Request failed' }));
      }

      return originalSend.apply(this, arguments);
    };

    return xhr;
  };

  postMsg('interceptor-ready');
  postMsg('ready');
  console.log("✅ XHR Interceptor Active");
})();