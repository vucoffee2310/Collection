/**
 * Mapper Module - Optimized
 */

import { throttle } from "../../shared/js/utils.js";

export class Mapper {
  constructor(displayElement, logger, sendToDebugWindowCallback) {
    this.source = [];
    this.target = [];
    this.targetPartial = null;
    this.displayElement = displayElement;
    this.logger = logger;
    this.sendToDebugWindow = sendToDebugWindowCallback || (() => {});

    this.renderedPairs = new Map();
    this.renderedGroups = new Map();
    this.renderedBatches = new Map();

    this.markerStates = new Map();
    this.updateSequence = 0;
    this.markerSequences = new Map();

    this.throttledUpdatePartial = throttle(this.updatePartialDisplay.bind(this), 200);
    this.pendingPartialMarker = null;
    this.onDebugClick = null;
    this.processingSegments = false;

    this.config = {
      batchSize: 3,
      firstGroupBatches: 1,
      regularGroupBatches: 10,
    };
  }

  setSource(segments) {
    this.source = segments;
    this.clearDisplay();
    this.initialRender();
  }

  reset() {
    if (this.processingSegments) {
      console.error('[Mapper] Cannot reset while processing');
      return false;
    }

    this.throttledUpdatePartial.cancel();
    this.target = [];
    this.targetPartial = null;
    this.markerStates.clear();
    this.markerSequences.clear();
    this.updateSequence = 0;
    this.pendingPartialMarker = null;

    this.clearDisplay();
    this.initialRender();
    return true;
  }

  addTargetBatch(segments) {
    if (!segments?.length) return;

    this.processingSegments = true;
    const batchSequence = ++this.updateSequence;

    this.target.push(...segments);
    this.updateMatchedSegments(segments, batchSequence);

    this.processingSegments = false;
  }

  setTargetPartial(partial) {
    if (!partial) {
      this.targetPartial = null;
      this.pendingPartialMarker = null;
      this.throttledUpdatePartial.cancel();
      return;
    }

    const currentState = this.markerStates.get(partial.marker);

    if (currentState === "matched" || currentState === "orphan") {
      if (this.pendingPartialMarker === partial.marker) {
        this.throttledUpdatePartial.cancel();
        this.pendingPartialMarker = null;
      }
      return;
    }

    if (this.targetPartial?.marker !== partial.marker || this.targetPartial?.text !== partial.text) {
      this.targetPartial = partial;
      this.pendingPartialMarker = partial.marker;
      this.throttledUpdatePartial();
    }
  }

  finalize() {
    if (this.throttledUpdatePartial?.flush) {
      this.throttledUpdatePartial.flush();
    }
    this.targetPartial = null;
    this.pendingPartialMarker = null;
  }

  setDebugClickHandler(callback) {
    this.onDebugClick = callback;
  }

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

