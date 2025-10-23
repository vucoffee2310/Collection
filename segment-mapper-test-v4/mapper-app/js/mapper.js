import { throttle } from "../../shared/js/utils.js";

export class Mapper {
  constructor(displayElement, logger, sendToDebugWindowCallback) {
    this.source = [];
    this.target = [];
    this.targetPartial = null;
    this.displayElement = displayElement;
    this.logger = logger;
    this.sendToDebugWindow = sendToDebugWindowCallback || (() => {});

    // Cached DOM elements for performance
    this.renderedPairs = new Map();
    this.renderedGroups = new Map();
    this.renderedBatches = new Map();

    // State tracking for race condition prevention
    this.markerStates = new Map(); // tracks: 'gap', 'partial', 'matched', 'orphan'
    this.updateSequence = 0; // global sequence counter
    this.markerSequences = new Map(); // tracks last sequence per marker

    // Throttled update with proper cancellation
    this.throttledUpdatePartial = throttle(
      this.updatePartialDisplay.bind(this),
      200
    );
    this.pendingPartialMarker = null; // track what's pending in throttle

    // Debug click handler
    this.onDebugClick = null;

    // Configuration
    this.config = {
      batchSize: 3,
      firstGroupBatches: 1,
      regularGroupBatches: 10,
    };
  }

  /* === PUBLIC API === */

  setSource(segments) {
    this.source = segments;
    this.clearDisplay();
    this.initialRender();
  }

  reset() {
    this.target = [];
    this.targetPartial = null;
    this.markerStates.clear();
    this.markerSequences.clear();
    this.updateSequence = 0;
    this.pendingPartialMarker = null;
    this.throttledUpdatePartial.cancel();
    this.clearDisplay();
    this.initialRender();
  }

  addTargetBatch(segments) {
    if (!segments?.length) return;

    // Increment sequence for this batch update
    const batchSequence = ++this.updateSequence;

    this.target.push(...segments);
    this.updateMatchedSegments(segments, batchSequence);
  }

  setTargetPartial(partial) {
    if (!partial) {
      this.targetPartial = null;
      this.pendingPartialMarker = null;
      this.throttledUpdatePartial.cancel();
      return;
    }

    const currentState = this.markerStates.get(partial.marker);

    // RACE CONDITION CHECK #1: Don't update if already matched or orphaned
    if (currentState === "matched" || currentState === "orphan") {
      if (this.logger) {
        this.logger.warn(
          `[RACE_CONDITION] Partial update ignored for ${partial.marker} (state: ${currentState})`
        );
      }
      this.sendToDebugWindow("RACE_CONDITION_DETECTED", {
        marker: partial.marker,
        currentState: currentState,
        attemptedState: "partial",
        details: "Partial update after terminal state.",
      });

      // Cancel any pending throttled update for this marker
      if (this.pendingPartialMarker === partial.marker) {
        this.throttledUpdatePartial.cancel();
        this.pendingPartialMarker = null;
      }
      return;
    }

    // Only update if content changed
    if (
      this.targetPartial?.marker !== partial.marker ||
      this.targetPartial?.text !== partial.text
    ) {
      this.targetPartial = partial;
      this.pendingPartialMarker = partial.marker;
      this.throttledUpdatePartial();
    }
  }

  finalize() {
    // Flush any pending throttled updates
    if (this.throttledUpdatePartial?.flush) {
      this.throttledUpdatePartial.flush();
    }
    this.targetPartial = null;
    this.pendingPartialMarker = null;
  }

  setDebugClickHandler(callback) {
    this.onDebugClick = callback;
  }

  /* === DISPLAY MANAGEMENT === */

  clearDisplay() {
    this.renderedPairs.clear();
    this.renderedGroups.clear();
    this.renderedBatches.clear();

    if (this.displayElement) {
      this.displayElement.innerHTML = "";
    }
  }

