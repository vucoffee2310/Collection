export class Parser {
    /**
     * Extracts the raw segmented text from the full prompt.
     * It finds the content within the ```...``` block and then isolates the
     * text that comes *after* the '---' metadata block.
     * @param {string} fullPromptText The entire text from the source input.
     * @returns {string|null} The raw text for mapping, or null if the format is incorrect.
     */
    static extractContentForMapping(fullPromptText) {
        // First, get the content inside the code block
        const codeBlockMatch = fullPromptText.match(/```([\s\S]*?)```/);
        if (!codeBlockMatch || !codeBlockMatch[1]) {
            return null; // No code block found
        }
        const codeBlockContent = codeBlockMatch[1];

        // Now, find the content after the metadata block
        const parts = codeBlockContent.split('---');

        // Expecting 3 parts: [before-first-dash, metadata, after-second-dash]
        if (parts.length >= 3) {
            // The content we want is the last part
            return parts[2].trim();
        }

        return null; // Metadata format not found
    }

    static parseWithUniqueMarkers(text) {
        const regex = /\(([a-z]+)\)\s*/gi;
        const segments = [];
        const markerCounts = {};
        const matches = [];

        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push({
                marker: match[1].toLowerCase(),
                pos: match.index,
                endPos: regex.lastIndex
            });
        }

        for (let i = 0; i < matches.length; i++) {
            const current = matches[i];
            const next = matches[i + 1];
            const baseMarker = current.marker;
            const textStart = current.endPos;
            const textEnd = next ? next.pos : text.length;
            const content = text.substring(textStart, textEnd).trim();

            if (content) {
                if (!markerCounts[baseMarker]) markerCounts[baseMarker] = 0;
                const index = markerCounts[baseMarker]++;
                segments.push({
                    marker: `${baseMarker}-${index}`,
                    text: content
                });
            }
        }
        return segments;
    }
}

export class StreamingParser {
    constructor() { this.reset(); }
    reset() {
        this.buffer = '';
        this.segments = [];
        this.markerCounts = {};
        this.pendingMarker = null;
    }
    feed(chunk) {
        this.buffer += chunk;
        return this.extract();
    }
    extract() {
        const regex = /\(([a-z]+)\)\s*/gi;
        const newSegments = [];
        const matches = [];
        let match;
        while ((match = regex.exec(this.buffer)) !== null) {
            matches.push({
                marker: match[1].toLowerCase(),
                pos: match.index,
                endPos: regex.lastIndex
            });
        }
        for (let i = 0; i < matches.length - 1; i++) {
            const current = matches[i];
            const next = matches[i + 1];
            const baseMarker = current.marker;
            const content = this.buffer.substring(current.endPos, next.pos).trim();
            if (content) {
                if (!this.markerCounts[baseMarker]) this.markerCounts[baseMarker] = 0;
                const index = this.markerCounts[baseMarker]++;
                const seg = { marker: `${baseMarker}-${index}`, text: content };
                this.segments.push(seg);
                newSegments.push(seg);
            }
        }
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            this.pendingMarker = lastMatch.marker;
            this.buffer = this.buffer.substring(lastMatch.pos);
        } else {
            this.buffer = '';
        }
        return newSegments;
    }
    finalize() {
        if (this.buffer && this.pendingMarker) {
            const regex = /\(([a-z]+)\)\s*/i;
            const match = this.buffer.match(regex);
            if (match) {
                const baseMarker = match[1].toLowerCase();
                const content = this.buffer.substring(match[0].length).trim();
                if (content) {
                    if (!this.markerCounts[baseMarker]) this.markerCounts[baseMarker] = 0;
                    const index = this.markerCounts[baseMarker]++;
                    const seg = { marker: `${baseMarker}-${index}`, text: content };
                    this.segments.push(seg);
                    return [seg];
                }
            }
        }
        return [];
    }
    getPending() {
        if (this.pendingMarker && this.buffer) {
            const regex = /\(([a-z]+)\)\s*/i;
            const match = this.buffer.match(regex);
            if (match) {
                const baseMarker = match[1].toLowerCase();
                const content = this.buffer.substring(match[0].length).trim();
                const index = this.markerCounts[baseMarker] || 0;
                return { marker: `${baseMarker}-${index}`, text: content || '...', partial: true };
            }
        }
        return null;
    }
}
