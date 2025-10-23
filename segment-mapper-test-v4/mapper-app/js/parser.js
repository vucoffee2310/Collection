/**
 * Parser Module
 * Handles source parsing with sliding window pre-computed database
 * Depth range: 5 (max, most specific) to 3 (min, least specific)
 */

export class Parser {
  /**
   * Extract content for mapping from full prompt
   */
  static extractContentForMapping(fullPromptText) {
    const codeBlockMatch = fullPromptText.match(/```([\s\S]*?)```/);
    if (!codeBlockMatch || !codeBlockMatch[1]) return null;
    const codeBlockContent = codeBlockMatch[1];
    const parts = codeBlockContent.split("---");
    if (parts.length >= 3) return parts[2].trim();
    return null;
  }

  /**
   * Parse source text with unique markers (base-index format)
   */
  static parseWithUniqueMarkers(text) {
    const regex = /\(([a-z])\)\s*/gi;
    const segments = [];
    const markerCounts = {};
    const matches = [];

    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        marker: match[1].toLowerCase(),
        pos: match.index,
        endPos: regex.lastIndex,
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const baseMarker = current.marker;
      const textStart = current.endPos;
      const textEnd = next ? next.pos : text.length;
      const content = text.substring(textStart, textEnd).trim();

      if (!markerCounts[baseMarker]) markerCounts[baseMarker] = 0;
      const index = markerCounts[baseMarker]++;

      segments.push({ marker: `${baseMarker}-${index}`, text: content || "" });
    }

    console.log(`[Parser] Parsed ${segments.length} source segments`);
    return segments;
  }
}

export class StreamingParser {
  constructor(sourceSegments = []) {
    this.sourceSegments = sourceSegments;
    this.maxDepth = 5; // Most specific - prefer this
    this.minDepth = 3; // Least specific - last resort
    this.windowSize = 4; // Initial lookahead window size

    if (sourceSegments.length > 0) {
      this.buildSourceStructure();
    }

    this.reset();
  }

  /**
   * BUILD SOURCE STRUCTURE (full source, not loaded into database yet)
   */
  buildSourceStructure() {
    console.log("[StreamingParser] 🔨 Building source structure...");

    // Build complete source sequence
    this.sourceSequence = this.sourceSegments.map((seg, idx) => ({
      base: seg.marker.split("-")[0],
      fullMarker: seg.marker,
      position: idx,
      index: parseInt(seg.marker.split("-")[1]),
    }));

    // Group all source markers by base
    this.sourceByBase = {};
    this.sourceSequence.forEach((item) => {
      if (!this.sourceByBase[item.base]) {
        this.sourceByBase[item.base] = [];
      }
      this.sourceByBase[item.base].push(item);
    });

    // Sort each group by index
    Object.keys(this.sourceByBase).forEach((base) => {
      this.sourceByBase[base].sort((a, b) => a.index - b.index);
    });

    console.log(
      `[StreamingParser] ✅ Source structure built:`,
      Object.keys(this.sourceByBase)
        .map((base) => `(${base}):${this.sourceByBase[base].length}`)
        .join(", ")
    );
  }

  /**
   * ✅ FIXED: Set source segments and initialize windows
   */
  setSourceSegments(sourceSegments) {
    console.log(
      `[StreamingParser] 📥 Setting ${sourceSegments.length} source segments`
    );
    this.sourceSegments = sourceSegments;

    if (sourceSegments.length > 0) {
      // Build structure
      this.buildSourceStructure();

      // ✅ Initialize windows immediately after building structure
      this.precedingDatabase = {};
      this.windowPointers = {};

      Object.keys(this.sourceByBase).forEach((base) => {
        this.initializeWindow(base);
      });

      console.log(
        "[StreamingParser] 🪟 Windows initialized:",
        Object.keys(this.windowPointers)
          .map((base) => {
            const wp = this.windowPointers[base];
            return `(${base}):${wp.loadedCount}/${wp.totalCount}`;
          })
          .join(", ")
      );
    } else {
      console.warn("[StreamingParser] ⚠️ Empty source segments provided");
    }
  }