  updatePartialDisplay() {
    if (!this.targetPartial) {
      this.pendingPartialMarker = null;
      return;
    }

    const marker = this.targetPartial.marker;
    const currentState = this.markerStates.get(marker);

    // RACE CONDITION CHECK #2: Re-check state before applying throttled update
    if (currentState === "matched" || currentState === "orphan") {
      if (this.logger) {
        this.logger.warn(
          `[RACE_CONDITION] Throttled partial update cancelled for ${marker} (state: ${currentState})`
        );
      }
      this.targetPartial = null;
      this.pendingPartialMarker = null;
      return;
    }

    const pairElement = this.renderedPairs.get(marker);
    if (!pairElement) {
      this.pendingPartialMarker = null;
      return;
    }

    const source = this.source.find((s) => s.marker === marker);
    if (source) {
      const updateSequence = ++this.updateSequence;
      this.applyPairUpdate(
        pairElement,
        {
          type: "partial",
          source: source,
          target: this.targetPartial,
        },
        marker,
        updateSequence
      );
    }

    this.pendingPartialMarker = null;
  }

  updateMatchedSegments(newSegments, batchSequence) {
    const sourceMap = new Map(this.source.map((s) => [s.marker, s]));
    const orphans = [];

    newSegments.forEach((segment) => {
      const marker = segment.marker;
      const sourceMatch = sourceMap.get(marker);
      const pairElement = this.renderedPairs.get(marker);

      // Create sequence for this specific update
      const updateSequence = batchSequence || ++this.updateSequence;

      if (sourceMatch && pairElement) {
        // Cancel any pending partial update for this marker
        if (this.pendingPartialMarker === marker) {
          this.throttledUpdatePartial.cancel();
          this.pendingPartialMarker = null;
          if (this.targetPartial?.marker === marker) {
            this.targetPartial = null;
          }
        }

        // Update existing pair with matched state
        this.applyPairUpdate(
          pairElement,
          {
            type: "matched",
            source: sourceMatch,
            target: segment,
          },
          marker,
          updateSequence
        );
      } else if (!sourceMatch) {
        // Collect orphans for batch processing
        orphans.push(segment);
      }
    });

    // Process all orphans at once
    if (orphans.length > 0) {
      const orphanSequence = ++this.updateSequence;
      this.addOrphanSegments(orphans, orphanSequence);
    }
  }

  applyPairUpdate(pairElement, item, marker, sequence) {
    const currentState = this.markerStates.get(marker);
    const lastSequence = this.markerSequences.get(marker) || 0;

    // RACE CONDITION CHECK #3: Prevent older updates from overwriting newer ones
    if (sequence < lastSequence) {
      if (this.logger) {
        this.logger.warn(
          `[RACE_CONDITION] Out-of-order update rejected for ${marker} (seq ${sequence} < ${lastSequence})`
        );
      }
      this.sendToDebugWindow("RACE_CONDITION_DETECTED", {
        marker: marker,
        currentSequence: lastSequence,
        rejectedSequence: sequence,
        details: "Out-of-order update prevented",
      });
      return;
    }

    // RACE CONDITION CHECK #4: Prevent state regression (matched/orphan are terminal)
    if (
      (currentState === "matched" || currentState === "orphan") &&
      (item.type === "partial" || item.type === "gap")
    ) {
      if (this.logger) {
        this.logger.warn(
          `[RACE_CONDITION] State regression prevented for ${marker} (${currentState} -> ${item.type})`
        );
      }
      this.sendToDebugWindow("RACE_CONDITION_DETECTED", {
        marker: marker,
        currentState: currentState,
        attemptedState: item.type,
        details: "Terminal state regression prevented",
      });
      return;
    }

    // Apply the update
    this.updatePairElement(pairElement, item);

    // Update state tracking
    this.markerStates.set(marker, item.type);
    this.markerSequences.set(marker, sequence);

    // Update batch annotation color based on new state
    const batchElement = pairElement.closest(".batch");
    if (batchElement) {
      this.updateBatchAnnotationColor(batchElement);
    }
  }

  updatePairElement(pairElement, item) {
    // Update class
    pairElement.className = `pair ${item.type}`;

    // Update debug button status (no need to update text, just dataset)
    const debugBtn = pairElement.querySelector(".pair-debug-btn");
    if (debugBtn) {
      debugBtn.dataset.status = item.type;
      debugBtn.title = `${item.type.toUpperCase()} - Click to view detailed debug analysis`;
    }

    // Update target value
    const targetValue =
      pairElement.querySelectorAll(".json-value")[1] ||
      pairElement.querySelector(".json-value");

    if (targetValue) {
      this.updateTargetValue(targetValue, item);
    }
  }

