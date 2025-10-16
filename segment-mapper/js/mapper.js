import { throttle } from './utils.js';

export class Mapper {
    constructor(displayElement) {
        this.source = [];
        this.target = [];
        this.targetPartial = null;
        this.displayElement = displayElement;
        this.throttledDraw = throttle(this.draw.bind(this), 100);
    }
    
    setSource(segments) { 
        this.source = segments; 
        this.draw(); 
    }
    
    reset() { 
        this.target = []; 
        this.targetPartial = null; 
        this.draw(); 
    }

    addTargetBatch(segments) { 
        this.target.push(...segments); 
        this.throttledDraw(); 
    }
    
    setTargetPartial(partial) { 
        this.targetPartial = partial; 
        this.throttledDraw(); 
    }

    draw() {
        if(!this.displayElement) return;
        this.displayElement.innerHTML = '';
        if (this.source.length === 0) {
            this.displayElement.innerHTML = '<div class="empty">Source text is missing or not in the correct format.</div>';
            return;
        }
        if (this.target.length === 0 && !this.targetPartial) {
            this.displayElement.innerHTML = '<div class="empty">Click "Generate & Map" to process</div>';
            return;
        }

        const sourceMap = {}; this.source.forEach(s => sourceMap[s.marker] = s);
        const targetMap = {}; this.target.forEach(t => targetMap[t.marker] = t);
        
        let currentBatch = [];
        let batchNum = 0;
        const batchSize = 3;

        // --- START: REVISED LOGIC ---
        // The main loop now handles all segment types (matched, partial, and gap).
        for (let i = 0; i < this.source.length; i++) {
            const sourceSeg = this.source[i];
            const matchedSeg = targetMap[sourceSeg.marker];
            let item;

            if (matchedSeg) {
                // This segment has a fully completed target match.
                item = { type: 'matched', source: sourceSeg, target: matchedSeg };
            } else if (this.targetPartial && this.targetPartial.marker === sourceSeg.marker) {
                // This is the currently streaming partial segment.
                item = { type: 'partial', source: sourceSeg, target: this.targetPartial };
            } else {
                // No completed or partial match found, so it's a gap.
                item = { type: 'gap', source: sourceSeg, target: null };
            }
            
            currentBatch.push(item);

            if (currentBatch.length === batchSize || i === this.source.length - 1) {
                if (currentBatch.length > 0) {
                    this.renderBatch(currentBatch, ++batchNum);
                    currentBatch = [];
                }
            }
        }
        // --- END: REVISED LOGIC ---


        // --- START: REMOVED CODE BLOCK ---
        // The block that created "BATCH #STREAMING" has been deleted from here.
        // --- END: REMOVED CODE BLOCK ---


        const orphans = this.target.filter(t => !sourceMap[t.marker]);
        if (orphans.length > 0) {
            this.renderBatch(orphans.map(t => ({ type: 'orphan', source: null, target: t })), 'ORPHAN');
        }
    }

    renderBatch(items, batchNum) {
        const batchDiv = document.createElement('div');
        batchDiv.className = 'batch';
        batchDiv.innerHTML = `<div class="batch-header">BATCH #${batchNum} (${items.length} segments)</div>`;
        items.forEach(item => {
            const pairDiv = document.createElement('div');
            pairDiv.className = `pair ${item.type}`;
            let jsonObj = {};
            if (item.type === 'matched') jsonObj = { marker: item.source.marker, source: item.source.text, target: item.target.text };
            else if (item.type === 'gap') jsonObj = { marker: item.source.marker, source: item.source.text, target: null };
            else if (item.type === 'partial') jsonObj = { marker: item.target.marker, source: item.source ? item.source.text : null, target: item.target.text + ' [STREAMING...]' };
            else if (item.type === 'orphan') jsonObj = { marker: item.target.marker, source: null, target: item.target.text };
            pairDiv.innerHTML = `<div class="json">${this.formatJSON(jsonObj)}</div><div class="meta">Status: ${item.type.toUpperCase()}</div>`;
            batchDiv.appendChild(pairDiv);
        });
        this.displayElement.appendChild(batchDiv);
    }
    _escapeHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
    _formatValue(value, indentLevel) {
        const indent = '&nbsp;'.repeat(indentLevel * 2);
        const baseIndent = '&nbsp;'.repeat((indentLevel - 1) * 2);
        if (value === null) return '<span class="json-null">null</span>';
        if (typeof value === 'string') return `<span class="json-string">"${this._escapeHtml(value)}"</span>`;
        if (typeof value === 'number') return `<span class="json-number">${value}</span>`;
        if (typeof value === 'boolean') return `<span class="json-boolean">${value}</span>`;
        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            let html = '[';
            for (let i = 0; i < value.length; i++) {
                html += `<br>${indent}${this._formatValue(value[i], indentLevel + 1)}`;
                if (i < value.length - 1) html += ',';
            }
            html += `<br>${baseIndent}]`;
            return html;
        }
        if (typeof value === 'object') {
            const keys = Object.keys(value);
            if (keys.length === 0) return '{}';
            let html = '{';
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                html += `<br>${indent}<span class="json-key">"${this._escapeHtml(key)}"</span>: ${this._formatValue(value[key], indentLevel + 1)}`;
                if (i < keys.length - 1) html += ',';
            }
            html += `<br>${baseIndent}}`;
            return html;
        }
        return this._escapeHtml(String(value));
    }
    formatJSON(obj) {
        if (obj === null || obj === undefined) return '<span class="json-null">null</span>';
        return this._formatValue(obj, 1);
    }
}
