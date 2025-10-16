export class Mapper {
    constructor() {
        this.source = [];
        this.target = [];
        this.targetPartial = null;
        this.displayElement = document.getElementById('display');
    }

    setSource(segments) {
        this.source = segments;
        this.draw();
    }

    addTargetBatch(segments) {
        this.target.push(...segments);
        this.draw();
    }

    setTargetPartial(partial) {
        this.targetPartial = partial;
        this.draw();
    }

    reset() {
        this.target = [];
        this.targetPartial = null;
        this.draw();
    }

    draw() {
        this.displayElement.innerHTML = '';
        
        if (this.source.length === 0) {
            this.displayElement.innerHTML = '<div class="empty">Source text is missing or not in the correct format with metadata.</div>';
            return;
        }
        
        if (this.target.length === 0 && !this.targetPartial) {
            this.displayElement.innerHTML = '<div class="empty">Click "Generate & Map" to process</div>';
            return;
        }

        const sourceMap = {};
        this.source.forEach(s => sourceMap[s.marker] = s);
        const targetMap = {};
        this.target.forEach(t => targetMap[t.marker] = t);

        let currentBatch = [];
        let batchNum = 0;
        const batchSize = 3;

        for (let i = 0; i < this.source.length; i++) {
            const sourceSeg = this.source[i];
            const targetSeg = targetMap[sourceSeg.marker];
            currentBatch.push({
                type: targetSeg ? 'matched' : 'gap',
                source: sourceSeg,
                target: targetSeg
            });

            if (currentBatch.length === batchSize || i === this.source.length - 1) {
                if (currentBatch.length > 0) {
                    this.renderBatch(currentBatch, ++batchNum);
                    currentBatch = [];
                }
            }
        }

        if (this.targetPartial) {
            this.renderBatch([{
                type: 'partial',
                source: sourceMap[this.targetPartial.marker] || null,
                target: this.targetPartial
            }], 'STREAMING');
        }

        const orphans = this.target.filter(t => !sourceMap[t.marker]);
        if (orphans.length > 0) {
            this.renderBatch(orphans.map(t => ({
                type: 'orphan',
                source: null,
                target: t
            })), 'ORPHAN');
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
            
            if (item.type === 'matched') {
                jsonObj = { marker: item.source.marker, source: item.source.text, target: item.target.text };
            } else if (item.type === 'gap') {
                jsonObj = { marker: item.source.marker, source: item.source.text, target: null };
            } else if (item.type === 'partial') {
                jsonObj = { marker: item.target.marker, source: item.source ? item.source.text : null, target: item.target.text + ' [STREAMING...]' };
            } else if (item.type === 'orphan') {
                jsonObj = { marker: item.target.marker, source: null, target: item.target.text };
            }
            
            pairDiv.innerHTML = `
                <div class="json">${this.formatJSON(jsonObj)}</div>
                <div class="meta">Status: ${item.type.toUpperCase()}</div>
            `;
            batchDiv.appendChild(pairDiv);
        });
        this.displayElement.appendChild(batchDiv);
    }

    formatJSON(obj) {
        if (!obj) return '<span class="json-null">null</span>';
        const jsonStr = JSON.stringify(obj, null, 2);
        return jsonStr
            .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
            .replace(/: "((?:[^"\\]|\\.)*)"/g, (match, p1) => ': <span class="json-string">"' + p1.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"</span>')
            .replace(/: null/g, ': <span class="json-null">null</span>')
            .replace(/\n/g, '<br>')
            .replace(/ /g, '&nbsp;');
    }
}
