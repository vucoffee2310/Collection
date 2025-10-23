/**
 * Debugger Templates - DETAILED FORENSIC ANALYSIS
 * Shows complete deduction process for each classification
 */

import { truncate } from "../../../shared/js/utils.js";

const step = (title, content, severity = "info", extras = {}) => ({
  title,
  content,
  severity,
  ...extras,
});

export const MatchedStepTemplates = {
  receivedSegment: (marker, textLength, timestamp) =>
    step(
      "📥 STEP 1: AI Response Received",
      "A new segment was parsed from the AI stream.",
      "info",
      {
        data: {
          Marker: marker,
          Length: `${textLength} chars`,
          Timestamp: timestamp,
        },
        flow: [
          { icon: "📡", text: "Stream parser detected new segment", type: "info" },
          { icon: "✅", text: "Segment extraction successful", type: "success" },
          { icon: "➡️", text: "Beginning classification process", type: "info" },
        ],
      }
    ),

  parseMarker: (marker, baseMarker, index) =>
    step(
      "🔍 STEP 2: Parse Marker Structure",
      "Breaking down the marker to understand its components.",
      "info",
      {
        data: {
          "Full Marker": marker,
          "Base Marker": `(${baseMarker})`,
          "Index Number": index,
          "Format": "base-index",
        },
        flow: [
          { icon: "📝", text: `Split "${marker}" by "-"`, type: "info" },
          { icon: "🔤", text: `Base = "${baseMarker}"`, type: "success" },
          { icon: "🔢", text: `Index = ${index}`, type: "success" },
        ],
      }
    ),

  displayTargetText: (text) =>
    step(
      "📋 STEP 3: Target Content",
      "The AI-generated content for this segment:",
      "info",
      { code: text }
    ),

  searchSourceMap: (marker, totalSegments) =>
    step(
      "🗂️ STEP 4: Search Source Map",
      `Now searching for <span class="marker-tag">${marker}</span> in the source segment map...`,
      "info",
      {
        data: {
          "Search Query": marker,
          "Total Sources": totalSegments,
          "Search Method": "Map.get(marker)",
        },
        flow: [
          { icon: "🔍", text: `Searching: sourceMap.get("${marker}")`, type: "info" },
          { icon: "⏳", text: "Performing lookup...", type: "info" },
        ],
      }
    ),

  retrievedSource: (marker, sourceText, textLength) =>
    step(
      "✅ STEP 5: MATCH FOUND!",
      `Source segment with marker <span class="marker-tag">${marker}</span> exists in the source map.`,
      "success",
      {
        data: {
          "Match Status": "✅ FOUND",
          Marker: marker,
          "Source Length": `${textLength} chars`,
          Preview: truncate(sourceText, 80),
        },
        flow: [
          { icon: "✅", text: "sourceMap.get() returned object", type: "success" },
          { icon: "✔️", text: "Marker match confirmed", type: "success" },
          { icon: "➡️", text: "Proceeding to comparison", type: "info" },
        ],
        alert: {
          type: "success",
          message: `✅ DEDUCTION CHECKPOINT:\nsourceMap.get("${marker}") ≠ null\n\nThis means:\n• Source with this marker exists\n• This is NOT an orphan\n• Can form complete pair`,
        },
      }
    ),

  compareSourceTarget: (sourceText, targetText) =>
    step(
      "🔄 STEP 6: Compare Source & Target",
      "Side-by-side comparison of source and AI-generated target:",
      "info",
      {
        comparison: { source: sourceText, target: targetText },
        data: {
          "Source Length": `${sourceText.length} chars`,
          "Target Length": `${targetText.length} chars`,
          "Difference": `${targetText.length - sourceText.length} chars`,
        },
      }
    ),

  finalJsonPair: (jsonPair) =>
    step(
      "📦 STEP 7: Create JSON Mapping",
      "Both source and target exist. Creating complete pair:",
      "success",
      { json: jsonPair }
    ),

  classificationResult: () =>
    step(
      "🎯 STEP 8: CLASSIFICATION → MATCHED",
      "All checks passed. This segment is classified as MATCHED.",
      "success",
      {
        flow: [
          { icon: "✔️", text: "CHECK 1: Source exists? YES", type: "success" },
          { icon: "✔️", text: "CHECK 2: Marker matches? YES", type: "success" },
          { icon: "✔️", text: "CHECK 3: Target exists? YES", type: "success" },
          { icon: "🎯", text: "RESULT: Status = MATCHED", type: "success" },
        ],
        alert: {
          type: "success",
          message:
            "✅ FINAL CLASSIFICATION: MATCHED\n\nReasoning:\n• Source segment exists in source map\n• Marker matches exactly\n• AI generated corresponding target\n• Complete pair can be formed",
        },
      }
    ),

  addToMapper: () =>
    step(
      "🎯 STEP 9: Add to Display",
      "Pair successfully added to the mapper display.",
      "success"
    ),
};

