import { throttle } from './utils.js';

export class Mapper {
    constructor(displayElement) {
        this.source = [];
        this.target = [];
        this.targetPartial = null;
        this.displayElement = displayElement;
        
        // Track rendered DOM elements for incremental updates
        this.renderedPairs = new Map(); // marker -> pair element
        this.renderedGroups = new Map(); // groupKey -> group element
        this.renderedBatches = new Map(); // batchKey -> batch element
        
        // Throttle only partial updates
        this.throttledUpdatePartial = throttle(this.updatePartialDisplay.bind(this), 200);
    }
    
    setSource(segments) { 
        this.source = segments;
        this.clearDisplay();
        this.initialRender(); 
    }
    
    reset() { 
        this.target = []; 
        this.targetPartial = null;
        this.clearDisplay();
        this.initialRender(); 
    }

    clearDisplay() {
        this.renderedPairs.clear();
        this.renderedGroups.clear();
        this.renderedBatches.clear();
        if (this.displayElement) {
            this.displayElement.innerHTML = '';
        }
    }

    addTargetBatch(segments) { 
        if (!segments || segments.length === 0) return;
        
        this.target.push(...segments);
        
        // Incremental update - only update changed pairs
        this.updateMatchedSegments(segments);
    }
    
    setTargetPartial(partial) { 
        // Only update if partial actually changed
        if (this.targetPartial?.marker !== partial?.marker || 
            this.targetPartial?.text !== partial?.text) {
            this.targetPartial = partial;
            this.throttledUpdatePartial();
        }
    }

    updatePartialDisplay() {
        if (!this.targetPartial) return;
        
        const marker = this.targetPartial.marker;
        const pairElement = this.renderedPairs.get(marker);
        
        if (pairElement) {
            const source = this.source.find(s => s.marker === marker);
            if (source) {
                this.updatePairElement(pairElement, {
                    type: 'partial',
                    source: source,
                    target: this.targetPartial
                });
            }
        }
    }

    finalize() {
        if (this.throttledUpdatePartial.pending()) {
            this.throttledUpdatePartial.flush();
        }
    }

    // Update only the segments that just arrived
    updateMatchedSegments(newSegments) {
        const sourceMap = new Map(this.source.map(s => [s.marker, s]));
        
        newSegments.forEach(segment => {
            const marker = segment.marker;
            const sourceMatch = sourceMap.get(marker);
            const pairElement = this.renderedPairs.get(marker);
            
            if (sourceMatch && pairElement) {
                // Update gap/partial to matched
                this.updatePairElement(pairElement, {
                    type: 'matched',
                    source: sourceMatch,
                    target: segment
                });
            } else if (!sourceMatch) {
                // This is an orphan - add to orphan group
                this.addOrphanSegment(segment);
            }
        });
    }

    // Update a single pair element (NO full repaint)
    updatePairElement(pairElement, item) {
        // Update class
        pairElement.className = `pair ${item.type}`;
        
        // Build JSON object
        let jsonObj = {};
        if (item.type === 'matched') {
            jsonObj = { marker: item.source.marker, source: item.source.text, target: item.target.text };
        } else if (item.type === 'gap') {
            jsonObj = { marker: item.source.marker, source: item.source.text, target: null };
        } else if (item.type === 'partial') {
            jsonObj = { marker: item.target.marker, source: item.source ? item.source.text : null, target: item.target.text + ' [STREAMING...]' };
        } else if (item.type === 'orphan') {
            jsonObj = { marker: item.target.marker, source: null, target: item.target.text };
        }
        
        // Update JSON div (only this element repaints)
        const jsonDiv = pairElement.querySelector('.json');
        if (jsonDiv) {
            jsonDiv.innerHTML = this.formatJSON(jsonObj);
        }
        
        // Update meta div
        const metaDiv = pairElement.querySelector('.meta');
        if (metaDiv) {
            metaDiv.textContent = `Status: ${item.type.toUpperCase()}`;
        }
    }

