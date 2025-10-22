/**
 * Debugger Events - Updated for streamlined templates
 */

import { getSourceMarkerSummary } from "../../../shared/js/formatters.js"; // ✅ Import directly from shared
import {
  MatchedStepTemplates,
  WaitingStepTemplates,
  OrphanStepTemplates,
  RaceConditionStepTemplates,
} from "./debugger-templates.js";

export function createWaitingEvent(source, debugContext) {
  const baseMarker = source.marker.split("-")[0];
  const index = parseInt(source.marker.split("-")[1]);
  const timestamp = new Date().toLocaleTimeString();

  const waitTime = debugContext.generationStartTime
    ? Math.floor((Date.now() - debugContext.generationStartTime) / 1000)
    : 0;

  const totalSources = debugContext.sourceSegments.length;
  const matchedCount = debugContext.targetSegments.filter((t) =>
    debugContext.sourceSegments.find((s) => s.marker === t.marker)
  ).length;
  const progressPercent = Math.floor((matchedCount / totalSources) * 100);

  const sourceIndex = debugContext.sourceSegments.findIndex(
    (s) => s.marker === source.marker
  );

  let severity =
    waitTime > 60 || (matchedCount > 0 && sourceIndex < matchedCount)
      ? "warning"
      : "info";

  const jsonPair = {
    marker: source.marker,
    source: source.text,
    target: "⏳ PENDING...",
  };

  const sameBaseSegments = debugContext.sourceSegments.filter((s) =>
    s.marker.startsWith(baseMarker + "-")
  );
  const sameBaseMatched = sameBaseSegments.filter((s) =>
    debugContext.targetSegments.find((t) => t.marker === s.marker)
  ).length;

  const steps = [
    WaitingStepTemplates.sourceLoaded(
      source.marker,
      source.text.length,
      sourceIndex + 1,
      totalSources,
      debugContext.generationStartTime
        ? new Date(debugContext.generationStartTime).toLocaleTimeString()
        : "N/A"
    ),
    WaitingStepTemplates.parseMarker(source.marker, baseMarker, index),
    WaitingStepTemplates.displaySourceText(source.text),
    WaitingStepTemplates.waitingAnalysis(
      source.marker,
      totalSources,
      matchedCount,
      progressPercent,
      waitTime,
      severity
    ),
    WaitingStepTemplates.progressTracking(matchedCount, totalSources),
    WaitingStepTemplates.checkAiStream(source.marker, severity),
    WaitingStepTemplates.baseMarkerAnalysis(
      baseMarker,
      sameBaseSegments.length,
      sameBaseMatched,
      sameBaseSegments.length - sameBaseMatched,
      index,
      sameBaseSegments.map((s) => s.marker).join(", ")
    ),
    WaitingStepTemplates.currentJsonState(jsonPair),
    WaitingStepTemplates.recommendations(severity, waitTime, progressPercent),
  ];

  return {
    type: "waiting",
    severity,
    number: debugContext.eventCount + 1,
    timestamp,
    marker: source.marker,
    jsonPair,
    statusText: `Status: WAITING - ${
      severity === "warning" ? "Long wait or skipped" : "Normal"
    }`,
    statusIcon: "⏳",
    steps,
  };
}

export function createMatchedEvent(target, source, timestamp, debugContext) {
  const baseMarker = target.marker.split("-")[0];
  const index = parseInt(target.marker.split("-")[1]);
  const jsonPair = {
    marker: target.marker,
    source: source.text,
    target: target.text,
  };

  const steps = [
    MatchedStepTemplates.receivedSegment(
      target.marker,
      target.text.length,
      timestamp
    ),
    MatchedStepTemplates.parseMarker(target.marker, baseMarker, index),
    MatchedStepTemplates.displayTargetText(target.text),
    MatchedStepTemplates.searchSourceMap(
      target.marker,
      debugContext.sourceSegments.length
    ),
    MatchedStepTemplates.retrievedSource(
      source.marker,
      source.text,
      source.text.length
    ),
    MatchedStepTemplates.compareSourceTarget(source.text, target.text),
    MatchedStepTemplates.finalJsonPair(jsonPair),
    MatchedStepTemplates.classificationResult(),
    MatchedStepTemplates.addToMapper(),
  ];

  return {
    type: "matched",
    severity: "success",
    number: debugContext.eventCount,
    timestamp,
    marker: target.marker,
    jsonPair,
    statusText: "",
    statusIcon: "✅",
    steps,
  };
}