export const WaitingStepTemplates = {
  sourceLoaded: (marker, textLength, position, total, loadedTime) =>
    step(
      "📋 STEP 1: Source Segment Loaded",
      `Source segment <span class="marker-tag waiting">${marker}</span> is in the system, waiting for AI to generate target.`,
      "info",
      {
        data: {
          Marker: marker,
          "Source Length": `${textLength} chars`,
          "Position in Queue": `${position}/${total}`,
          "Loaded At": loadedTime,
        },
        flow: [
          { icon: "📥", text: "Source parsed from input", type: "success" },
          { icon: "✅", text: "Added to source map", type: "success" },
          { icon: "⏳", text: "Waiting for AI target", type: "warning" },
        ],
      }
    ),

  parseMarker: (marker, baseMarker, index) =>
    step(
      "🔍 STEP 2: Parse Marker Structure",
      "Understanding the marker components:",
      "info",
      {
        data: {
          "Full Marker": marker,
          "Base": `(${baseMarker})`,
          "Index": index,
        },
      }
    ),

  displaySourceText: (text) =>
    step(
      "📄 STEP 3: Source Text Content",
      "This is what needs to be translated by AI:",
      "info",
      { code: text }
    ),

  waitingAnalysis: (marker, totalSources, matchedCount, progressPercent, waitTime, severity) =>
    step(
      "⏱️ STEP 4: WHY IS THIS WAITING?",
      `Analyzing why <span class="marker-tag waiting">${marker}</span> hasn't been matched yet...`,
      severity,
      {
        data: {
          "Total Sources": totalSources,
          "Already Matched": matchedCount,
          "Still Waiting": totalSources - matchedCount,
          "Progress": `${progressPercent}%`,
          "Wait Time": `${waitTime} seconds`,
        },
        flow: [
          { icon: "❓", text: "Question: Is target generated?", type: "info" },
          { icon: "❌", text: `Check: targetMap.get("${marker}") = null`, type: "error" },
          { icon: "📊", text: `AI Progress: ${progressPercent}% (${matchedCount}/${totalSources})`, type: matchedCount > 0 ? "success" : "warning" },
          { icon: "⏱️", text: `Time elapsed: ${waitTime}s`, type: waitTime > 60 ? "warning" : "info" },
        ],
        alert: {
          type: severity === "warning" ? "warning" : "info",
          message:
            severity === "warning"
              ? `⚠️ DEDUCTION: WAITING (with concern)\n\nWhy waiting?\n• targetMap.get("${marker}") returned null\n• AI hasn't generated this segment yet\n\nWhy concerning?\n• Wait time is long (${waitTime}s)\n• OR other segments already generated\n• Possible AI skipped this segment`
              : `ℹ️ DEDUCTION: WAITING (normal)\n\nWhy waiting?\n• targetMap.get("${marker}") returned null\n• AI is still generating\n• Progress: ${progressPercent}%\n• Wait time is acceptable (${waitTime}s)`,
        },
      }
    ),

  progressTracking: (matchedCount, totalSources) =>
    step(
      "📈 STEP 5: Track Generation Progress",
      "Monitoring overall AI generation progress:",
      "info",
      {
        progress: {
          current: matchedCount,
          total: totalSources,
          percent: Math.floor((matchedCount / totalSources) * 100),
        },
      }
    ),

  checkAiStream: (marker, severity) =>
    step(
      "📡 STEP 6: Check AI Stream Status",
      "Monitoring the AI response stream for this marker:",
      severity,
      {
        flow: [
          { icon: "📡", text: "Stream status: ACTIVE", type: "info" },
          { icon: "🔍", text: `Searching stream for "${marker}"`, type: "info" },
          { icon: "❌", text: `Result: NOT FOUND YET`, type: "warning" },
        ],
      }
    ),

  baseMarkerAnalysis: (baseMarker, totalCount, matched, waiting, index, allMarkers) =>
    step(
      "📊 STEP 7: Analyze Base Marker Group",
      `All segments with base marker (${baseMarker}):`,
      "info",
      {
        data: {
          "Base Marker": `(${baseMarker})`,
          "Total Count": totalCount,
          "Matched": matched,
          "Waiting": waiting,
          "This Index": index,
          "All Markers": allMarkers,
        },
        flow: [
          { icon: "📝", text: `Found ${totalCount} (${baseMarker}) segments`, type: "info" },
          { icon: "✅", text: `${matched} already matched`, type: "success" },
          { icon: "⏳", text: `${waiting} still waiting`, type: "warning" },
        ],
      }
    ),

  currentJsonState: (jsonPair) =>
    step(
      "📦 STEP 8: Current Pair State",
      "Current incomplete state (source exists, target is null):",
      "warning",
      { json: jsonPair }
    ),

  recommendations: (severity, waitTime, progressPercent) =>
    step(
      "🎯 STEP 9: CLASSIFICATION → WAITING",
      "Final classification based on analysis:",
      severity,
      {
        flow: [
          { icon: "✔️", text: "CHECK 1: Source exists? YES", type: "success" },
          { icon: "❌", text: "CHECK 2: Target exists? NO", type: "error" },
          { icon: "📊", text: `CHECK 3: AI progress? ${progressPercent}%`, type: "info" },
          { icon: "⏱️", text: `CHECK 4: Wait time? ${waitTime}s`, type: waitTime > 60 ? "warning" : "info" },
          {
            icon: severity === "warning" ? "⚠️" : "ℹ️",
            text: `RESULT: Status = WAITING ${severity === "warning" ? "(CONCERN)" : "(NORMAL)"}`,
            type: severity,
          },
        ],
        alert: {
          type: severity === "warning" ? "warning" : "info",
          message:
            severity === "warning"
              ? `⚠️ FINAL CLASSIFICATION: WAITING (with warning)\n\nReasoning:\n• Source exists in sourceMap\n• Target does NOT exist in targetMap\n• Wait time is concerning (${waitTime}s)\n• May indicate AI skipped this segment\n\nAction: Continue monitoring`
              : `ℹ️ FINAL CLASSIFICATION: WAITING (normal)\n\nReasoning:\n• Source exists in sourceMap\n• Target does NOT exist in targetMap (yet)\n• AI is still generating (${progressPercent}% done)\n• Wait time is acceptable (${waitTime}s)\n\nAction: Wait for AI to generate this segment`,
        },
      }
    ),
};

