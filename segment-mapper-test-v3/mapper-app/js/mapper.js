import { throttle } from '../../shared/js/utils.js';

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
        
        this.throttledUpdatePartial = throttle(this.updatePartialDisplay.bind(this), 200);
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
        this.clearDisplay();
        this.initialRender(); 
    }

    addTargetBatch(segments) { 
        if (!segments || segments.length === 0) return;
        this.target.push(...segments);
        this.updateMatchedSegments(segments);
    }
    
    setTargetPartial(partial) { 
        if (!partial) {
            this.targetPartial = null;
            return;
        }

        const pairElement = this.renderedPairs.get(partial.marker);
        if (pairElement && pairElement.classList.contains('matched')) {
            this.logger.warn(`[RACE_CONDITION] Partial update for ${partial.marker} after matched. Ignoring.`);
            this.sendToDebugWindow('RACE_CONDITION_DETECTED', { 
                marker: partial.marker, 
                details: 'Partial update after matched state.' 
            });
            return;
        }

        if (this.targetPartial?.marker !== partial?.marker || 
            this.targetPartial?.text !== partial?.text) {
            this.targetPartial = partial;
            this.throttledUpdatePartial();
        }
    }

    finalize() {
        if (this.throttledUpdatePartial?.flush) {
            this.throttledUpdatePartial.flush();
        }
        this.targetPartial = null;
    }

    /* === PRIVATE METHODS === */

    clearDisplay() {
        this.renderedPairs.clear();
        this.renderedGroups.clear();
        this.renderedBatches.clear();
        if (this.displayElement) {
            this.displayElement.innerHTML = '';
        }
    }

    updatePartialDisplay() {
        if (!this.targetPartial) return;
        
        const pairElement = this.renderedPairs.get(this.targetPartial.marker);
        if (pairElement) {
            const source = this.source.find(s => s.marker === this.targetPartial.marker);
            if (source) {
                this.updatePairElement(pairElement, {
                    type: 'partial',
                    source: source,
                    target: this.targetPartial
                });
            }
        }
    }

    updateMatchedSegments(newSegments) {
        const sourceMap = new Map(this.source.map(s => [s.marker, s]));
        
        newSegments.forEach(segment => {
            const sourceMatch = sourceMap.get(segment.marker);
            const pairElement = this.renderedPairs.get(segment.marker);
            
            if (sourceMatch && pairElement) {
                this.updatePairElement(pairElement, {
                    type: 'matched',
                    source: sourceMatch,
                    target: segment
                });
            } else if (!sourceMatch) {
                this.addOrphanSegment(segment);
            }
        });
    }

    updatePairElement(pairElement, item) {
        pairElement.className = `pair ${item.type}`;
        
        const statusSpan = pairElement.querySelector('.pair-status');
        if (statusSpan) statusSpan.textContent = item.type.toUpperCase();
        
        const targetValue = pairElement.querySelectorAll('.json-value')[1] || 
                           pairElement.querySelector('.json-value');
        
        if (targetValue) {
            targetValue.className = 'json-value';
            
            if (item.type === 'gap') {
                targetValue.textContent = '(waiting...)';
                targetValue.classList.add('empty');
            } else if (item.type === 'partial') {
                targetValue.textContent = item.target?.text || '...';
                targetValue.classList.add('streaming');
            } else if (item.target?.text) {
                targetValue.textContent = item.target.text;
            } else {
                targetValue.textContent = '(no target)';
                targetValue.classList.add('empty');
            }
        }
    }

    addOrphanSegment(segment) {
        let orphanGroup = this.renderedGroups.get('ORPHAN');
        
        if (!orphanGroup) {
            orphanGroup = this.createGroupElement('ORPHAN');
            this.renderedGroups.set('ORPHAN', orphanGroup);
            this.displayElement.appendChild(orphanGroup);
        }
        
        let orphanBatch = this.renderedBatches.get('ORPHAN-BATCH');
        
        if (!orphanBatch) {
            orphanBatch = this.createBatchElement('ORPHAN');
            this.renderedBatches.set('ORPHAN-BATCH', orphanBatch);
            orphanGroup.querySelector('.group-content').appendChild(orphanBatch);
        }
        
        const pairElement = this.createPairElement({
            type: 'orphan',
            source: null,
            target: segment
        });
        
        this.renderedPairs.set(segment.marker, pairElement);
        orphanBatch.querySelector('.batch-content').appendChild(pairElement);
        
        this.updateBatchHeader(orphanBatch, 'ORPHAN');
        this.updateGroupHeader(orphanGroup, 'ORPHAN');
    }

    updateBatchHeader(batchElement, batchNum) {
        const count = batchElement.querySelectorAll('.pair').length;
        const textSpan = batchElement.querySelector('.batch-title');
        if (textSpan) {
            textSpan.textContent = batchNum === 'ORPHAN' ? 
                `Orphans (${count})` : 
                `Batch ${batchNum} (${count})`;
        }
    }

    updateGroupHeader(groupElement, groupNum) {
        const batchCount = groupElement.querySelectorAll('.batch').length;
        const segmentCount = groupElement.querySelectorAll('.pair').length;
        
        const batchCountSpan = groupElement.querySelector('.batch-count');
        const segmentCountSpan = groupElement.querySelector('.segment-count');
        
        if (batchCountSpan) batchCountSpan.textContent = batchCount;
        if (segmentCountSpan) segmentCountSpan.textContent = segmentCount;
    }

    /* === RENDERING === */

    initialRender() {
        if (!this.displayElement) return;
        
        if (!this.source.length) {
            this.displayElement.innerHTML = '<div class="empty">No source segments available.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        const targetMap = new Map(this.target.map(t => [t.marker, t]));
        const allBatches = this.buildBatches(targetMap);
        
        this.renderGroups(fragment, allBatches);
        this.renderOrphans(fragment);
        
        this.displayElement.innerHTML = '';
        this.displayElement.appendChild(fragment);
    }

    renderGroups(fragment, allBatches) {
        let groupNum = 1;
        let batchIndex = 0;
        
        while (batchIndex < allBatches.length) {
            const batchesPerGroup = groupNum === 1 ? 1 : 10;
            const batchesInGroup = allBatches.slice(batchIndex, batchIndex + batchesPerGroup);
            
            if (batchesInGroup.length) {
                const groupElement = this.createGroupElement(groupNum);
                const groupContent = groupElement.querySelector('.group-content');
                
                batchesInGroup.forEach((batchItems, index) => {
                    const batchNum = batchIndex + index + 1;
                    const batchElement = this.renderBatch(batchItems, batchNum);
                    groupContent.appendChild(batchElement);
                    this.renderedBatches.set(`BATCH-${batchNum}`, batchElement);
                });
                
                this.updateGroupHeader(groupElement, groupNum);
                this.renderedGroups.set(`GROUP-${groupNum}`, groupElement);
                fragment.appendChild(groupElement);
                
                batchIndex += batchesInGroup.length;
                groupNum++;
            }
        }
    }

    renderBatch(batchItems, batchNum) {
        const batchElement = this.createBatchElement(batchNum);
        const batchContent = batchElement.querySelector('.batch-content');
        
        batchItems.forEach(item => {
            const pairElement = this.createPairElement(item);
            const marker = item.source?.marker || item.target?.marker;
            this.renderedPairs.set(marker, pairElement);
            batchContent.appendChild(pairElement);
        });
        
        this.updateBatchHeader(batchElement, batchNum);
        
        return batchElement;
    }

    renderOrphans(fragment) {
        const sourceMap = new Map(this.source.map(s => [s.marker, s]));
        const orphans = this.target.filter(t => !sourceMap.has(t.marker));
        
        if (!orphans.length) return;
        
        const orphanGroup = this.createGroupElement('ORPHAN');
        const groupContent = orphanGroup.querySelector('.group-content');
        const orphanBatch = this.createBatchElement('ORPHAN');
        const batchContent = orphanBatch.querySelector('.batch-content');
        
        orphans.forEach(target => {
            const pairElement = this.createPairElement({
                type: 'orphan',
                source: null,
                target: target
            });
            this.renderedPairs.set(target.marker, pairElement);
            batchContent.appendChild(pairElement);
        });
        
        this.updateBatchHeader(orphanBatch, 'ORPHAN');
        this.renderedBatches.set('ORPHAN-BATCH', orphanBatch);
        groupContent.appendChild(orphanBatch);
        
        this.updateGroupHeader(orphanGroup, 'ORPHAN');
        this.renderedGroups.set('ORPHAN', orphanGroup);
        fragment.appendChild(orphanGroup);
    }

    buildBatches(targetMap) {
        const batches = [];
        let currentBatch = [];
        const batchSize = 3;

        this.source.forEach((sourceSeg, i) => {
            const matchedSeg = targetMap.get(sourceSeg.marker);
            let item;

            if (matchedSeg) {
                item = { type: 'matched', source: sourceSeg, target: matchedSeg };
            } else if (this.targetPartial?.marker === sourceSeg.marker) {
                item = { type: 'partial', source: sourceSeg, target: this.targetPartial };
            } else {
                item = { type: 'gap', source: sourceSeg, target: null };
            }
            
            currentBatch.push(item);

            if (currentBatch.length === batchSize || i === this.source.length - 1) {
                batches.push(currentBatch);
                currentBatch = [];
            }
        });

        return batches;
    }

    /* === DOM CREATION === */

    createGroupElement(groupNum) {
        const div = this.createElement('div', 'batch-group');
        div.dataset.groupNum = groupNum;
        
        const header = this.createElement('div', 'group-header');
        header.addEventListener('click', () => div.classList.toggle('collapsed'));
        
        const title = this.createElement('div', 'group-title');
        title.innerHTML = `
            <span class="collapse-icon">▼</span>
            <span>${groupNum === 'ORPHAN' ? '⚠ ORPHAN SEGMENTS' : `GROUP ${groupNum}`}</span>
        `;
        
        const stats = this.createElement('div', 'group-stats');
        stats.innerHTML = `
            <div class="group-stat">
                <span class="group-stat-label">Batches:</span>
                <span class="group-stat-value batch-count">0</span>
            </div>
            <div class="group-stat">
                <span class="group-stat-label">Segments:</span>
                <span class="group-stat-value segment-count">0</span>
            </div>
        `;
        
        header.appendChild(title);
        header.appendChild(stats);
        
        const content = this.createElement('div', 'group-content');
        
        div.appendChild(header);
        div.appendChild(content);
        
        return div;
    }

    createBatchElement(batchNum) {
        const div = this.createElement('div', 'batch');
        div.dataset.batchNum = batchNum;
        
        const header = this.createElement('div', 'batch-header');
        header.addEventListener('click', () => div.classList.toggle('collapsed'));
        
        const collapseIcon = this.createElement('span', 'batch-collapse-icon');
        collapseIcon.textContent = '▼';
        
        const title = this.createElement('span', 'batch-title');
        title.textContent = batchNum === 'ORPHAN' ? 'Orphans' : `Batch ${batchNum}`;
        
        header.appendChild(collapseIcon);
        header.appendChild(title);
        
        const content = this.createElement('div', 'batch-content');
        
        div.appendChild(header);
        div.appendChild(content);
        
        return div;
    }

    createPairElement(item) {
        const div = this.createElement('div', `pair ${item.type}`);
        div.dataset.marker = item.source?.marker || item.target?.marker;
        
        const header = this.createElement('div', 'pair-header');
        
        const marker = this.createElement('span', 'pair-marker');
        marker.textContent = div.dataset.marker;
        
        const status = this.createElement('span', 'pair-status');
        status.textContent = item.type.toUpperCase();
        
        header.appendChild(marker);
        header.appendChild(status);
        
        const content = this.createElement('div', 'pair-content');
        const grid = this.createElement('div', 'json-grid');
        
        // Source
        if (item.source || item.type !== 'orphan') {
            grid.appendChild(this.createLabel('Source'));
            grid.appendChild(this.createValue(item.source?.text, !item.source?.text));
        }
        
        // Target
        grid.appendChild(this.createLabel('Target'));
        
        if (item.type === 'gap') {
            grid.appendChild(this.createValue('(waiting...)', true));
        } else if (item.type === 'partial') {
            const val = this.createValue(item.target?.text || '...', false);
            val.classList.add('streaming');
            grid.appendChild(val);
        } else {
            grid.appendChild(this.createValue(item.target?.text, !item.target?.text));
        }
        
        content.appendChild(grid);
        div.appendChild(header);
        div.appendChild(content);
        
        return div;
    }

    createElement(tag, className) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        return el;
    }

    createLabel(text) {
        const label = this.createElement('div', 'json-label');
        label.textContent = text;
        return label;
    }

    createValue(text, isEmpty) {
        const value = this.createElement('div', 'json-value');
        value.textContent = text || '(no target)';
        if (isEmpty) value.classList.add('empty');
        return value;
    }
}