    // Add orphan segment dynamically
    addOrphanSegment(segment) {
        // Get or create orphan group
        let orphanGroup = this.renderedGroups.get('ORPHAN');
        
        if (!orphanGroup) {
            orphanGroup = this.createGroupElement('ORPHAN');
            this.renderedGroups.set('ORPHAN', orphanGroup);
            this.displayElement.appendChild(orphanGroup);
        }
        
        // Get or create orphan batch
        const orphanBatchKey = 'ORPHAN-BATCH';
        let orphanBatch = this.renderedBatches.get(orphanBatchKey);
        
        if (!orphanBatch) {
            orphanBatch = this.createBatchElement('ORPHAN');
            this.renderedBatches.set(orphanBatchKey, orphanBatch);
            
            const groupContent = orphanGroup.querySelector('.group-content');
            if (groupContent) {
                groupContent.appendChild(orphanBatch);
            }
        }
        
        // Create and add orphan pair
        const pairElement = this.createPairElement({
            type: 'orphan',
            source: null,
            target: segment
        });
        
        this.renderedPairs.set(segment.marker, pairElement);
        orphanBatch.appendChild(pairElement);
        
        // Update counts
        this.updateBatchHeader(orphanBatch, 'ORPHAN');
        this.updateGroupHeader(orphanGroup, 'ORPHAN');
    }

    updateBatchHeader(batchElement, batchNum) {
        const pairCount = batchElement.querySelectorAll('.pair').length;
        const header = batchElement.querySelector('.batch-header');
        if (header) {
            header.textContent = `BATCH #${batchNum} (${pairCount} segments)`;
        }
    }

    updateGroupHeader(groupElement, groupNum) {
        const batchCount = groupElement.querySelectorAll('.batch').length;
        const segmentCount = groupElement.querySelectorAll('.pair').length;
        const header = groupElement.querySelector('.group-header');
        if (header) {
            header.textContent = `GROUP #${groupNum} (${batchCount} batch${batchCount > 1 ? 'es' : ''}, ${segmentCount} segments)`;
        }
    }

