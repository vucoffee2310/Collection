/**
 * Minimal Processor UI - Position-Ordered JSON View
 * ✅ Shows JSON by position order (1, 2, 3, ...)
 * ✅ Real-time updates without full reload
 */

import { getVideoId, copyToClipboard } from "../utils/helpers.js";
import { getPotWithRetry } from "../utils/api.js";
import { convertSubtitlesToMarkedParagraphs } from "../core/subtitle-parser.js";
import { extractMarkersWithContext } from "../core/marker-extractor.js";
import { StreamingTranslationProcessor } from "../core/stream-processor/processor.js";
import { loadCompoundData } from "../utils/compounds/data-loader.js";
import { formatJSON, downloadFile } from "../utils/helpers.js";
import { getGlobalStats } from "../utils/json-helpers.js";

const contentCache = new Map();
const jsonCache = new Map();
let lastClearedVideoId = null;

const processTrack = async (track) => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;

  if (contentCache.has(cacheKey)) return contentCache.get(cacheKey);

  const response = await getPotWithRetry(videoId);
  const pot = response?.pot;
  if (!pot) throw new Error("Unable to obtain POT token");

  const xml = await fetch(
    `${track.baseUrl}&fromExt=true&c=WEB&pot=${pot}`
  ).then((r) => r.text());
  const { text, metadata, language } = convertSubtitlesToMarkedParagraphs(
    xml,
    track.languageCode
  );
  const content = `Translate into Vietnamese\n\n\`\`\`\n---\nhttps://www.udemy.com/742828/039131.php\n---\n\n${text}\n\`\`\``;

  const result = { content, metadata, language };
  contentCache.set(cacheKey, result);
  return result;
};

const getOrCreateJSON = async (track) => {
  const videoId = getVideoId();
  const cacheKey = `${videoId}::${track.baseUrl}`;

  if (jsonCache.has(cacheKey)) return jsonCache.get(cacheKey);

  const result = await processTrack(track);
  if (!result) return null;

  const json = extractMarkersWithContext(
    result.content,
    result.metadata,
    result.language
  );
  json.sourceLanguage = result.language;

  jsonCache.set(cacheKey, json);
  return json;
};

// ✅ Convert JSON to position-ordered array
const getPositionOrderedData = (json) => {
  const items = [];

  Object.entries(json.markers || {}).forEach(([marker, instances]) => {
    instances.forEach((inst) => {
      items.push(inst);
    });
  });

  // Sort by position
  items.sort((a, b) => a.position - b.position);

  return items;
};