export const OrphanStepTemplates = {
  receivedOrphan: (marker, textLength, timestamp, baseMarker, index) =>
    step(
      "📥 STEP 1: AI Response Received",
      `Segment <span class="marker-tag orphan">${marker}</span> received from AI.`,
      "warning",
      {
        data: {
          Marker: marker,
          "Base Marker": baseMarker,
          Index: index,
          Length: `${textLength} chars`,
          Timestamp: timestamp,
        },
        flow: [
          { icon: "📡", text: "Stream parser detected new segment", type: "info" },
          { icon: "✅", text: "Segment extracted", type: "success" },
          { icon: "➡️", text: "Starting classification...", type: "info" },
        ],
      }
    ),

  parseOrphanMarker: (marker, baseMarker, index) =>
    step(
      "🔍 STEP 2: Parse Marker Structure",
      "Breaking down the marker components:",
      "info",
      {
        data: {
          "Full Marker": marker,
          "Base Marker": `(${baseMarker})`,
          "Index": index,
        },
        flow: [
          { icon: "📝", text: `Parse "${marker}"`, type: "info" },
          { icon: "🔤", text: `Base = "${baseMarker}"`, type: "info" },
          { icon: "🔢", text: `Index = ${index}`, type: "info" },
        ],
      }
    ),

  displayOrphanText: (text) =>
    step(
      "📋 STEP 3: Target Content (from AI)",
      "The AI generated this content:",
      "warning",
      { code: text }
    ),

  searchForMatch: (marker, totalSegments) =>
    step(
      "🗂️ STEP 4: Search Source Map",
      `Attempting to find source for <span class="marker-tag orphan">${marker}</span>...`,
      "warning",
      {
        data: {
          "Search Query": marker,
          "Source Map Size": totalSegments,
          "Search Method": "sourceMap.get(marker)",
        },
        flow: [
          { icon: "🔍", text: `Query: sourceMap.get("${marker}")`, type: "info" },
          { icon: "⏳", text: "Searching...", type: "info" },
        ],
      }
    ),

  deepDiagnostic: (marker, searchResult, severity) =>
    step(
      `❌ STEP 5: MATCH FAILED - ${severity === "critical" ? "CRITICAL" : "WARNING"}`,
      `Source lookup for <span class="marker-tag orphan">${marker}</span> returned NULL. Running deep diagnostic...`,
      severity,
      {
        flow: searchResult,
        alert: {
          type: "error",
          message: `❌ DEDUCTION CHECKPOINT:\nsourceMap.get("${marker}") = null\n\nThis means:\n• No source segment with this exact marker exists\n• AI generated this marker without corresponding source\n• This is an ORPHAN\n\nNext: Analyze WHY this happened...`,
        },
      }
    ),

  rootCause: (reason, gapDetails, diagnostics) =>
    step(
      "🔬 STEP 6: ROOT CAUSE ANALYSIS",
      `<strong>Why is this an orphan?</strong>`,
      "error",
      {
        alert: { type: "error", message: gapDetails },
        diagnostic: diagnostics,
        flow: [
          { icon: "❓", text: "Question: Why no source match?", type: "info" },
          { icon: "🔍", text: "Analyzing base marker...", type: "info" },
          { icon: "💡", text: `Reason: ${reason}`, type: "error" },
        ],
      }
    ),

  sourceInventory: (sourceMarkerSummary) =>
    step(
      "📊 STEP 7: Source Inventory Comparison",
      "Complete list of ALL source markers (for comparison):",
      "info",
      {
        data: sourceMarkerSummary,
        flow: [
          { icon: "📋", text: "Listing all source markers", type: "info" },
          { icon: "🔍", text: "Compare with orphan marker", type: "info" },
          { icon: "💡", text: "Identify mismatch", type: "info" },
        ],
      }
    ),

  finalOrphanJson: (jsonPair) =>
    step(
      "📦 STEP 8: Orphan Pair State",
      "Creating orphan pair (source = null, target exists):",
      "warning",
      { json: jsonPair }
    ),

  severityAssessment: (severity) =>
    step(
      "⚠️ STEP 9: Severity Assessment",
      `Determining severity level: <strong>${severity.toUpperCase()}</strong>`,
      severity,
      {
        flow: [
          {
            icon: "❓",
            text: "Question: Does base marker exist in source?",
            type: "info",
          },
          {
            icon: severity === "critical" ? "❌" : "⚠️",
            text:
              severity === "critical"
                ? "NO - Base marker completely invented by AI"
                : "YES - But index out of range",
            type: severity === "critical" ? "error" : "warning",
          },
          {
            icon: severity === "critical" ? "🔴" : "⚠️",
            text: `Severity = ${severity.toUpperCase()}`,
            type: severity === "critical" ? "error" : "warning",
          },
        ],
        diagnostic:
          severity === "critical"
            ? [
                "CRITICAL: AI hallucinated entire base marker category",
                "Base marker doesn't exist in source at all",
                "AI completely failed to follow source structure",
              ]
            : [
                "WARNING: Base marker exists, but index is wrong",
                "AI generated too many segments for this base marker",
                "Likely duplication or counting error",
              ],
      }
    ),

  addOrphanToMapper: (marker, severity, reason, diagnostics) =>
    step(
      "🎯 STEP 10: CLASSIFICATION → ORPHAN",
      "Final classification based on all checks:",
      "error",
      {
        flow: [
          { icon: "❌", text: "CHECK 1: Source exists? NO", type: "error" },
          { icon: "✔️", text: "CHECK 2: Target exists? YES", type: "success" },
          { icon: "🔍", text: `CHECK 3: Why no source? ${reason}`, type: "error" },
          {
            icon: severity === "critical" ? "🔴" : "⚠️",
            text: `RESULT: Status = ORPHAN (${severity.toUpperCase()})`,
            type: "error",
          },
        ],
        alert: {
          type: "error",
          message: `🚨 FINAL CLASSIFICATION: ORPHAN\n\nReasoning Chain:\n1. AI generated marker "${marker}"\n2. Searched sourceMap for "${marker}"\n3. Result: NOT FOUND (null)\n4. Root cause: ${reason}\n\nSeverity: ${severity.toUpperCase()}\n\nDiagnostics:\n${diagnostics.map((d, i) => `${i + 1}. ${d}`).join("\n")}`,
        },
      }
    ),
};