    // Initial render - creates all gaps (called only on reset/source change)
    initialRender() {
        if (!this.displayElement) return;
        
        // Handle empty states
        if (this.source.length === 0) {
            this.displayElement.innerHTML = '<div class="empty">Source text is missing or not in the correct format.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        const targetMap = new Map(this.target.map(t => [t.marker, t]));
        
        // Build batches
        const allBatches = this.buildBatches(targetMap);
        
        // Group batches: first group has 1 batch, rest have 10 batches each
        let groupNum = 1;
        let batchIndex = 0;
        
        while (batchIndex < allBatches.length) {
            const batchesPerGroup = groupNum === 1 ? 1 : 10;
            const batchesInThisGroup = allBatches.slice(batchIndex, batchIndex + batchesPerGroup);
            
            if (batchesInThisGroup.length > 0) {
                const groupElement = this.createGroupElement(groupNum);
                const groupContent = groupElement.querySelector('.group-content');
                
                batchesInThisGroup.forEach((batchItems, index) => {
                    const batchNum = batchIndex + index + 1;
                    const batchElement = this.createBatchElement(batchNum);
                    
                    batchItems.forEach(item => {
                        const pairElement = this.createPairElement(item);
                        const marker = item.source?.marker || item.target?.marker;
                        this.renderedPairs.set(marker, pairElement);
                        batchElement.appendChild(pairElement);
                    });
                    
                    this.updateBatchHeader(batchElement, batchNum);
                    this.renderedBatches.set(`BATCH-${batchNum}`, batchElement);
                    groupContent.appendChild(batchElement);
                });
                
                this.updateGroupHeader(groupElement, groupNum);
                this.renderedGroups.set(`GROUP-${groupNum}`, groupElement);
                fragment.appendChild(groupElement);
                
                batchIndex += batchesInThisGroup.length;
                groupNum++;
            }
        }

        // Handle existing orphans
        const sourceMap = new Map(this.source.map(s => [s.marker, s]));
        const orphans = this.target.filter(t => !sourceMap.has(t.marker));
        
        if (orphans.length > 0) {
            const orphanGroup = this.createGroupElement('ORPHAN');
            const groupContent = orphanGroup.querySelector('.group-content');
            
            const orphanBatch = this.createBatchElement('ORPHAN');
            
            orphans.forEach(target => {
                const pairElement = this.createPairElement({
                    type: 'orphan',
                    source: null,
                    target: target
                });
                this.renderedPairs.set(target.marker, pairElement);
                orphanBatch.appendChild(pairElement);
            });
            
            this.updateBatchHeader(orphanBatch, 'ORPHAN');
            this.renderedBatches.set('ORPHAN-BATCH', orphanBatch);
            groupContent.appendChild(orphanBatch);
            
            this.updateGroupHeader(orphanGroup, 'ORPHAN');
            this.renderedGroups.set('ORPHAN', orphanGroup);
            fragment.appendChild(orphanGroup);
        }

        // Single DOM update
        this.displayElement.innerHTML = '';
        this.displayElement.appendChild(fragment);
    }

    buildBatches(targetMap) {
        const allBatches = [];
        let currentBatch = [];
        const batchSize = 3;

        for (let i = 0; i < this.source.length; i++) {
            const sourceSeg = this.source[i];
            const matchedSeg = targetMap.get(sourceSeg.marker);
            let item;

            if (matchedSeg) {
                item = { type: 'matched', source: sourceSeg, target: matchedSeg };
            } else if (this.targetPartial && this.targetPartial.marker === sourceSeg.marker) {
                item = { type: 'partial', source: sourceSeg, target: this.targetPartial };
            } else {
                item = { type: 'gap', source: sourceSeg, target: null };
            }
            
            currentBatch.push(item);

            if (currentBatch.length === batchSize || i === this.source.length - 1) {
                if (currentBatch.length > 0) {
                    allBatches.push(currentBatch);
                    currentBatch = [];
                }
            }
        }

        return allBatches;
    }

    createGroupElement(groupNum) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'batch-group';
        groupDiv.dataset.groupNum = groupNum;
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.textContent = `GROUP #${groupNum}`;
        groupDiv.appendChild(groupHeader);
        
        const groupContent = document.createElement('div');
        groupContent.className = 'group-content';
        groupDiv.appendChild(groupContent);
        
        return groupDiv;
    }

    createBatchElement(batchNum) {
        const batchDiv = document.createElement('div');
        batchDiv.className = 'batch';
        batchDiv.dataset.batchNum = batchNum;
        
        const batchHeader = document.createElement('div');
        batchHeader.className = 'batch-header';
        batchHeader.textContent = `BATCH #${batchNum} (0 segments)`;
        batchDiv.appendChild(batchHeader);
        
        return batchDiv;
    }

    createPairElement(item) {
        const pairDiv = document.createElement('div');
        pairDiv.className = `pair ${item.type}`;
        const marker = item.source?.marker || item.target?.marker;
        pairDiv.dataset.marker = marker;
        
        let jsonObj = {};
        if (item.type === 'matched') {
            jsonObj = { marker: item.source.marker, source: item.source.text, target: item.target.text };
        } else if (item.type === 'gap') {
            jsonObj = { marker: item.source.marker, source: item.source.text, target: null };
        } else if (item.type === 'partial') {
            jsonObj = { marker: item.target.marker, source: item.source ? item.source.text : null, target: item.target.text + ' [STREAMING...]' };
        } else if (item.type === 'orphan') {
            jsonObj = { marker: item.target.marker, source: null, target: item.target.text };
        }
        
        const jsonDiv = document.createElement('div');
        jsonDiv.className = 'json';
        jsonDiv.innerHTML = this.formatJSON(jsonObj);
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'meta';
        metaDiv.textContent = `Status: ${item.type.toUpperCase()}`;
        
        pairDiv.appendChild(jsonDiv);
        pairDiv.appendChild(metaDiv);
        
        return pairDiv;
    }
    
    _escapeHtml(str) { 
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); 
    }
    
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