    if (currentState === "matched" || currentState === "orphan") {
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
      this.applyPairUpdate(pairElement, {
        type: "partial",
        source: source,
        target: this.targetPartial,
      }, marker, updateSequence);
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

      if (sourceMatch && pairElement) {
        if (this.pendingPartialMarker === marker) {
          this.throttledUpdatePartial.cancel();
          this.pendingPartialMarker = null;
          if (this.targetPartial?.marker === marker) {
            this.targetPartial = null;
          }
        }

        this.applyPairUpdate(pairElement, {
          type: "matched",
          source: sourceMatch,
          target: segment,
        }, marker, batchSequence);

      } else if (sourceMatch && !pairElement) {
        console.error(`[Mapper] Missing DOM for ${marker} - recreating`);
        
        const newPair = this.createPairElement({
          type: "matched",
          source: sourceMatch,
          target: segment,
        });

        const batchNum = Math.floor(this.source.findIndex(s => s.marker === marker) / this.config.batchSize) + 1;
        let batchElement = this.renderedBatches.get(`BATCH-${batchNum}`);

        if (batchElement) {
          const batchContent = batchElement.querySelector('.batch-content');
          if (batchContent) {
            batchContent.appendChild(newPair);
            this.renderedPairs.set(marker, newPair);
            this.markerStates.set(marker, 'matched');
            this.markerSequences.set(marker, batchSequence);
          }
        } else {
          orphans.push(segment);
        }
      } else if (!sourceMatch) {
        orphans.push(segment);
      }
    });

    if (orphans.length > 0) {
      this.addOrphanSegments(orphans, batchSequence);
    }
  }

  applyPairUpdate(pairElement, item, marker, sequence) {
    const currentState = this.markerStates.get(marker);
    const lastSequence = this.markerSequences.get(marker) || 0;

    if (sequence < lastSequence) {
      this.sendToDebugWindow("RACE_CONDITION_DETECTED", {
        marker: marker,
        currentSequence: lastSequence,
        rejectedSequence: sequence,
        details: "Out-of-order update prevented",
      });
      return;
    }

    if ((currentState === "matched" || currentState === "orphan") &&
        (item.type === "partial" || item.type === "gap")) {
      this.sendToDebugWindow("RACE_CONDITION_DETECTED", {
        marker: marker,
        currentState: currentState,
        attemptedState: item.type,
        details: "Terminal state regression prevented",
      });
      return;
    }

    this.updatePairElement(pairElement, item);
    this.markerStates.set(marker, item.type);
    this.markerSequences.set(marker, sequence);

    const batchElement = pairElement.closest(".batch");
    if (batchElement) {
      this.updateBatchAnnotationColor(batchElement);
    }
  }

  updatePairElement(pairElement, item) {
    pairElement.className = `pair ${item.type}`;

    const debugBtn = pairElement.querySelector(".pair-debug-btn");
    if (debugBtn) {
      debugBtn.dataset.status = item.type;
    }

    const targetValue = pairElement.querySelectorAll(".json-value")[1] || 
                        pairElement.querySelector(".json-value");

    if (targetValue) {
      this.updateTargetValue(targetValue, item);
    }
  }

  updateTargetValue(targetValue, item) {
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
        targetValue.textContent = item.target?.text || "(no target)";
        if (!item.target?.text) targetValue.classList.add("empty");
        break;
      default:
        targetValue.textContent = "(no target)";
        targetValue.classList.add("empty");
    }
  }

  addOrphanSegments(segments, sequence) {
    if (!segments?.length) return;

    let orphanGroup = this.renderedGroups.get("ORPHAN");
    if (!orphanGroup) {
      orphanGroup = this.createGroupElement("ORPHAN");
      this.renderedGroups.set("ORPHAN", orphanGroup);
      this.displayElement.appendChild(orphanGroup);
    }

    let orphanBatch = this.renderedBatches.get("ORPHAN-BATCH");
    if (!orphanBatch) {
      orphanBatch = this.createBatchElement("ORPHAN", "ORPHAN");
      this.renderedBatches.set("ORPHAN-BATCH", orphanBatch);
      orphanGroup.querySelector(".group-content").appendChild(orphanBatch);
    }

    const fragment = document.createDocumentFragment();
    const batchContent = orphanBatch.querySelector(".batch-content");

    segments.forEach((segment) => {
      const marker = segment.marker;

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
      this.markerStates.set(marker, "orphan");
      this.markerSequences.set(marker, sequence);

      fragment.appendChild(pairElement);
    });

    batchContent.appendChild(fragment);
  }

  initialRender() {
    if (!this.displayElement) return;

    if (!this.source.length) {
      this.displayElement.innerHTML = '<div class="empty">No source segments available.</div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    const targetMap = new Map(this.target.map((t) => [t.marker, t]));
    const allBatches = this.buildBatches(targetMap);

    this.source.forEach((seg) => {
      if (!this.markerStates.has(seg.marker)) {
        this.markerStates.set(seg.marker, "gap");
      }
    });

    this.renderGroups(fragment, allBatches);
    this.renderOrphans(fragment);

    this.displayElement.innerHTML = "";
    this.displayElement.appendChild(fragment);
  }

  renderGroups(fragment, allBatches) {
    let groupNum = 1;
    let batchIndex = 0;

    while (batchIndex < allBatches.length) {
      const batchesPerGroup = groupNum === 1 ? 
        this.config.firstGroupBatches : 
        this.config.regularGroupBatches;

      const batchesInGroup = allBatches.slice(batchIndex, batchIndex + batchesPerGroup);

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
        item = { type: "partial", source: sourceSeg, target: this.targetPartial };
      } else {
        item = { type: "gap", source: sourceSeg, target: null };
      }

      currentBatch.push(item);

      if (currentBatch.length === this.config.batchSize || i === this.source.length - 1) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    });

    return batches;
  }

  createGroupElement(groupNum) {
    const div = document.createElement("div");
    div.className = "batch-group";
    div.dataset.groupNum = groupNum;

    const content = document.createElement("div");
    content.className = "group-content";
    div.appendChild(content);

    return div;
  }

  createBatchElement(batchNum, groupNum) {
    const div = document.createElement("div");
    div.className = "batch";
    div.dataset.batchNum = batchNum;

    const annotation = document.createElement("div");
    annotation.className = "timeline-annotation";

    if (batchNum === "ORPHAN") {
      annotation.textContent = "Orphan Segments";
      annotation.classList.add("orphan-section");
    } else {
      annotation.textContent = `Group ${groupNum} - Batch ${batchNum}`;
    }

    const content = document.createElement("div");
    content.className = "batch-content";

    div.appendChild(annotation);
    div.appendChild(content);

    return div;
  }

  updateBatchAnnotationColor(batchElement) {
    const annotation = batchElement.querySelector(".timeline-annotation");
    if (!annotation || annotation.classList.contains("orphan-section")) return;

    const pairs = batchElement.querySelectorAll(".pair");
    if (pairs.length === 0) return;

    let matched = 0, partial = 0, gap = 0;

    pairs.forEach((pair) => {
      if (pair.classList.contains("matched")) matched++;
      else if (pair.classList.contains("partial")) partial++;
      else if (pair.classList.contains("gap")) gap++;
    });

    annotation.classList.remove("matched-section", "streaming-section", "waiting-section");

    if (matched === pairs.length) {
      annotation.classList.add("matched-section");
    } else if (partial > 0) {
      annotation.classList.add("streaming-section");
    } else if (gap > 0) {
      annotation.classList.add("waiting-section");
    }
  }

  createPairElement(item) {
    const div = document.createElement("div");
    div.className = `pair ${item.type}`;
    div.dataset.marker = item.source?.marker || item.target?.marker;

    const header = this.createPairHeader(div.dataset.marker, item.type);
    const content = this.createPairContent(item);

    div.appendChild(header);
    div.appendChild(content);

    return div;
  }

  createPairHeader(marker, type) {
    const header = document.createElement("div");
    header.className = "pair-header";

    const markerSpan = document.createElement("span");
    markerSpan.className = "pair-marker";
    markerSpan.textContent = marker;

    const debugBtn = document.createElement("button");
    debugBtn.className = "pair-debug-btn";
    debugBtn.textContent = "🔍";
    debugBtn.dataset.marker = marker;
    debugBtn.dataset.status = type;
    debugBtn.title = `${type.toUpperCase()} - Click to view detailed debug analysis`;

    debugBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.onDebugClick) {
        this.onDebugClick(marker, type);
      }
    };

    header.appendChild(markerSpan);
    header.appendChild(debugBtn);

    return header;
  }

  createPairContent(item) {
    const content = document.createElement("div");
    content.className = "pair-content";
    
    const grid = document.createElement("div");
    grid.className = "json-grid";

    if (item.source || item.type !== "orphan") {
      const srcLabel = document.createElement("div");
      srcLabel.className = "json-label";
      srcLabel.textContent = "Source";
      grid.appendChild(srcLabel);

      const srcValue = document.createElement("div");
      srcValue.className = "json-value";
      srcValue.textContent = item.source?.text || "(no source)";
      if (!item.source?.text) srcValue.classList.add("empty");
      grid.appendChild(srcValue);
    }

    const tgtLabel = document.createElement("div");
    tgtLabel.className = "json-label";
    tgtLabel.textContent = "Target";
    grid.appendChild(tgtLabel);

    grid.appendChild(this.createTargetValue(item));

    content.appendChild(grid);
    return content;
  }

  createTargetValue(item) {
    const value = document.createElement("div");
    value.className = "json-value";

    switch (item.type) {
      case "gap":
        value.textContent = "(waiting...)";
        value.classList.add("empty");
        break;
      case "partial":
        value.textContent = item.target?.text || "...";
        value.classList.add("streaming");
        break;
      default:
        value.textContent = item.target?.text || "(no target)";
        if (!item.target?.text) value.classList.add("empty");
    }

    return value;
  }
}