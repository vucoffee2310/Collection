/**
 * Stream Module - Optimized
 */

import { StreamingParser } from "./parser.js";

export class AIStream {
  constructor(dependencies) {
    this.API_KEY = "AIzaSyCQgCQRrggBobJ-knaLqy3ORvpozHISWIk";
    this.API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${this.API_KEY}`;

    Object.assign(this, dependencies);

    this.parser = new StreamingParser();
    this.running = false;
    this.abortController = null;
    this.startTime = 0;

    this.report = {
      summary: null,
      streamedData: "",
    };

    this.streamedDataRendered = 0;
    this.segmentQueue = [];
    this.processingSegments = false;

    this.lastPartialUpdate = 0;
    this.partialUpdateThrottle = 200;
    this.lastReportUpdate = 0;
    this.reportUpdateThrottle = 500;
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

    if (this.onGenerationStart) this.onGenerationStart();

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

    if (!this.mapper.reset()) {
      this.logger.error("Cannot start - mapper is busy");
      this.running = false;
      this.updateButton();
      return;
    }

    this.parser.setSourceSegments(this.mapper.source);
    this.parser.reset();

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
        if (!response.ok) throw await this._createApiError(response);
        this.logger.info(`Received response stream (${response.status}).`);
        return response.body.getReader();
      })
      .then((reader) => this.processStream(reader))
      .then(() => this.stop("Completed"))
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
      if (errorText) errorDetails += `\n\nResponse Body:\n${errorText}`;
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

    if (this.onGenerationEnd) this.onGenerationEnd();
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
              this.report.summary.finishReason = data.candidates[0].finishReason;
            }

            if (text) {
              this.report.streamedData += text;

              if (this.onStreamChunk) this.onStreamChunk(text);

              if (chunkCount % 5 === 0) {
                this.logger.chunk(`CHUNK: ${text.substring(0, 50).replace(/\n/g, " ")}...`);
              }

              const newSegments = this.parser.feed(text);
              if (newSegments.length > 0) {
                this.queueSegments(newSegments);
              }

              this.report.summary.chunksReceived++;
              chunkCount++;

              const now = performance.now();
              if (now - this.lastPartialUpdate >= this.partialUpdateThrottle) {
                const pending = this.parser.getPending();
                if (pending) this.mapper.setTargetPartial(pending);
                this.lastPartialUpdate = now;
              }

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

    const final = this.parser.finalize();
    if (final.length > 0) this.queueSegments(final);

    await this.drainQueue();

    this.mapper.setTargetPartial(null);
    this.mapper.finalize();

    const matchingReport = this.parser.getMatchingReport();

    if (matchingReport.skipped > 0) {
      this.logger.warn(`Skipped ${matchingReport.skipped} invalid marker(s)`);

      let reportText = `⚠️ MARKER MATCHING REPORT\n\n`;
      reportText += `Total: ${matchingReport.totalResponseMarkers}\n`;
      reportText += `✅ Matched: ${matchingReport.successfulMatches}\n`;
      reportText += `⚠️ Skipped: ${matchingReport.skipped}\n`;
      reportText += `📊 Coverage: ${matchingReport.coverage}\n\n`;

      if (matchingReport.fakeMarkers > 0) {
        reportText += `🔴 FAKE MARKERS: ${matchingReport.fakeMarkers}\n\n`;
        matchingReport.warnings
          .filter((w) => w.type === "FAKE_MARKER")
          .slice(0, 5)
          .forEach((w, i) => {
            reportText += `${i + 1}. (${w.baseMarker}) at pos ${w.responsePosition}\n`;
          });

        if (matchingReport.fakeMarkers > 5) {
          reportText += `... and ${matchingReport.fakeMarkers - 5} more\n\n`;
        }
      }

      reportText += `\nRejected via sliding window database matching.`;
      alert(reportText);
    }

    this.updateReport();
  }

  queueSegments(segments) {
    this.segmentQueue.push(...segments);
    if (!this.processingSegments) {
      this.scheduleSegmentProcessing();
    }
  }

  scheduleSegmentProcessing() {
    this.processingSegments = true;
    queueMicrotask(() => this.processSegmentQueue());
  }

  processSegmentQueue() {
    while (this.segmentQueue.length > 0) {
      const batch = this.segmentQueue.splice(0, 5);

      this.report.summary.segmentsParsed += batch.length;
      this.mapper.addTargetBatch(batch);

      batch.forEach((segment) => {
        if (this.onTargetSegment) this.onTargetSegment(segment);
      });

      if (this.segmentQueue.length > 50) {
        requestAnimationFrame(() => this.processSegmentQueue());
        return;
      }
    }

    this.processingSegments = false;
  }

  async drainQueue() {
    return new Promise((resolve) => {
      const checkQueue = () => {
        if (this.segmentQueue.length === 0 && !this.processingSegments) {
          resolve();
        } else {
          requestAnimationFrame(checkQueue);
        }
      };
      checkQueue();
    });
  }

  finalizeSummary(status, errorMessage) {
    const duration = ((performance.now() - this.startTime) / 1000).toFixed(2);
    this.report.summary.status = status;
    this.report.summary.duration = `${duration} seconds`;
    if (errorMessage) this.report.summary.errorDetails = errorMessage;
  }

  updateReport() {
    if (!this.reportDisplayEl) return;

    if (!this.reportDisplayEl.querySelector(".summary-section")) {
      this.renderReportStructure();
    }

    this.updateSummarySection();
    this.updateLogsSection();
    this.appendStreamedData();
  }

  renderReportStructure() {
    const statusClass = this.report.summary?.status
      ?.toLowerCase()
      .replace(/\s+/g, "-") || "";

    this.reportDisplayEl.innerHTML = `
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

    this.streamedDataRendered = 0;
  }

  updateSummarySection() {
    if (!this.report.summary) return;

    const summaryContent = document.getElementById("summary-content");
    const statusBadge = document.getElementById("status-badge");

    if (summaryContent) {
      summaryContent.textContent = JSON.stringify(this.report.summary, null, 2);
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

    logsContent.innerHTML = this.logger.getLogsHTML();
    logsContent.scrollTop = logsContent.scrollHeight;
  }

  appendStreamedData() {
    const streamContent = document.getElementById("stream-content");
    const charCount = document.getElementById("char-count");

    if (!streamContent) return;

    const newData = this.report.streamedData.substring(this.streamedDataRendered);

    if (newData.length > 0) {
      streamContent.appendChild(document.createTextNode(newData));
      this.streamedDataRendered = this.report.streamedData.length;

      if (charCount) {
        charCount.textContent = `(${this.report.streamedData.length} characters)`;
      }

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