export const RaceConditionStepTemplates = {
  conflictDetected: (marker, details, timestamp) =>
    step(
      "🔴 STEP 1: Race Condition Detected",
      `System prevented an invalid state update for <span class="marker-tag orphan">${marker}</span>.`,
      "critical",
      {
        data: {
          Marker: marker,
          Timestamp: timestamp,
          Issue: "Invalid state transition attempted",
        },
        flow: [
          { icon: "📥", text: "Update request received", type: "info" },
          { icon: "🔒", text: "State validation check", type: "warning" },
          { icon: "❌", text: "Update REJECTED", type: "error" },
        ],
        alert: {
          type: "error",
          message: `💥 RACE CONDITION PREVENTED\n\nDetails: ${details}\n\nSystem blocked this update to prevent data corruption.`,
        },
      }
    ),

  stateAnalysis: (marker, currentState, attemptedState, currentSeq, rejectedSeq) =>
    step(
      "🔬 STEP 2: WHY WAS IT REJECTED?",
      "State machine prevented an illegal transition.",
      "critical",
      {
        data: {
          "Current State": currentState,
          "Attempted State": attemptedState,
          "Current Sequence": currentSeq !== undefined ? currentSeq : "N/A",
          "Rejected Sequence": rejectedSeq !== undefined ? rejectedSeq : "N/A",
          "Is Valid Transition?": "❌ NO",
        },
        flow: [
          {
            icon: "📋",
            text: `Current state: ${currentState.toUpperCase()}`,
            type: "info",
          },
          {
            icon: "➡️",
            text: `Attempted transition: ${attemptedState.toUpperCase()}`,
            type: "warning",
          },
          { icon: "❓", text: "Checking if transition is valid...", type: "info" },
          {
            icon: "❌",
            text: "INVALID: Terminal states cannot regress",
            type: "error",
          },
          ...(currentSeq !== undefined
            ? [
                {
                  icon: "🔢",
                  text: `Sequence check: ${rejectedSeq} < ${currentSeq} (OUT OF ORDER)`,
                  type: "error",
                },
              ]
            : []),
        ],
        diagnostic: [
          "Terminal states (MATCHED, ORPHAN) cannot be changed",
          currentSeq !== undefined
            ? `Update sequence ${rejectedSeq} is older than current ${currentSeq}`
            : "Partial/gap updates cannot overwrite final states",
          "This indicates out-of-order stream delivery",
          "System correctly prevented state corruption",
        ],
        alert: {
          type: "warning",
          message: `🔬 DEDUCTION PROCESS:\n\n1. Current State: ${currentState.toUpperCase()}\n2. Attempted State: ${attemptedState.toUpperCase()}\n3. Validation: Is this transition allowed?\n4. Rule: Terminal states (matched/orphan) cannot change\n5. Decision: REJECT update\n6. Reason: Prevents data corruption from late-arriving updates`,
        },
      }
    ),

  recommendation: () =>
    step(
      "💡 STEP 3: What This Means",
      "Understanding race conditions in streaming:",
      "info",
      {
        alert: {
          type: "info",
          message: `✅ SYSTEM BEHAVIOR: CORRECT\n\nWhat happened:\n• Multiple updates targeted the same segment\n• Updates arrived out of order due to network timing\n• System detected sequence conflict\n• Invalid update was rejected\n• Final state remains correct and consistent\n\nWhy this occurs:\n• Network latency varies per packet\n• Final update may arrive before partial updates\n• Async processing creates race conditions\n\nWhat the system did:\n• Tracked update sequence numbers\n• Validated state transitions\n• Prevented regression to older states\n• Logged event for debugging\n\nAction needed: NONE\nThe system handled this automatically and correctly.`,
        },
      }
    ),
};