  /**
   * ✅ FIXED: Reset parser state without clearing windows
   */
  reset() {
    this.buffer = "";
    this.segments = [];
    this.responseSequence = [];
    this.pendingMarker = null;
    this.warnings = [];

    // Only initialize windows if they don't exist yet
    if (
      !this.precedingDatabase ||
      Object.keys(this.precedingDatabase).length === 0
    ) {
      this.precedingDatabase = {};
      this.windowPointers = {};

      if (this.sourceByBase && Object.keys(this.sourceByBase).length > 0) {
        Object.keys(this.sourceByBase).forEach((base) => {
          this.initializeWindow(base);
        });
        console.log("[StreamingParser] 🪟 Windows initialized in reset");
      }
    } else {
      // Just reset the 'used' flags
      Object.keys(this.precedingDatabase).forEach((base) => {
        for (let depth = this.maxDepth; depth >= this.minDepth; depth--) {
          this.precedingDatabase[base][depth].forEach((entry) => {
            entry.used = false;
          });
        }
      });
      console.log("[StreamingParser] ♻️ Reset: cleared 'used' flags");
    }
  }

  /**
   * INITIALIZE WINDOW for a base marker
   * Load first N markers (windowSize)
   */
  initializeWindow(baseMarker) {
    const allMarkers = this.sourceByBase[baseMarker];
    if (!allMarkers || allMarkers.length === 0) return;

    // Initialize window pointer
    this.windowPointers[baseMarker] = {
      nextIndexToLoad: 0, // Next index to load into window
      loadedCount: 0, // How many loaded so far
      totalCount: allMarkers.length,
    };

    // Initialize database for this base marker (depths 5, 4, 3)
    this.precedingDatabase[baseMarker] = {};
    for (let depth = this.maxDepth; depth >= this.minDepth; depth--) {
      this.precedingDatabase[baseMarker][depth] = [];
    }

    // Load initial window
    const initialLoadCount = Math.min(this.windowSize, allMarkers.length);
    for (let i = 0; i < initialLoadCount; i++) {
      this.loadMarkerIntoDatabase(baseMarker, i);
    }

    this.windowPointers[baseMarker].nextIndexToLoad = initialLoadCount;
    this.windowPointers[baseMarker].loadedCount = initialLoadCount;
  }

  /**
   * LOAD A SPECIFIC MARKER INTO DATABASE
   * Compute preceding at depths 5, 4, 3 and add to database
   */
  loadMarkerIntoDatabase(baseMarker, markerIndex) {
    const sourceMarker = this.sourceByBase[baseMarker][markerIndex];
    if (!sourceMarker) {
      console.error(
        `[StreamingParser] ❌ Cannot load ${baseMarker}[${markerIndex}] - not found`
      );
      return;
    }

    // Compute preceding for depths 5, 4, 3
    for (let depth = this.maxDepth; depth >= this.minDepth; depth--) {
      const preceding = this.computePreceding(sourceMarker.position, depth);

      this.precedingDatabase[baseMarker][depth].push({
        marker: sourceMarker.fullMarker,
        position: sourceMarker.position,
        index: sourceMarker.index,
        preceding: preceding,
        used: false,
      });
    }
  }

  /**
   * SLIDE WINDOW - Load next marker when current is matched
   */
  slideWindow(baseMarker, matchedIndex) {
    const wp = this.windowPointers[baseMarker];
    if (!wp) return;

    // Check if we can load more
    if (wp.nextIndexToLoad < wp.totalCount) {
      this.loadMarkerIntoDatabase(baseMarker, wp.nextIndexToLoad);
      wp.nextIndexToLoad++;
      wp.loadedCount++;
    }
  }

  /**
   * ✅ FIXED: Compute preceding sequence in correct order
   */
  computePreceding(position, depth) {
    const preceding = [];

    // Collect markers going backwards
    for (let i = position - 1; i >= 0 && preceding.length < depth; i--) {
      preceding.push(this.sourceSequence[i].base);
    }

    // Reverse to get chronological order [oldest ... newest]
    return preceding.reverse();
  }

