/**
 * Main App - Optimized
 */

import { Parser } from "./parser.js";
import { Mapper } from "./mapper.js";
import { AIStream } from "./stream.js";
import { Logger } from "./logger.js";
import { debounce } from "../../shared/js/utils.js";
import { ProcessDebugger } from "../../extensions/process-debugger/js/debugger-core.js";

const elements = {
  sourceInput: document.getElementById("sourceInput"),
  generateButton: document.getElementById("generateBtn"),
  switchViewBtn: document.getElementById("switchViewBtn"),
  mapDisplay: document.getElementById("display"),
  reportDisplay: document.getElementById("report-display"),
  mapperView: document.getElementById("mapperView"),
  debugView: document.getElementById("debugView"),
  appTitle: document.getElementById("appTitle"),
};

const logger = new Logger();
const debuggerInstance = new ProcessDebugger();

const mapper = new Mapper(elements.mapDisplay, logger, (eventType, data) => {
  if (eventType === "RACE_CONDITION_DETECTED") {
    debuggerInstance.handleRaceCondition(data);
  }
});

mapper.setDebugClickHandler((marker, statusFromDOM) => {
  const targetExists = mapper.target.find((t) => t.marker === marker);
  const sourceExists = mapper.source.find((s) => s.marker === marker);

  let actualStatus;
  if (sourceExists && targetExists) actualStatus = "matched";
  else if (!sourceExists && targetExists) actualStatus = "orphan";
  else if (sourceExists && !targetExists) actualStatus = "gap";
  else actualStatus = "unknown";

  const hasDebugEvents = debuggerInstance.eventsByMarker.has(marker);

  if (!hasDebugEvents) {
    if (actualStatus === "gap") {
      debuggerInstance.analyzeWaitingMarker(marker);
    } else if (actualStatus === "matched" || actualStatus === "orphan") {
      alert(
        `⚠️ Debug data missing for ${marker}\n\n` +
        `Status: ${actualStatus.toUpperCase()}\n` +
        `Target exists: ${!!targetExists}\n\n` +
        `The segment was processed, but debug events were not captured.\n\n` +
        `Solution: Wait or re-generate to capture full debug data.`
      );
      return;
    }
  }

  if (!document.body.classList.contains("debug-view-active")) {
    elements.switchViewBtn.click();
  }

  setTimeout(() => debuggerInstance.showTimelineForMarker(marker), 100);
});

const stream = new AIStream({
  mapper: mapper,
  logger: logger,
  sourceInputElement: elements.sourceInput,
  buttonElement: elements.generateButton,
  reportDisplayEl: elements.reportDisplay,
  onGenerationStart: () => debuggerInstance.clearEvents(),
  onGenerationEnd: () => {},
  onTargetSegment: (segment) => debuggerInstance.queueSegment(segment),
});

function autoParseSource() {
  const fullText = elements.sourceInput.value;
  const contentForMapping = Parser.extractContentForMapping(fullText);
  const segments = contentForMapping
    ? Parser.parseWithUniqueMarkers(contentForMapping)
    : [];
  mapper.setSource(segments);
  debuggerInstance.handleSourceSegments(segments);
}

window.addEventListener("load", () => {
  logger.log("Application initialized.");
  autoParseSource();
});

const debouncedAutoParseSource = debounce(autoParseSource, 500);

elements.sourceInput.addEventListener("input", debouncedAutoParseSource);

elements.generateButton.addEventListener("click", () => {
  if (debouncedAutoParseSource.pending()) {
    debouncedAutoParseSource.flush();
  }
  requestAnimationFrame(() => stream.toggle());
});

elements.switchViewBtn.addEventListener("click", () => {
  const isDebugging = document.body.classList.toggle("debug-view-active");

  if (isDebugging) {
    elements.mapperView.classList.remove("active-view");
    elements.debugView.classList.add("active-view");
    elements.switchViewBtn.innerHTML = "🗺️ Switch to Mapper";
    elements.appTitle.innerHTML = "🔬 Process Debug";
  } else {
    elements.debugView.classList.remove("active-view");
    elements.mapperView.classList.add("active-view");
    elements.switchViewBtn.innerHTML = "🔬 Switch to Debug";
    elements.appTitle.innerHTML = "AI Segment Mapper";
  }
});