  updateTargetValue(targetValue, item) {
    // Reset classes
    targetValue.className = "json-value";

    switch (item.type) {
      case "gap":
        targetValue.textContent = "(waiting...)";
        targetValue.classList.add("empty");
        break;
      case "partial":
        targetValue.textContent = item.target?.text || "...";
        targetValue.classList.add("streaming");
        break;
      case "matched":
      case "orphan":
        if (item.target?.text) {
          targetValue.textContent = item.target.text;
        } else {
          targetValue.textContent = "(no target)";
          targetValue.classList.add("empty");
        }
        break;
      default:
        targetValue.textContent = "(no target)";
        targetValue.classList.add("empty");
    }
  }

  addOrphanSegments(segments, sequence) {
    if (!segments?.length) return;

    // Get or create orphan group
    let orphanGroup = this.renderedGroups.get("ORPHAN");
    if (!orphanGroup) {
      orphanGroup = this.createGroupElement("ORPHAN");
      this.renderedGroups.set("ORPHAN", orphanGroup);
      this.displayElement.appendChild(orphanGroup);
    }

    // Get or create orphan batch
    let orphanBatch = this.renderedBatches.get("ORPHAN-BATCH");
    if (!orphanBatch) {
      orphanBatch = this.createBatchElement("ORPHAN", "ORPHAN");
      this.renderedBatches.set("ORPHAN-BATCH", orphanBatch);
      orphanGroup.querySelector(".group-content").appendChild(orphanBatch);
    }

    // Batch create all orphan pairs
    const fragment = document.createDocumentFragment();
    const batchContent = orphanBatch.querySelector(".batch-content");

    segments.forEach((segment) => {
      const marker = segment.marker;

      // Cancel any pending partial for this marker
      if (this.pendingPartialMarker === marker) {
        this.throttledUpdatePartial.cancel();
        this.pendingPartialMarker = null;
      }

      const pairElement = this.createPairElement({
        type: "orphan",
        source: null,
        target: segment,
      });

      pairElement.dataset.groupNum = "ORPHAN";
      pairElement.dataset.batchNum = "ORPHAN";

      this.renderedPairs.set(marker, pairElement);

      // Track state
      this.markerStates.set(marker, "orphan");
      this.markerSequences.set(marker, sequence);

      fragment.appendChild(pairElement);
    });

    batchContent.appendChild(fragment);
  }

  /* === RENDERING === */