  feed(chunk) {
    this.buffer += chunk;
    return this.extract();
  }

  extract() {
    const regex = /\(([a-z])\)\s*/gi;
    const newSegments = [];
    const matches = [];
    let match;

    while ((match = regex.exec(this.buffer)) !== null) {
      matches.push({
        marker: match[1].toLowerCase(),
        pos: match.index,
        endPos: regex.lastIndex,
      });
    }

    for (let i = 0; i < matches.length - 1; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const baseMarker = current.marker;
      const content = this.buffer.substring(current.endPos, next.pos).trim();

      // Find match in sliding window database
      const matchResult = this.findMatchInDatabase(baseMarker);

      if (!matchResult.found) {
        this.warnings.push({
          type: matchResult.reason,
          baseMarker: baseMarker,
          responsePosition: this.responseSequence.length,
          message: matchResult.message,
          responsePreceding: matchResult.responsePreceding || [],
        });

        console.warn(
          `[StreamingParser] ⚠️ SKIP pos ${this.responseSequence.length}: (${baseMarker}) - ${matchResult.message}`
        );

        this.responseSequence.push({
          base: baseMarker,
          fullMarker: null,
          matched: false,
        });

        continue;
      }

      // ✅ Found valid match
      const seg = {
        marker: matchResult.sourceMarker,
        text: content || "",
      };
      this.segments.push(seg);
      newSegments.push(seg);

      // Mark as used
      matchResult.databaseEntry.used = true;

      // ✅ SLIDE WINDOW - Load next marker
      this.slideWindow(baseMarker, matchResult.matchedIndex);

      this.responseSequence.push({
        base: baseMarker,
        fullMarker: matchResult.sourceMarker,
        matched: true,
        sourcePosition: matchResult.sourcePosition,
        matchDepth: matchResult.matchDepth,
      });

      console.log(
        `[StreamingParser] ✅ pos ${this.responseSequence.length - 1
        }: (${baseMarker}) → ${matchResult.sourceMarker} (depth ${matchResult.matchDepth
        })`
      );
    }

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      this.pendingMarker = lastMatch.marker;
      this.buffer = this.buffer.substring(lastMatch.pos);
    } else {
      this.buffer = "";
    }