export function createOrphanEvent(target, timestamp, debugContext) {
  const baseMarker = target.marker.split("-")[0];
  const index = parseInt(target.marker.split("-")[1]);
  const sourceWithBase = debugContext.sourceSegments.filter((s) =>
    s.marker.startsWith(baseMarker + "-")
  );

  let reason, gapDetails, searchResult, severity, diagnostics;

  if (sourceWithBase.length === 0) {
    severity = "critical";
    reason = `AI hallucinated base marker (${baseMarker})`;
    gapDetails = `🔴 CRITICAL: AI generated (${baseMarker}) but source has NO segments with this base marker.`;
    searchResult = [
      { icon: "🔍", text: `Searching: (${baseMarker})`, type: "info" },
      { icon: "❌", text: `NO (${baseMarker}) in source`, type: "error" },
      { icon: "💥", text: "AI HALLUCINATION", type: "error" },
    ];
    diagnostics = [
      "AI invented new marker category",
      `Source doesn't use (${baseMarker})`,
      "Poor prompt adherence",
    ];
  } else {
    severity = "warning";
    const available = sourceWithBase.map((s) => s.marker).join(", ");
    const maxIndex = Math.max(
      ...sourceWithBase.map((s) => parseInt(s.marker.split("-")[1]))
    );
    reason = `Index mismatch for (${baseMarker})`;
    gapDetails = `⚠️ INDEX MISMATCH: Source has ${sourceWithBase.length} (${baseMarker}) segment(s), but AI generated index ${index}.\n\nAvailable: ${available}`;
    searchResult = [
      { icon: "🔍", text: `Searching: ${target.marker}`, type: "info" },
      {
        icon: "✔",
        text: `Found ${sourceWithBase.length} (${baseMarker})`,
        type: "success",
      },
      {
        icon: "❌",
        text: `Index ${index} NOT found (max: ${maxIndex})`,
        type: "error",
      },
      { icon: "⚠️", text: "INDEX OUT OF RANGE", type: "warning" },
    ];
    diagnostics = [
      `AI generated too many (${baseMarker}) segments`,
      `Source: ${sourceWithBase.length}, AI: ${index + 1}+`,
      "Possible duplication",
    ];
  }

  const jsonPair = { marker: target.marker, source: null, target: target.text };

  const steps = [
    OrphanStepTemplates.receivedOrphan(
      target.marker,
      target.text.length,
      timestamp,
      baseMarker,
      index
    ),
    OrphanStepTemplates.parseOrphanMarker(target.marker, baseMarker, index),
    OrphanStepTemplates.displayOrphanText(target.text),
    OrphanStepTemplates.searchForMatch(
      target.marker,
      debugContext.sourceSegments.length
    ),
    OrphanStepTemplates.deepDiagnostic(target.marker, searchResult, severity),
    OrphanStepTemplates.rootCause(reason, gapDetails, diagnostics),
    OrphanStepTemplates.sourceInventory(
      getSourceMarkerSummary(debugContext.sourceSegments)
    ),
    OrphanStepTemplates.finalOrphanJson(jsonPair),
    OrphanStepTemplates.severityAssessment(severity),
    OrphanStepTemplates.addOrphanToMapper(
      target.marker,
      severity,
      reason,
      diagnostics
    ),
  ];

  return {
    type: "orphan",
    severity,
    number: debugContext.eventCount,
    timestamp,
    marker: target.marker,
    jsonPair,
    statusText: `Status: ORPHAN - ${reason}`,
    statusIcon: severity === "critical" ? "🔴" : "⚠️",
    steps,
  };
}

export function createRaceConditionEvent(details, debugContext) {
  const timestamp = new Date().toLocaleTimeString();

  const steps = [
    RaceConditionStepTemplates.conflictDetected(
      details.marker,
      details.details,
      timestamp
    ),
    RaceConditionStepTemplates.stateAnalysis(
      details.marker,
      ["gap", "partial"],
      "matched"
    ),
    RaceConditionStepTemplates.recommendation(),
  ];

  return {
    type: "race-condition",
    severity: "critical",
    number: debugContext.eventCount + 1,
    timestamp,
    marker: details.marker,
    jsonPair: {
      error: "State conflict",
      marker: details.marker,
      details: details.details,
    },
    statusText: `Status: CONFLICT - Invalid state transition`,
    statusIcon: "💥",
    steps,
  };
}
