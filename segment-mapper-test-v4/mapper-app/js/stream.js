import { StreamingParser } from "./parser.js";

export class AIStream {
  constructor(dependencies) {
    this.API_KEY = "AIzaSyCQgCQRrggBobJ-knaLqy3ORvpozHISWIk";
    this.API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${this.API_KEY}`;

    this.mapper = dependencies.mapper;
    this.logger = dependencies.logger;
    this.sourceInputElement = dependencies.sourceInputElement;

    // State tracking callbacks
    this.onGenerationStart = dependencies.onGenerationStart;
    this.onGenerationEnd = dependencies.onGenerationEnd;
    this.onTargetSegment = dependencies.onTargetSegment;
    this.onStreamChunk = dependencies.onStreamChunk;

    this.buttonElement = dependencies.buttonElement;
    this.reportDisplayEl = dependencies.reportDisplayEl;

    // Parser will be initialized with source segments
    this.parser = new StreamingParser();

    this.running = false;
    this.abortController = null;
    this.startTime = 0;

    // Report data
    this.report = {
      summary: null,
      streamedData: "",
    };

    // Track what's been rendered to avoid full re-renders
    this.streamedDataRendered = 0;

    // Performance optimization: batch segment updates
    this.segmentQueue = [];
    this.processingSegments = false;

    // Throttle partial updates
    this.lastPartialUpdate = 0;
    this.partialUpdateThrottle = 200; // ms

    // Throttle report updates during streaming
    this.lastReportUpdate = 0;
    this.reportUpdateThrottle = 500; // ms
  }

  toggle() {
    if (this.running) this.stop("Aborted");
    else this.start();
  }

  start() {
    if (this.running) return;
    const fullPrompt = this.sourceInputElement.value;
    if (!fullPrompt.trim()) {
      this.logger.error("Source input cannot be empty.");
      alert("Source input cannot be empty.");
      return;
    }

    this.clearReport();
    this.logger.clear();
    this.logger.info("Starting generation process...");

    // Notify state change: generation starting
    if (this.onGenerationStart) {
      this.onGenerationStart();
    }

    this.startTime = performance.now();
    this.report.summary = {
      status: "In Progress",
      chunksReceived: 0,
      segmentsParsed: 0,
      finishReason: null,
      duration: null,
    };

    this.streamedDataRendered = 0;
    this.updateReport();

    this.running = true;
    this.updateButton();
    this.mapper.reset();

    // ✅ FIXED ORDER: Set source segments first, then reset parser state
    this.parser.setSourceSegments(this.mapper.source);
    this.parser.reset(); // Clear buffer/state but keep windows

    console.log(
      `[AIStream] Parser ready: ${this.mapper.source.length} source segments, database initialized`
    );

    this.segmentQueue = [];
    this.abortController = new AbortController();

    const payload = {
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 1.6,
        thinkingConfig: { thinkingBudget: 500 },
        topP: 0.4,
      },
    };

    const fetchOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload, null, 2),
      signal: this.abortController.signal,
    };

    this.updateReport();
    this.logger.info("Sending request to AI...");

    fetch(this.API_URL, fetchOptions)
      .then(async (response) => {
        if (!response.ok) {
          throw await this._createApiError(response);
        }
        this.logger.info(`Received response stream (${response.status}).`);
        return response.body.getReader();
      })
      .then((reader) => this.processStream(reader))
      .then(() => {
        this.stop("Completed");
      })
      .catch((error) => {
        const status = error.name === "AbortError" ? "Aborted" : "Error";
        if (status === "Error") {
          this.logger.error(error.message);
          alert(error.message);
        }
        this.stop(status, error.message);
      });
  }

  async _createApiError(response) {
    let errorDetails = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorDetails += `\n\nDetails:\n${JSON.stringify(errorData, null, 2)}`;
    } catch (e) {
      const errorText = await response.text();
      if (errorText) {
        errorDetails += `\n\nResponse Body:\n${errorText}`;
      }
    }
    return new Error(errorDetails);
  }

  stop(finalStatus, errorMessage = "") {
    if (!this.running) return;
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort();
    }
    this.running = false;
    this.updateButton();

    // Process any remaining segments
    if (this.segmentQueue.length > 0) {
      this.processSegmentQueue();
    }

    if (finalStatus !== "Aborted" && finalStatus !== "Error") {
      this.logger.info(`Process finished with status: ${finalStatus}`);
    } else if (finalStatus === "Aborted") {
      this.logger.warn("Process stopped by user.");
    }

    this.finalizeSummary(finalStatus, errorMessage);
    this.updateReport();

    // Notify state change: generation ended
    if (this.onGenerationEnd) {
      this.onGenerationEnd();
    }
  }

  async processStream(reader) {
    const decoder = new TextDecoder();
    let leftover = "";
    let chunkCount = 0;

    while (this.running) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = leftover + decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      leftover = lines.pop();

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (data.candidates?.[0]?.finishReason) {
              this.report.summary.finishReason =
                data.candidates[0].finishReason;
            }

            if (text) {
              // Update streamed data
              this.report.streamedData += text;

              // Send to debugger for traceback analysis
              if (this.onStreamChunk) {
                this.onStreamChunk(text);
              }

              // Throttle log updates
              if (chunkCount % 5 === 0) {
                this.logger.chunk(
                  `CHUNK: ${text.substring(0, 50).replace(/\n/g, " ")}...`
                );
              }

              // Parse segments with in-order subsequence matching
              const newSegments = this.parser.feed(text);
              if (newSegments.length > 0) {
                this.queueSegments(newSegments);
              }

              this.report.summary.chunksReceived++;
              chunkCount++;

              // Throttle partial updates
              const now = performance.now();
              if (now - this.lastPartialUpdate >= this.partialUpdateThrottle) {
                const pending = this.parser.getPending();
                if (pending) {
                  this.mapper.setTargetPartial(pending);
                }
                this.lastPartialUpdate = now;
              }

              // Throttle report updates during streaming
              if (now - this.lastReportUpdate >= this.reportUpdateThrottle) {
                this.updateReport();
                this.lastReportUpdate = now;
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // Finalize - flush all pending operations
    const final = this.parser.finalize();
    if (final.length > 0) {
      this.queueSegments(final);
    }

    // Force process remaining queue
    while (this.segmentQueue.length > 0) {
      this.processSegmentQueue();
    }

    // Force final partial update
    this.mapper.setTargetPartial(null);
    this.mapper.finalize();

    // Show matching report
    const matchingReport = this.parser.getMatchingReport();
    console.log("[Stream] 📊 Matching Report:", matchingReport);

    if (matchingReport.skipped > 0) {
      this.logger.warn(
        `Skipped ${matchingReport.skipped} invalid marker(s) during streaming`
      );

      let reportText = `⚠️ MARKER MATCHING REPORT\n\n`;
      reportText += `Total response markers: ${matchingReport.totalResponseMarkers}\n`;
      reportText += `✅ Successfully matched: ${matchingReport.successfulMatches}\n`;
      reportText += `⚠️ Skipped (fake/invalid): ${matchingReport.skipped}\n`;
      reportText += `📊 Coverage: ${matchingReport.coverage}\n`;
      reportText += `🪟 Database loaded: ${matchingReport.databaseLoaded}\n`;
      reportText += `📏 Depth range: ${matchingReport.depthRange}\n\n`;

      if (matchingReport.fakeMarkers > 0) {
        reportText += `🔴 FAKE MARKERS DETECTED: ${matchingReport.fakeMarkers}\n\n`;
        matchingReport.warnings
          .filter((w) => w.type === "FAKE_MARKER")
          .slice(0, 5)
          .forEach((w, i) => {
            reportText += `${i + 1}. (${w.baseMarker}) at position ${
              w.responsePosition
            }\n`;
            reportText += `   Context: [${w.responsePreceding.join(", ")}]\n`;
            reportText += `   Reason: ${w.message}\n\n`;
          });

        if (matchingReport.fakeMarkers > 5) {
          reportText += `... and ${matchingReport.fakeMarkers - 5} more\n\n`;
        }
      }

      reportText += `These markers were automatically rejected using sliding window database matching.`;

      console.warn(reportText);
      alert(reportText);
    } else {
      console.log("[Stream] ✅ Perfect matching - no fake markers detected");
      this.logger.info("✅ All markers matched successfully via database lookup");
    }

    // Force final report update
    this.updateReport();
  }

  queueSegments(segments) {
    this.segmentQueue.push(...segments);

    // Start processing if not already running
    if (!this.processingSegments) {
      this.scheduleSegmentProcessing();
    }
  }

  scheduleSegmentProcessing() {
    this.processingSegments = true;
    queueMicrotask(() => this.processSegmentQueue());
  }

  processSegmentQueue() {
    // Always check if we should continue
    if (this.segmentQueue.length === 0) {
      this.processingSegments = false;
      return;
    }

    const batchSize = 5;
    const batch = this.segmentQueue.splice(0, batchSize);

    this.report.summary.segmentsParsed += batch.length;
    this.mapper.addTargetBatch(batch);

    // Use the callback to notify debugger about new segments
    batch.forEach((segment) => {
      if (this.onTargetSegment) {
        this.onTargetSegment(segment);
      }
    });

    // Continue processing if more segments exist
    if (this.segmentQueue.length > 0) {
      requestAnimationFrame(() => this.processSegmentQueue());
    } else {
      // Mark as not processing, but check again in case new items were added
      this.processingSegments = false;

      // Double-check for race condition: items added while we were finishing
      if (this.segmentQueue.length > 0 && !this.processingSegments) {
        this.scheduleSegmentProcessing();
      }
    }
  }

  finalizeSummary(status, errorMessage) {
    const duration = ((performance.now() - this.startTime) / 1000).toFixed(2);
    this.report.summary.status = status;
    this.report.summary.duration = `${duration} seconds`;
    if (errorMessage) {
      this.report.summary.errorDetails = errorMessage;
    }
  }

  updateReport() {
    if (!this.reportDisplayEl) return;

    // Check if report structure exists
    const existingSummarySection =
      this.reportDisplayEl.querySelector(".summary-section");
    const existingLogsSection =
      this.reportDisplayEl.querySelector(".logs-section");
    const existingStreamSection =
      this.reportDisplayEl.querySelector(".stream-section");

    // If structure doesn't exist, do initial render
    if (
      !existingSummarySection ||
      !existingLogsSection ||
      !existingStreamSection
    ) {
      this.renderReportStructure();
    }

    // Update summary
    this.updateSummarySection();

    // Update logs
    this.updateLogsSection();

    // Append new streamed data (incremental)
    this.appendStreamedData();
  }

  renderReportStructure() {
    const statusClass = this.report.summary?.status
      ? this.report.summary.status.toLowerCase().replace(/\s+/g, "-")
      : "";

    const html = `
            <div class="report-section summary-section">
                <h4>Generation Summary <span class="status-badge ${statusClass}" id="status-badge">${
      this.report.summary?.status || "Initializing"
    }</span></h4>
                <div class="report-content" id="summary-content"></div>
            </div>
            
            <div class="report-section logs-section">
                <h4>Logs</h4>
                <div class="report-content logs-content" id="logs-content"></div>
            </div>
            
            <div class="report-section stream-section">
                <h4>Streamed Response Data <span style="font-size: 11px; font-weight: normal; opacity: 0.8;" id="char-count">(0 characters)</span></h4>
                <div class="report-content stream-content" id="stream-content"></div>
            </div>
        `;

    this.reportDisplayEl.innerHTML = html;
    this.streamedDataRendered = 0;
  }

  updateSummarySection() {
    if (!this.report.summary) return;

    const summaryContent = document.getElementById("summary-content");
    const statusBadge = document.getElementById("status-badge");

    if (summaryContent) {
      summaryContent.textContent = JSON.stringify(
        this.report.summary,
        null,
        2
      );
    }

    if (statusBadge) {
      const statusClass = this.report.summary.status
        .toLowerCase()
        .replace(/\s+/g, "-");
      statusBadge.className = `status-badge ${statusClass}`;
      statusBadge.textContent = this.report.summary.status;
    }
  }

  updateLogsSection() {
    const logsContent = document.getElementById("logs-content");
    if (!logsContent) return;

    const logsHTML = this.logger.getLogsHTML();
    logsContent.innerHTML = logsHTML;

    // Auto-scroll to bottom
    logsContent.scrollTop = logsContent.scrollHeight;
  }

  appendStreamedData() {
    const streamContent = document.getElementById("stream-content");
    const charCount = document.getElementById("char-count");

    if (!streamContent) return;

    // Calculate new data to append
    const newData = this.report.streamedData.substring(
      this.streamedDataRendered
    );

    if (newData.length > 0) {
      // Create text node and append (more efficient than innerHTML)
      const textNode = document.createTextNode(newData);
      streamContent.appendChild(textNode);

      // Update rendered count
      this.streamedDataRendered = this.report.streamedData.length;

      // Update character count
      if (charCount) {
        charCount.textContent = `(${this.report.streamedData.length} characters)`;
      }

      // Auto-scroll to bottom during streaming
      if (this.running) {
        streamContent.scrollTop = streamContent.scrollHeight;
      }
    }
  }

  clearReport() {
    this.report = {
      summary: null,
      streamedData: "",
    };
    this.streamedDataRendered = 0;

    if (this.reportDisplayEl) {
      this.reportDisplayEl.innerHTML =
        '<div class="report-empty">No report data available. Click "Generate & Map" to start.</div>';
    }
  }

  updateButton() {
    this.buttonElement.textContent = this.running
      ? "Stop Generation"
      : "Generate & Map";
  }
}