    return newSegments;
  }

  /**
   * FIND MATCH IN DATABASE
   * Try depth 5 → 4 → 3 (max to min, prefer most specific)
   */
  findMatchInDatabase(baseMarker) {
    if (!this.precedingDatabase[baseMarker]) {
      console.error(
        `[StreamingParser] ❌ Unknown base (${baseMarker}). Available:`,
        Object.keys(this.precedingDatabase)
      );
      return {
        found: false,
        reason: "UNKNOWN_BASE_MARKER",
        message: `Base marker (${baseMarker}) doesn't exist in source`,
        responsePreceding: [],
      };
    }

    const responsePreceding = this.getResponsePreceding(this.maxDepth);

    // Try from depth 5 → 4 → 3 (max to min)
    for (let depth = this.maxDepth; depth >= this.minDepth; depth--) {
      const candidates = this.precedingDatabase[baseMarker][depth];

      for (const candidate of candidates) {
        if (candidate.used) continue;

        if (
          this.isInOrderSubsequence(responsePreceding, candidate.preceding)
        ) {
          return {
            found: true,
            sourceMarker: candidate.marker,
            sourcePosition: candidate.position,
            matchedIndex: candidate.index,
            matchDepth: depth,
            databaseEntry: candidate,
          };
        }
      }
    }

    return {
      found: false,
      reason: "FAKE_MARKER",
      message: `No (${baseMarker}) matches [${responsePreceding.join(", ")}]`,
      responsePreceding: responsePreceding,
    };
  }

  /**
   * Get response preceding sequence
   * Only includes successfully matched markers
   */
  getResponsePreceding(depth) {
    const preceding = [];
    for (
      let i = this.responseSequence.length - 1;
      i >= 0 && preceding.length < depth;
      i--
    ) {
      const item = this.responseSequence[i];
      if (item.matched !== false) {
        preceding.unshift(item.base);
      }
    }
    return preceding;
  }

  /**
   * Check if response sequence is an in-order subsequence of source sequence
   * Allows gaps (skipped markers) but maintains order
   */
  isInOrderSubsequence(responseSeq, sourceSeq) {
    if (responseSeq.length === 0) return true;
    if (sourceSeq.length === 0) return false;

    let responseIdx = 0;
    let sourceIdx = 0;

    // Try to match all response elements in source (in order)
    while (sourceIdx < sourceSeq.length && responseIdx < responseSeq.length) {
      if (sourceSeq[sourceIdx] === responseSeq[responseIdx]) {
        responseIdx++; // Found a match, move to next response element
      }
      sourceIdx++; // Always move source pointer
    }

    // If we matched all response elements, it's a valid subsequence
    return responseIdx === responseSeq.length;
  }

  finalize() {
    if (this.buffer && this.pendingMarker) {
      const regex = /\(([a-z])\)\s*/i;
      const match = this.buffer.match(regex);
      if (match) {
        const baseMarker = match[1].toLowerCase();
        const content = this.buffer.substring(match[0].length).trim();

        const matchResult = this.findMatchInDatabase(baseMarker);

        if (!matchResult.found) {
          this.warnings.push({
            type: matchResult.reason,
            baseMarker: baseMarker,
            responsePosition: this.responseSequence.length,
            message: matchResult.message,
            responsePreceding: matchResult.responsePreceding || [],
          });
          return [];
        }

        const seg = {
          marker: matchResult.sourceMarker,
          text: content || "",
        };
        this.segments.push(seg);

        matchResult.databaseEntry.used = true;
        this.slideWindow(baseMarker, matchResult.matchedIndex);

        this.responseSequence.push({
          base: baseMarker,
          fullMarker: matchResult.sourceMarker,
          matched: true,
          sourcePosition: matchResult.sourcePosition,
        });

        return [seg];
      }
    }
    return [];
  }

  getPending() {
    if (this.buffer && this.pendingMarker) {
      const regex = /\(([a-z])\)\s*/i;
      const match = this.buffer.match(regex);
      if (match) {
        const baseMarker = match[1].toLowerCase();
        const content = this.buffer.substring(match[0].length).trim();

        const matchResult = this.findMatchInDatabase(baseMarker);

        if (!matchResult.found) {
          return null; // Don't show pending for fake/unmatched markers
        }

        return {
          marker: matchResult.sourceMarker,
          text: content || "...",
          partial: true,
        };
      }
    }
    return null;
  }

  getWarnings() {
    return this.warnings;
  }

  getMatchingReport() {
    const matched = this.responseSequence.filter((r) => r.matched).length;
    const skipped = this.responseSequence.filter((r) => !r.matched).length;
    const fakeMarkers = this.warnings.filter((w) => w.type === "FAKE_MARKER");

    let totalUsed = 0;
    let totalLoaded = 0;
    Object.keys(this.precedingDatabase).forEach((baseMarker) => {
      const entries = this.precedingDatabase[baseMarker][this.maxDepth] || [];
      totalLoaded += entries.length;
      totalUsed += entries.filter((e) => e.used).length;
    });

    return {
      totalResponseMarkers: this.responseSequence.length,
      successfulMatches: matched,
      skipped: skipped,
      fakeMarkers: fakeMarkers.length,
      coverage: `${totalUsed}/${this.sourceSegments.length} source used`,
      databaseLoaded: `${totalLoaded}/${this.sourceSegments.length} loaded`,
      depthRange: `${this.maxDepth}→${this.minDepth}`,
      warnings: this.warnings,
      sequence: this.responseSequence,
      windowStats: this.getWindowStats(),
    };
  }

  getWindowStats() {
    const stats = {};
    Object.keys(this.windowPointers).forEach((base) => {
      const wp = this.windowPointers[base];
      stats[base] = {
        loaded: wp.loadedCount,
        total: wp.totalCount,
        remaining: wp.totalCount - wp.loadedCount,
      };
    });
    return stats;
  }

  getDatabase() {
    return this.precedingDatabase;
  }
}