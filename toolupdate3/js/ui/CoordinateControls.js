import { CONFIG } from '../config.js';

export class CoordinateControls {
    constructor(coordManager) {
        this.coordManager = coordManager;
        this.states = new Map();
    }

    addPageControls(wrapper, pageNum, stateManager, renderCallback) {
        const state = {
            current: '',
            applied: stateManager.getPageCoordinateOrder(pageNum),
            isOverride: stateManager.hasPageOverride(pageNum),
            presetIndex: 0,
            preview: null
        };
        this.states.set(pageNum, state);

        const controls = document.createElement('div');
        controls.className = 'page-coord-controls';
        controls.innerHTML = `
            <button class="coord-cancel-btn" data-page="${pageNum}">×</button>
            <div class="coord-row">
                <span class="coord-row-label">P${pageNum}</span>
                <div class="${state.isOverride ? 'coord-display overridden' : 'coord-display'}" 
                     data-page="${pageNum}">${state.applied}</div>
                <button class="coord-reload-btn" data-page="${pageNum}">↻</button>
            </div>
            <div class="coord-preview-text" data-page="${pageNum}"></div>
            <div class="coord-action-row">
                <button class="coord-action-btn primary" data-page="${pageNum}" data-action="current">Apply</button>
                <button class="coord-action-btn" data-page="${pageNum}" data-action="all">All Pages</button>
            </div>
            <div class="coord-row">
                <span class="coord-row-label">Manual</span>
                <div class="coord-buttons">
                    ${['T', 'L', 'B', 'R'].map(c => 
                        `<button class="coord-btn" data-coord="${c}" data-page="${pageNum}">${c}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        controls.querySelectorAll('.coord-btn').forEach(btn =>
            btn.onclick = () => this._handleManual(btn, pageNum, stateManager, renderCallback));
        
        controls.querySelector('.coord-reload-btn').onclick = () =>
            this._handleReload(pageNum, stateManager, renderCallback);
        
        controls.querySelector('.coord-cancel-btn').onclick = () =>
            this._cancelPreview(pageNum, stateManager, renderCallback);
        
        controls.querySelectorAll('.coord-action-btn').forEach(btn =>
            btn.onclick = () => this._handleApply(btn, pageNum, stateManager, renderCallback));

        wrapper.appendChild(controls);
    }

    _handleReload(pageNum, sm, render) {
        const s = this.states.get(pageNum);
        if (!s) return;

        s.presetIndex = (s.presetIndex + 1) % CONFIG.COORDINATE_ORDERINGS.length;
        const preset = CONFIG.COORDINATE_ORDERINGS[s.presetIndex];
        s.preview = preset.order;

        const preview = document.querySelector(`.coord-preview-text[data-page="${pageNum}"]`);
        if (preview) preview.textContent = preset.name;

        const controls = document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`);
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (controls) controls.classList.add('preview-active');
        if (wrapper) wrapper.classList.add('preview-mode');

        sm.setPageCoordinateOrder(pageNum, preset.order);
        render();
    }

    _cancelPreview(pageNum, sm, render) {
        const s = this.states.get(pageNum);
        if (!s?.preview) return;

        sm.setPageCoordinateOrder(pageNum, s.applied);
        s.preview = null;
        this._clearPreview(pageNum);
        render();
    }

    _handleApply(btn, pageNum, sm, render) {
        const action = btn.dataset.action;
        const s = this.states.get(pageNum);
        if (!s?.preview) return;

        if (action === 'current') {
            this._apply(pageNum, s.preview, sm, render, true);
            this._clearPreview(pageNum);
        } else if (action === 'all' && confirm(`Apply "${s.preview}" to ALL pages?`)) {
            sm.applyCoordinateOrderToAllPages(s.preview);
            sm.setGlobalCoordinateOrder(s.preview);
            document.getElementById('coord-display').textContent = s.preview;
            
            this.states.forEach((state, pNum) => {
                state.applied = s.preview;
                state.isOverride = true;
                const display = document.querySelector(`.coord-display[data-page="${pNum}"]`);
                if (display) {
                    display.textContent = s.preview;
                    display.classList.add('overridden');
                }
                this._clearPreview(pNum);
            });
            
            document.dispatchEvent(new CustomEvent('reloadAllPages'));
        }
    }

    _handleManual(btn, pageNum, sm, render) {
        const letter = btn.dataset.coord;
        const s = this.states.get(pageNum);
        if (!s || s.current.includes(letter)) return;

        s.current += letter;
        const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
        if (display) display.textContent = s.current || '____';
        btn.classList.add('used');

        if (s.current.length === 4) {
            setTimeout(() => this._apply(pageNum, s.current, sm, render, false), 300);
        }
    }

    _apply(pageNum, order, sm, render, isPreview) {
        const s = this.states.get(pageNum);
        if (!s || order.length !== 4) return;

        try {
            if (!this.coordManager.validateCoordinateOrder(order)) {
                throw new Error('Invalid coordinate order');
            }

            const normalized = this.coordManager.normalizeCoordinateOrder(order);
            sm.setPageCoordinateOrder(pageNum, normalized);
            s.applied = normalized;
            s.isOverride = true;

            const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
            if (display) {
                display.textContent = normalized;
                display.classList.add('overridden');
            }

            if (!isPreview) render();
            this._resetManual(pageNum, s);
        } catch (e) {
            alert(`Invalid: ${e.message}`);
            this._resetManual(pageNum, s);
        }
    }

    _resetManual(pageNum, s) {
        s.current = '';
        document.querySelector(`#page-wrapper-${pageNum}`)
            ?.querySelectorAll('.coord-btn').forEach(b => b.classList.remove('used'));
        
        const display = document.querySelector(`.coord-display[data-page="${pageNum}"]`);
        if (display) display.textContent = s.applied;
    }

    _clearPreview(pageNum) {
        const controls = document.querySelector(`#page-wrapper-${pageNum} .page-coord-controls`);
        const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
        if (controls) controls.classList.remove('preview-active');
        if (wrapper) wrapper.classList.remove('preview-mode');
        
        const s = this.states.get(pageNum);
        if (s) s.preview = null;
    }
}