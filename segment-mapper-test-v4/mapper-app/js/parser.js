/**
 * Parser Module - Optimized
 */

export class Parser {
  static extractContentForMapping(fullPromptText) {
    const codeBlockMatch = fullPromptText.match(/```([\s\S]*?)```/);
    if (!codeBlockMatch?.[1]) return null;
    const parts = codeBlockMatch[1].split("---");
    return parts.length >= 3 ? parts[2].trim() : null;
  }

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

    return segments;
  }
}

export class StreamingParser {
  constructor(sourceSegments = []) {
    this.sourceSegments = sourceSegments;
    this.maxDepth = 5;
    this.minDepth = 3;
    this.windowSize = 8;

    this.precedingDatabase = null;
    this.windowPointers = null;
    this.sourceSequence = null;
    this.sourceByBase = null;

    this.reset();

    if (sourceSegments.length > 0) {
      this.buildSourceStructure();
      this.initializeDatabase();
    }
  }

  buildSourceStructure() {
    this.sourceSequence = this.sourceSegments.map((seg, idx) => ({
      base: seg.marker.split("-")[0],
      fullMarker: seg.marker,
      position: idx,
      index: parseInt(seg.marker.split("-")[1]),
    }));

    this.sourceByBase = {};
    this.sourceSequence.forEach((item) => {
      if (!this.sourceByBase[item.base]) this.sourceByBase[item.base] = [];
      this.sourceByBase[item.base].push(item);
    });

    Object.values(this.sourceByBase).forEach(arr => arr.sort((a, b) => a.index - b.index));
  }

  initializeDatabase() {
    if (!this.sourceByBase || Object.keys(this.sourceByBase).length === 0) {
      throw new Error('Cannot initialize database - no source structure');
    }

    this.precedingDatabase = {};
    this.windowPointers = {};

    Object.keys(this.sourceByBase).forEach((base) => {
      this.initializeWindow(base);
    });
  }

  setSourceSegments(sourceSegments) {
    this.sourceSegments = sourceSegments;
    if (sourceSegments.length > 0) {
      this.buildSourceStructure();
      this.initializeDatabase();
    }
  }

  reset() {
    this.buffer = "";
    this.segments = [];
    this.responseSequence = [];
    this.pendingMarker = null;
    this.warnings = [];

    if (!this.precedingDatabase || Object.keys(this.precedingDatabase).length === 0) {
      return;
    }

    // Reset 'used' flags
    Object.keys(this.precedingDatabase).forEach((base) => {
      for (let depth = this.maxDepth; depth >= this.minDepth; depth--) {
        this.precedingDatabase[base][depth].forEach((entry) => {
          entry.used = false;
        });
      }
    });

    // Reset window pointers
    Object.keys(this.windowPointers).forEach((base) => {
      const initialLoadCount = Math.min(this.windowSize, this.sourceByBase[base].length);
      this.windowPointers[base].nextIndexToLoad = initialLoadCount;
      this.windowPointers[base].loadedCount = initialLoadCount;
    });
  }

  initializeWindow(baseMarker) {
    const allMarkers = this.sourceByBase[baseMarker];
    if (!allMarkers?.length) return;

    this.windowPointers[baseMarker] = {
      nextIndexToLoad: 0,
      loadedCount: 0,
      totalCount: allMarkers.length,
    };

    this.precedingDatabase[baseMarker] = {};
    for (let depth = this.maxDepth; depth >= this.minDepth; depth--) {
      this.precedingDatabase[baseMarker][depth] = [];
    }

    const initialLoadCount = Math.min(this.windowSize, allMarkers.length);
    for (let i = 0; i < initialLoadCount; i++) {
      this.loadMarkerIntoDatabase(baseMarker, i);
    }

    this.windowPointers[baseMarker].nextIndexToLoad = initialLoadCount;
    this.windowPointers[baseMarker].loadedCount = initialLoadCount;
  }