  initialRender() {
    if (!this.displayElement) return;

    if (!this.source.length) {
      this.displayElement.innerHTML =
        '<div class="empty">No source segments available.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    const targetMap = new Map(this.target.map((t) => [t.marker, t]));
    const allBatches = this.buildBatches(targetMap);

    // Initialize marker states
    this.source.forEach((seg) => {
      if (!this.markerStates.has(seg.marker)) {
        this.markerStates.set(seg.marker, "gap");
      }
    });

    this.renderGroups(fragment, allBatches);
    this.renderOrphans(fragment);

    // Single DOM update
    this.displayElement.innerHTML = "";
    this.displayElement.appendChild(fragment);
  }

  renderGroups(fragment, allBatches) {
    let groupNum = 1;
    let batchIndex = 0;

    while (batchIndex < allBatches.length) {
      const batchesPerGroup =
        groupNum === 1
          ? this.config.firstGroupBatches
          : this.config.regularGroupBatches;

      const batchesInGroup = allBatches.slice(
        batchIndex,
        batchIndex + batchesPerGroup
      );

      if (batchesInGroup.length > 0) {
        const groupElement = this.createGroupElement(groupNum);
        const groupContent = groupElement.querySelector(".group-content");
        const groupFragment = document.createDocumentFragment();

        batchesInGroup.forEach((batchItems, index) => {
          const batchNum = batchIndex + index + 1;
          const batchElement = this.renderBatch(batchItems, batchNum, groupNum);
          groupFragment.appendChild(batchElement);
          this.renderedBatches.set(`BATCH-${batchNum}`, batchElement);
        });

        groupContent.appendChild(groupFragment);
        this.renderedGroups.set(`GROUP-${groupNum}`, groupElement);
        fragment.appendChild(groupElement);

        batchIndex += batchesInGroup.length;
        groupNum++;
      }
    }
  }

  renderBatch(batchItems, batchNum, groupNum) {
    const batchElement = this.createBatchElement(batchNum, groupNum);
    const batchContent = batchElement.querySelector(".batch-content");
    const fragment = document.createDocumentFragment();

    batchItems.forEach((item) => {
      const pairElement = this.createPairElement(item);
      const marker = item.source?.marker || item.target?.marker;

      pairElement.dataset.groupNum = groupNum;
      pairElement.dataset.batchNum = batchNum;

      this.renderedPairs.set(marker, pairElement);
      fragment.appendChild(pairElement);
    });

    batchContent.appendChild(fragment);

    // Update annotation color based on batch content
    this.updateBatchAnnotationColor(batchElement);

    return batchElement;
  }

  renderOrphans(fragment) {
    const sourceMap = new Map(this.source.map((s) => [s.marker, s]));
    const orphans = this.target.filter((t) => !sourceMap.has(t.marker));

    if (!orphans.length) return;

    const orphanGroup = this.createGroupElement("ORPHAN");
    const groupContent = orphanGroup.querySelector(".group-content");
    const orphanBatch = this.createBatchElement("ORPHAN", "ORPHAN");
    const batchContent = orphanBatch.querySelector(".batch-content");
    const batchFragment = document.createDocumentFragment();

    orphans.forEach((target) => {
      const marker = target.marker;
      const pairElement = this.createPairElement({
        type: "orphan",
        source: null,
        target: target,
      });

      pairElement.dataset.groupNum = "ORPHAN";
      pairElement.dataset.batchNum = "ORPHAN";

      this.renderedPairs.set(marker, pairElement);

      // Track state
      this.markerStates.set(marker, "orphan");

      batchFragment.appendChild(pairElement);
    });

    batchContent.appendChild(batchFragment);
    groupContent.appendChild(orphanBatch);
    orphanGroup.appendChild(groupContent);

    this.renderedBatches.set("ORPHAN-BATCH", orphanBatch);
    this.renderedGroups.set("ORPHAN", orphanGroup);
    fragment.appendChild(orphanGroup);
  }

  buildBatches(targetMap) {
    const batches = [];
    let currentBatch = [];

    this.source.forEach((sourceSeg, i) => {
      const matchedSeg = targetMap.get(sourceSeg.marker);
      let item;

      if (matchedSeg) {
        item = { type: "matched", source: sourceSeg, target: matchedSeg };
      } else if (this.targetPartial?.marker === sourceSeg.marker) {
        item = {
          type: "partial",
          source: sourceSeg,
          target: this.targetPartial,
        };
      } else {
        item = { type: "gap", source: sourceSeg, target: null };
      }

      currentBatch.push(item);

      if (
        currentBatch.length === this.config.batchSize ||
        i === this.source.length - 1
      ) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    });

    return batches;
  }

  /* === DOM CREATION === */

  createGroupElement(groupNum) {
    const div = this.createElement("div", "batch-group");
    div.dataset.groupNum = groupNum;

    const content = this.createElement("div", "group-content");
    div.appendChild(content);

    return div;
  }

  createBatchElement(batchNum, groupNum) {
    const div = this.createElement("div", "batch");
    div.dataset.batchNum = batchNum;

    // Create timeline annotation
    const annotation = this.createElement("div", "timeline-annotation");

    if (batchNum === "ORPHAN") {
      annotation.textContent = "Orphan Segments";
      annotation.classList.add("orphan-section");
    } else {
      annotation.textContent = `Group ${groupNum} - Batch ${batchNum}`;
      // Color will be determined by batch content (set later)
    }

    const content = this.createElement("div", "batch-content");

    div.appendChild(annotation);
    div.appendChild(content);

    return div;
  }

  updateBatchAnnotationColor(batchElement) {
    const annotation = batchElement.querySelector(".timeline-annotation");
    if (!annotation || annotation.classList.contains("orphan-section")) {
      return; // Skip orphan batches (already red)
    }

    // Get all pairs in this batch
    const pairs = batchElement.querySelectorAll(".pair");
    if (pairs.length === 0) return;

    // Count states
    let matched = 0;
    let partial = 0;
    let gap = 0;

    pairs.forEach((pair) => {
      if (pair.classList.contains("matched")) matched++;
      else if (pair.classList.contains("partial")) partial++;
      else if (pair.classList.contains("gap")) gap++;
    });

    // Remove existing state classes
    annotation.classList.remove(
      "matched-section",
      "streaming-section",
      "waiting-section"
    );

    // Apply color based on predominant state
    if (matched === pairs.length) {
      // All matched - green
      annotation.classList.add("matched-section");
    } else if (partial > 0) {
      // Has streaming - blue
      annotation.classList.add("streaming-section");
    } else if (gap > 0) {
      // Has waiting - yellow
      annotation.classList.add("waiting-section");
    }
    // Default remains blue
  }

  createPairElement(item) {
    const div = this.createElement("div", `pair ${item.type}`);
    div.dataset.marker = item.source?.marker || item.target?.marker;

    // Create header
    const header = this.createPairHeader(div.dataset.marker, item.type);

    // Create content
    const content = this.createPairContent(item);

    div.appendChild(header);
    div.appendChild(content);

    return div;
  }

  createPairHeader(marker, type) {
    const header = this.createElement("div", "pair-header");

    const markerSpan = this.createElement("span", "pair-marker");
    markerSpan.textContent = marker;

    // Create debug button with status-colored background (replaces status badge)
    const debugBtn = this.createElement("button", "pair-debug-btn");
    debugBtn.textContent = "🔍";
    debugBtn.dataset.marker = marker;
    debugBtn.dataset.status = type;
    debugBtn.title = `${type.toUpperCase()} - Click to view detailed debug analysis`;

    // Prevent button click from bubbling
    debugBtn.onclick = (e) => {
      e.stopPropagation();
      this.handleDebugClick(marker, type);
    };

    header.appendChild(markerSpan);
    header.appendChild(debugBtn);

    return header;
  }

  handleDebugClick(marker, status) {
    console.log(`[Mapper] Debug button clicked for ${marker} (${status})`);

    // Add visual feedback
    const pairElement = this.renderedPairs.get(marker);
    if (pairElement) {
      pairElement.classList.add("debugging");
      setTimeout(() => {
        pairElement.classList.remove("debugging");
      }, 500);
    }

    // Notify via callback
    if (this.onDebugClick) {
      this.onDebugClick(marker, status);
    }
  }

  createPairContent(item) {
    const content = this.createElement("div", "pair-content");
    const grid = this.createElement("div", "json-grid");

    // Add source if not orphan
    if (item.source || item.type !== "orphan") {
      grid.appendChild(this.createLabel("Source"));
      grid.appendChild(this.createValue(item.source?.text, !item.source?.text));
    }

    // Add target
    grid.appendChild(this.createLabel("Target"));
    grid.appendChild(this.createTargetValue(item));

    content.appendChild(grid);
    return content;
  }

  createTargetValue(item) {
    let text = "";
    let isEmpty = false;
    let isStreaming = false;

    switch (item.type) {
      case "gap":
        text = "(waiting...)";
        isEmpty = true;
        break;
      case "partial":
        text = item.target?.text || "...";
        isStreaming = true;
        break;
      default:
        text = item.target?.text;
        isEmpty = !text;
    }

    const value = this.createValue(text, isEmpty);
    if (isStreaming) {
      value.classList.add("streaming");
    }

    return value;
  }

  createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  createLabel(text) {
    const label = this.createElement("div", "json-label");
    label.textContent = text;
    return label;
  }

  createValue(text, isEmpty = false) {
    const value = this.createElement("div", "json-value");
    value.textContent = text || "(no target)";
    if (isEmpty) value.classList.add("empty");
    return value;
  }
}