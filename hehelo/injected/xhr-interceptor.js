(function () {
  "use strict";

  console.log("🔌 Loading XHR Interceptor (SSE/Streaming Mode)...");

  const originalXHR = window.XMLHttpRequest;
  const TARGET_BASE_URL = "https://alkalimakersuite-pa.clients6.google.com";
  const TARGET_ENDPOINT = "GenerateContent";

  window.XMLHttpRequest = function () {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;
    const originalSetRequestHeader = xhr.setRequestHeader;

    let requestURL = "";
    let requestMethod = "";
    let shouldLog = false;
    let processedLength = 0;
    let thinking = "",
      streaming = "";
    let thinkingCount = 0,
      streamingCount = 0;
    let requestBody = null;
    let requestStartTime = null;
    let isStreaming = false;

    xhr.open = function (method, url, ...rest) {
      requestURL = url;
      requestMethod = method;
      shouldLog =
        url.includes(TARGET_BASE_URL) && url.includes(TARGET_ENDPOINT);

      if (shouldLog) {
        console.log("🎯 Intercepted GenerateContent SSE request:", {
          method,
          url: url.substring(0, 100) + "...",
        });

        window.postMessage(
          {
            source: "xhr-interceptor",
            type: "request-detected",
            method: method,
            url: url,
            timestamp: new Date().toISOString(),
          },
          "*"
        );
      }

      return originalOpen.apply(this, [method, url, ...rest]);
    };

    xhr.setRequestHeader = function (...args) {
      return originalSetRequestHeader.apply(this, args);
    };

    function parseChunk(text) {
      try {
        const clean = text.trim().replace(/^,/, "");
        if (!clean) return null;

        // Debug log
        console.log("🔍 Parsing chunk, length:", clean.length);

        const data = JSON.parse(clean);
        let content = null,
          isThinking = false;

        function scan(arr, depth = 0) {
          if (!Array.isArray(arr)) return false;

          // Debug: Log array structure
          if (depth === 0) {
            console.log("🔍 Array structure:", arr.length, "elements");
          }

          if (
            arr.length >= 2 &&
            arr[0] === null &&
            typeof arr[1] === "string"
          ) {
            content = arr[1];
            isThinking = arr.length > 10 && arr[arr.length - 1] === 1;
            console.log(
              `✅ Found content: ${content.length} chars, isThinking: ${isThinking}`
            );
            return true;
          }

          return arr.some(
            (item) => Array.isArray(item) && scan(item, depth + 1)
          );
        }

        const found = scan(data);

        if (!found) {
          console.log("⚠️ No content found in chunk");
          return null;
        }

        return content
          ? { type: isThinking ? "thinking" : "streaming", content }
          : null;
      } catch (e) {
        console.error("❌ Parse error:", e.message);
        return null;
      }
    }

    function splitJsonObjects(line) {
      const objects = [];
      let depth = 0;
      let current = "";

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === "[") depth++;
        else if (char === "]") depth--;

        current += char;

        if (depth === 0 && char === ",") {
          if (current.trim()) {
            objects.push(current.trim().slice(0, -1));
          }
          current = "";
        }
      }

      if (current.trim()) {
        objects.push(current.trim());
      }

      return objects;
    }

    function processStreamingChunk() {
      try {
        if (!xhr.responseText || xhr.responseText.length <= processedLength)
          return;

        const newData = xhr.responseText.substring(processedLength);
        const lines = newData.split("\n").filter((l) => l.trim());

        if (lines.length > 0 && !isStreaming) {
          isStreaming = true;
          console.log("📡 SSE Stream started...");
        }

        // Debug: Log raw response data
        if (lines.length > 0) {
          console.log(`📨 Processing ${lines.length} new lines`);
          console.log("📨 First line sample:", lines[0].substring(0, 100));
        }

        lines.forEach((line, lineIndex) => {
          const jsonObjects = splitJsonObjects(line);

          console.log(
            `📨 Line ${lineIndex + 1}: Found ${jsonObjects.length} JSON objects`
          );

          jsonObjects.forEach((jsonStr, objIndex) => {
            const parsed = parseChunk(jsonStr);

            if (!parsed) {
              // Debug: Log unparseable chunks
              console.log(
                `⚠️ Line ${lineIndex + 1}, Object ${
                  objIndex + 1
                }: Could not parse`
              );
              console.log("Raw JSON:", jsonStr.substring(0, 200));
              return;
            }

            if (parsed.type === "thinking") {
              thinking += parsed.content;
              thinkingCount++;

              console.log(
                `💭 [THINKING CHUNK ${thinkingCount}] ${parsed.content.length} chars:`,
                parsed.content.substring(0, 80) +
                  (parsed.content.length > 80 ? "..." : "")
              );

              window.postMessage(
                {
                  source: "xhr-interceptor",
                  type: "thinking-update",
                  content: parsed.content,
                  total: thinking,
                  count: thinkingCount,
                  chunkLength: parsed.content.length,
                  totalLength: thinking.length,
                  timestamp: new Date().toISOString(),
                },
                "*"
              );
            } else {
              streaming += parsed.content;
              streamingCount++;

              console.log(
                `💬 [OUTPUT CHUNK ${streamingCount}] ${parsed.content.length} chars:`,
                parsed.content.substring(0, 80) +
                  (parsed.content.length > 80 ? "..." : "")
              );

              window.postMessage(
                {
                  source: "xhr-interceptor",
                  type: "streaming-update",
                  content: parsed.content,
                  total: streaming,
                  count: streamingCount,
                  chunkLength: parsed.content.length,
                  totalLength: streaming.length,
                  timestamp: new Date().toISOString(),
                },
                "*"
              );
            }
          });
        });

        processedLength = xhr.responseText.length;
        console.log(`📊 Processed up to position: ${processedLength}`);
      } catch (e) {
        console.error("❌ SSE Processing error:", e);
        console.error("Stack trace:", e.stack);
        window.postMessage(
          {
            source: "xhr-interceptor",
            type: "error",
            message: "SSE processing error: " + e.message,
            timestamp: new Date().toISOString(),
          },
          "*"
        );
      }
    }

    function showFinal() {
      try {
        const duration = requestStartTime ? Date.now() - requestStartTime : 0;

        console.log("✅ SSE STREAM COMPLETE:", {
          duration: duration + "ms",
          thinkingChunks: thinkingCount,
          outputChunks: streamingCount,
          thinkingLength: thinking.length + " chars",
          outputLength: streaming.length + " chars",
          totalChunks: thinkingCount + streamingCount,
        });

        if (thinking) {
          console.log("💭 Final Thinking:", thinking);
        }
        if (streaming) {
          console.log("💬 Final Output:", streaming);
        }

        window.postMessage(
          {
            source: "xhr-interceptor",
            type: "complete",
            thinking: thinking,
            thinkingCount: thinkingCount,
            streaming: streaming,
            streamingCount: streamingCount,
            duration: duration,
            timestamp: new Date().toISOString(),
          },
          "*"
        );
      } catch (e) {
        console.error("❌ Final error:", e);
      }
    }

    xhr.send = function (body) {
      if (shouldLog) {
        processedLength = 0;
        thinking = streaming = "";
        thinkingCount = streamingCount = 0;
        requestBody = body;
        requestStartTime = Date.now();
        isStreaming = false;

        console.log("📤 Sending GenerateContent SSE request...");
        console.log("📦 Request body type:", typeof body);
        console.log("📦 Request body length:", body ? body.length : 0);

        try {
          // Parse request body
          let payload = null;

          if (typeof body === "string") {
            payload = JSON.parse(body);
          } else if (body instanceof FormData) {
            console.warn("⚠️ Request body is FormData - cannot parse");
          } else if (body) {
            // Try to convert to string first
            payload = JSON.parse(String(body));
          }

          if (payload) {
            console.log("✅ Parsed payload:", payload);

            // Extract prompt from different possible locations
            let prompt = "N/A";

            if (payload.contents && Array.isArray(payload.contents)) {
              const firstContent = payload.contents[0];
              if (
                firstContent &&
                firstContent.parts &&
                Array.isArray(firstContent.parts)
              ) {
                const firstPart = firstContent.parts[0];
                if (firstPart && firstPart.text) {
                  prompt = firstPart.text;
                }
              }
            }

            // Also check for direct text field
            if (prompt === "N/A" && payload.text) {
              prompt = payload.text;
            }

            // Extract model
            let model = payload.model || "unknown";

            // Sometimes model is in a different location
            if (model === "unknown" && payload.modelName) {
              model = payload.modelName;
            }

            const generationConfig = payload.generationConfig || {};
            const systemInstruction =
              payload.systemInstruction?.parts?.[0]?.text || null;

            const requestInfo = {
              model: model,
              prompt: prompt,
              promptLength: prompt.length,
              temperature: generationConfig.temperature,
              topP: generationConfig.topP,
              topK: generationConfig.topK,
              maxOutputTokens: generationConfig.maxOutputTokens,
              systemInstruction: systemInstruction,
              timestamp: new Date().toISOString(),
            };

            console.log("📋 Request config:", requestInfo);

            window.postMessage(
              {
                source: "xhr-interceptor",
                type: "request",
                ...requestInfo,
              },
              "*"
            );
          } else {
            console.error("❌ Failed to parse request payload");

            window.postMessage(
              {
                source: "xhr-interceptor",
                type: "request",
                prompt: "Failed to parse",
                model: "unknown",
                error: "Payload parsing failed",
                timestamp: new Date().toISOString(),
              },
              "*"
            );
          }
        } catch (e) {
          console.error("❌ Failed to parse request:", e);
          console.error("Raw body:", body);

          window.postMessage(
            {
              source: "xhr-interceptor",
              type: "request",
              prompt: "Parse error: " + e.message,
              model: "unknown",
              error: e.message,
              timestamp: new Date().toISOString(),
            },
            "*"
          );
        }

        // Monitor streaming with progress event
        xhr.addEventListener("progress", () => {
          processStreamingChunk();
        });

        // Monitor readyState for streaming
        xhr.addEventListener("readystatechange", () => {
          try {
            if (xhr.readyState === 3) {
              processStreamingChunk();
            } else if (xhr.readyState === 4) {
              console.log("📊 SSE Stream finished - Status:", xhr.status);
              processStreamingChunk();
              setTimeout(() => {
                showFinal();
              }, 100);
            }
          } catch (e) {
            console.error("❌ ReadyState error:", e);
          }
        });

        xhr.addEventListener("error", () => {
          console.error("❌ SSE Error event");
          window.postMessage(
            {
              source: "xhr-interceptor",
              type: "error",
              message: "SSE request failed",
              timestamp: new Date().toISOString(),
            },
            "*"
          );
        });

        xhr.addEventListener("load", () => {
          console.log(
            "✅ SSE Load event - Status:",
            xhr.status,
            "Total chunks:",
            thinkingCount + streamingCount
          );
        });

        xhr.addEventListener("abort", () => {
          console.warn("⚠️ SSE Abort event");
        });
      }

      return originalSend.apply(this, arguments);
    };

    return xhr;
  };

  console.log("✅ XHR Interceptor Active (SSE/Streaming Mode)");
  console.log("🎯 Monitoring:", TARGET_BASE_URL + "/*" + TARGET_ENDPOINT);
  console.log("📡 Ready to capture streaming responses...");

  window.postMessage(
    {
      source: "xhr-interceptor",
      type: "interceptor-ready",
      timestamp: new Date().toISOString(),
    },
    "*"
  );
})();