  loadMarkerIntoDatabase(baseMarker, markerIndex) {
    const sourceMarker = this.sourceByBase[baseMarker][markerIndex];
    if (!sourceMarker) return;

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

  slideWindow(baseMarker, matchedIndex) {
    const wp = this.windowPointers[baseMarker];
    if (!wp) return;

    const loadCount = Math.min(3, wp.totalCount - wp.nextIndexToLoad);

    for (let i = 0; i < loadCount; i++) {
      if (wp.nextIndexToLoad < wp.totalCount) {
        this.loadMarkerIntoDatabase(baseMarker, wp.nextIndexToLoad);
        wp.nextIndexToLoad++;
        wp.loadedCount++;
      }
    }
  }

  computePreceding(position, depth) {
    const preceding = [];
    for (let i = position - 1; i >= 0 && preceding.length < depth; i--) {
      preceding.push(this.sourceSequence[i].base);
    }
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

      const matchResult = this.findMatchInDatabase(baseMarker);

      if (!matchResult.found) {
        this.warnings.push({
          type: matchResult.reason,
          baseMarker: baseMarker,
          responsePosition: this.responseSequence.length,
          message: matchResult.message,
        });

        this.responseSequence.push({
          base: baseMarker,
          fullMarker: null,
          matched: false,
        });

        continue;
      }

      const seg = {
        marker: matchResult.sourceMarker,
        text: content || "",
      };
      
      this.segments.push(seg);
      newSegments.push(seg);

      matchResult.databaseEntry.used = true;
      this.slideWindow(baseMarker, matchResult.matchedIndex);

      this.responseSequence.push({
        base: baseMarker,
        fullMarker: matchResult.sourceMarker,
        matched: true,
        sourcePosition: matchResult.sourcePosition,
        matchDepth: matchResult.matchDepth,
      });
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

  findMatchInDatabase(baseMarker) {
    if (!this.precedingDatabase[baseMarker]) {
      return {
        found: false,
        reason: 'UNKNOWN_BASE_MARKER',
        message: `Base marker (${baseMarker}) doesn't exist in source`,
      };
    }

    const responsePreceding = this.getResponsePreceding(this.maxDepth);
    const responsePosition = this.responseSequence.length;
    const allMatches = [];

    for (let depth = this.maxDepth; depth >= this.minDepth; depth--) {
      const candidates = this.precedingDatabase[baseMarker][depth];

      for (const candidate of candidates) {
        if (candidate.used) continue;

        const lengthDiff = Math.abs(responsePreceding.length - candidate.preceding.length);
        if (lengthDiff > 2 && responsePreceding.length > 0 && candidate.preceding.length > 0) {
          continue;
        }

        if (this.enhancedSubsequenceMatch(responsePreceding, candidate.preceding)) {
          allMatches.push({ candidate, depth });
        }
      }
    }

    if (allMatches.length === 0) {
      // Try on-demand loading
      const wp = this.windowPointers[baseMarker];
      if (wp && wp.nextIndexToLoad < wp.totalCount) {
        while (wp.nextIndexToLoad < wp.totalCount) {
          this.loadMarkerIntoDatabase(baseMarker, wp.nextIndexToLoad);
          wp.nextIndexToLoad++;
          wp.loadedCount++;
        }
        return this.findMatchInDatabase(baseMarker);
      }

      return {
        found: false,
        reason: 'FAKE_MARKER',
        message: `No (${baseMarker}) matches [${responsePreceding.join(', ')}]`,
      };
    }

    // Select best match
    let selected = allMatches[0];
    if (allMatches.length > 1) {
      selected = allMatches.reduce((best, current) => {
        const bestDiff = Math.abs(best.candidate.position - responsePosition);
        const currentDiff = Math.abs(current.candidate.position - responsePosition);
        return currentDiff < bestDiff ? current : best;
      });
    }

    return {
      found: true,
      sourceMarker: selected.candidate.marker,
      sourcePosition: selected.candidate.position,
      matchedIndex: selected.candidate.index,
      matchDepth: selected.depth,
      databaseEntry: selected.candidate,
    };
  }

  enhancedSubsequenceMatch(responseSeq, sourceSeq) {
    if (responseSeq.length === 0 && sourceSeq.length === 0) return true;
    if (responseSeq.length === 0 && sourceSeq.length > 0) return false;
    if (responseSeq.length > 0 && sourceSeq.length === 0) return false;
    if (responseSeq.length > sourceSeq.length + 1) return false;

    return this.isInOrderSubsequence(responseSeq, sourceSeq);
  }

  isInOrderSubsequence(responseSeq, sourceSeq) {
    if (responseSeq.length === 0) return true;
    if (sourceSeq.length === 0) return false;

    let responseIdx = 0;
    let sourceIdx = 0;

    while (sourceIdx < sourceSeq.length && responseIdx < responseSeq.length) {
      if (sourceSeq[sourceIdx] === responseSeq[responseIdx]) {
        responseIdx++;
      }
      sourceIdx++;
    }

    return responseIdx === responseSeq.length;
  }

  getResponsePreceding(depth) {
    const preceding = [];
    for (let i = this.responseSequence.length - 1; i >= 0 && preceding.length < depth; i--) {
      preceding.unshift(this.responseSequence[i].base);
    }
    return preceding;
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

        if (!matchResult.found) return null;

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
    
    Object.keys(this.precedingDatabase || {}).forEach((baseMarker) => {
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
      warnings: this.warnings,
    };
  }
}