export const createProcessorUI = (track) => {
  const container = document.createElement("div");
  container.style.cssText =
    "padding: 12px; background: #f5f5f5; border: 1px solid #ccc; margin: 8px 0; border-radius: 4px;";

  const title = document.createElement("div");
  title.style.cssText =
    "font-weight: bold; margin-bottom: 8px; font-size: 13px;";
  title.textContent = "🌐 AI Studio Translation";

  const status = document.createElement("div");
  status.style.cssText = "font-size: 11px; color: #666; margin-bottom: 8px;";
  status.textContent = "Ready to process";

  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "margin-bottom: 8px;";

  const createBtn = (text, primary = false) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      padding: 8px 16px; margin-right: 8px; font-size: 12px; border-radius: 4px; cursor: pointer;
      background: ${primary ? "#000" : "#fff"}; color: ${
      primary ? "#fff" : "#000"
    };
      border: 1px solid #000; font-weight: ${primary ? "bold" : "normal"};
    `;
    btn.onmouseenter = () =>
      (btn.style.background = primary ? "#333" : "#f0f0f0");
    btn.onmouseleave = () => (btn.style.background = primary ? "#000" : "#fff");
    return btn;
  };

  const processBtn = createBtn("Process Translation", true);
  const downloadBtn = createBtn("Download JSON");
  const copyBtn = createBtn("Copy JSON");
  const toggleBtn = createBtn("Show JSON ▼");

  downloadBtn.style.display = "none";
  copyBtn.style.display = "none";
  toggleBtn.style.display = "none";

  btnContainer.append(processBtn, downloadBtn, copyBtn, toggleBtn);

  // Stats bar
  const statsBar = document.createElement("div");
  statsBar.style.cssText =
    "display: none; padding: 10px; background: #e3f2fd; border: 1px solid #2196F3; border-radius: 4px; margin-bottom: 8px; font-size: 11px;";

  // ✅ JSON Viewer (position-ordered)
  const jsonViewer = document.createElement("div");
  jsonViewer.style.cssText = `
    display: none;
    max-height: 500px;
    overflow-y: auto;
    background: #1e1e1e;
    border: 1px solid #000;
    border-radius: 4px;
    padding: 10px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 11px;
    color: #d4d4d4;
    line-height: 1.4;
  `;

  let processedJSON = null;
  let positionCache = new Map(); // Cache rendered positions

  toggleBtn.onclick = () => {
    const hidden = jsonViewer.style.display === "none";
    jsonViewer.style.display = hidden ? "block" : "none";
    toggleBtn.textContent = hidden ? "Hide JSON ▲" : "Show JSON ▼";
  };

  // Update stats
  const updateStats = (json) => {
    const all = Object.values(json.markers || {}).flat();
    const matched = all.filter((s) => s.status === "MATCHED").length;
    const merged = all.filter((s) => s.status === "MERGED").length;
    const orphaned = all.filter((s) => s.status?.includes("ORPHAN")).length;
    const total = json.totalMarkers || all.length;
    const percent = total ? Math.round(((matched + merged) / total) * 100) : 0;

    statsBar.innerHTML = `
      <div style="display: flex; gap: 15px; margin-bottom: 5px;">
        <span>✅ ${matched}</span>
        <span>🔗 ${merged}</span>
        <span>❌ ${orphaned}</span>
        <span>📊 ${total} total</span>
        <span>🎯 ${percent}%</span>
      </div>
      <div style="background: #fff; height: 8px; border-radius: 4px; overflow: hidden;">
        <div style="width: ${percent}%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
      </div>
    `;
  };

  // ✅ Render position entry
  const renderPosition = (item, isNew = false) => {
    const statusColors = {
      MATCHED: "#4CAF50",
      MERGED: "#FF9800",
      ORPHAN: "#F44336",
      ORPHAN_GROUP: "#9C27B0",
      GAP: "#666",
    };

    const color = statusColors[item.status] || "#666";

    // Build compact JSON representation
    const jsonObj = {
      position: item.position,
      domainIndex: item.domainIndex,
      status: item.status,
      ...(item.matchMethod && { matchMethod: item.matchMethod }),
      ...(item.overallTranslation && {
        translation: item.overallTranslation.substring(0, 100),
      }),
      utteranceCount: item.utterances?.length || 0,
    };

    const jsonStr = JSON.stringify(jsonObj, null, 2)
      .split("\n")
      .map((line) => "  " + line)
      .join("\n");

    return `
      <div id="pos-${item.position}" style="
        margin-bottom: 10px;
        padding: 8px;
        background: #2d2d2d;
        border-left: 4px solid ${color};
        border-radius: 3px;
        ${isNew ? "animation: slideIn 0.3s;" : ""}
      ">
        <div style="color: ${color}; font-weight: bold; margin-bottom: 4px;">
          Position ${item.position}: ${item.domainIndex} - ${item.status}
        </div>
        <pre style="margin: 0; color: #d4d4d4; font-size: 10px; white-space: pre-wrap;">${jsonStr}</pre>
      </div>
    `;
  };

  // ✅ Update JSON viewer incrementally
  const updateJSONView = (json, fullRebuild = false) => {
    const items = getPositionOrderedData(json);

    if (fullRebuild) {
      // Full rebuild (initial load or final update)
      jsonViewer.innerHTML = items
        .map((item) => renderPosition(item, false))
        .join("");
      items.forEach((item) => positionCache.set(item.position, item.status));
    } else {
      // Incremental update - only update changed positions
      items.forEach((item) => {
        const cached = positionCache.get(item.position);

        if (cached !== item.status) {
          const existingDiv = jsonViewer.querySelector(`#pos-${item.position}`);

          if (existingDiv) {
            // Replace existing
            const temp = document.createElement("div");
            temp.innerHTML = renderPosition(item, true);
            existingDiv.replaceWith(temp.firstElementChild);
          } else {
            // Append new (shouldn't happen in position order, but just in case)
            const temp = document.createElement("div");
            temp.innerHTML = renderPosition(item, true);
            jsonViewer.appendChild(temp.firstElementChild);
          }

          positionCache.set(item.position, item.status);
        }
      });
    }
  };

  // Main processing
  processBtn.onclick = async () => {
    processBtn.disabled = true;
    processBtn.textContent = "Initializing...";
    status.textContent = "Loading...";

    positionCache.clear();

    try {
      await loadCompoundData();
      const result = await processTrack(track);
      const sourceJSON = await getOrCreateJSON(track);

      if (!result || !sourceJSON) throw new Error("Failed to load data");

      const processor = new StreamingTranslationProcessor(
        JSON.parse(JSON.stringify(sourceJSON))
      );

      statsBar.style.display = "block";
      toggleBtn.style.display = "inline-block";
      jsonViewer.style.display = "block";
      toggleBtn.textContent = "Hide JSON ▲";

      // Initial render
      updateStats(sourceJSON);
      updateJSONView(sourceJSON, true);

      status.textContent = "Opening AI Studio...";
      processBtn.textContent = "Processing...";

      let lastText = "";
      let cleanup;

      const timeoutId = setTimeout(() => {
        status.textContent = "⏱️ Timeout (5 min)";
        status.style.color = "#ff9800";
        processBtn.disabled = false;
        processBtn.textContent = "Process Translation";
      }, 300000);

      const handler = (e) => {
        const msg = e.detail;

        if (msg.action === "aiStudioUpdate") {
          const chunk = msg.currentText.substring(lastText.length);
          if (chunk) {
            processor.processChunk(chunk);
            const currentJSON = processor.getUpdatedJSON();

            // Update UI
            updateStats(currentJSON);
            updateJSONView(currentJSON, false); // ✅ Incremental update

            status.textContent = `Processing: ${processor.stats.matched} matched, ${processor.stats.merged} merged`;
          }
          lastText = msg.currentText;

          if (msg.isComplete) {
            processor.finalize();
            processedJSON = processor.getUpdatedJSON();

            // Final update
            updateStats(processedJSON);
            updateJSONView(processedJSON, true); // ✅ Full rebuild for final state

            copyToClipboard(formatJSON(processedJSON));

            const stats = getGlobalStats(processedJSON);
            const rate = sourceJSON.totalMarkers
              ? (
                  ((processor.stats.matched + processor.stats.merged) /
                    sourceJSON.totalMarkers) *
                  100
                ).toFixed(1)
              : 0;

            status.innerHTML = `✅ Complete! ${rate}% success • ${stats.totalUtterances} utterances • JSON copied`;
            status.style.color = "#27ae60";

            processBtn.textContent = "Done ✓";
            processBtn.style.background = "#27ae60";
            downloadBtn.style.display = "inline-block";
            copyBtn.style.display = "inline-block";

            clearTimeout(timeoutId);
            cleanup();

            setTimeout(() => {
              processBtn.textContent = "Process Translation";
              processBtn.style.background = "#000";
              processBtn.disabled = false;
            }, 3000);
          }
        }

        if (msg.action === "aiStudioError" || msg.action === "aiStudioClosed") {
          status.textContent =
            msg.action === "aiStudioError"
              ? `❌ ${msg.error}`
              : "⚠️ AI Studio closed";
          status.style.color = "#d32f2f";
          processBtn.disabled = false;
          processBtn.textContent = "Process Translation";
          cleanup();
        }

        if (msg.action === "aiStudioStarted") {
          status.textContent = "AI Studio started...";
        }
      };

      cleanup = () => {
        window.removeEventListener("aiStudioMessage", handler);
        clearTimeout(timeoutId);
      };

      window.addEventListener("aiStudioMessage", handler);

      chrome.runtime.sendMessage(
        {
          action: "openAIStudio",
          promptText: result.content,
          cardName: `Translation: ${track.languageCode || "Unknown"}`,
        },
        (res) => {
          if (chrome.runtime.lastError || !res?.success) {
            status.textContent = "❌ Failed to open AI Studio";
            status.style.color = "#d32f2f";
            processBtn.disabled = false;
            processBtn.textContent = "Process Translation";
            cleanup();
          }
        }
      );
    } catch (err) {
      status.textContent = `❌ ${err.message}`;
      status.style.color = "#d32f2f";
      processBtn.disabled = false;
      processBtn.textContent = "Process Translation";
    }
  };

  downloadBtn.onclick = () => {
    if (processedJSON) {
      downloadFile(
        formatJSON(processedJSON),
        `${getVideoId()}_translation.json`,
        "application/json"
      );
      downloadBtn.textContent = "Downloaded ✓";
      setTimeout(() => (downloadBtn.textContent = "Download JSON"), 2000);
    }
  };

  copyBtn.onclick = () => {
    if (processedJSON) {
      copyToClipboard(formatJSON(processedJSON));
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => (copyBtn.textContent = "Copy JSON"), 2000);
    }
  };

  // Animation
  const style = document.createElement("style");
  style.textContent =
    "@keyframes slideIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }";
  document.head.appendChild(style);

  container.append(title, status, btnContainer, statsBar, jsonViewer);
  return container;
};

export const clearCache = () => {
  const currentVideoId = getVideoId();
  if (currentVideoId !== lastClearedVideoId) {
    contentCache.clear();
    jsonCache.clear();
    lastClearedVideoId = currentVideoId;
  }
};
