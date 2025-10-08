import { CONFIG } from '../config.js';
import * as Utils from '../utils.js';

export class OverlayRenderer {
    constructor(state, fontCalc) {
        this.state = state;
        this.fontCalc = fontCalc;
    }
    
    renderPageOverlays(wrapper, page, dims, data) {
        const pd = data[`page_${page}`];
        if (!pd) return;

        // Remove old overlays
        wrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        
        const coordOrder = this.state.getPageCoordinateOrder(page);
        
        // Create all overlays in a document fragment (batch DOM operations)
        const frag = document.createDocumentFragment();
        const overlaysToCalculate = [];
        
        Object.keys(pd).forEach(coords => {
            const overlay = this._create(coords, pd[coords], page, dims.width, dims.height, coordOrder);
            frag.appendChild(overlay);
            overlaysToCalculate.push(overlay);
        });
        
        // Single DOM append operation
        wrapper.appendChild(frag);
        
        // Batch font size calculations
        Utils.batchDOMUpdates(() => {
            overlaysToCalculate.forEach(overlay => {
                this.fontCalc.calculateOptimalSize(overlay);
            });
        });
    }
    
    _create(coords, info, page, W, H, coordOrder) {
        if (W <= 0 || H <= 0) return document.createElement('div');

        const pos = Utils.calculateOverlayPosition({ 
            coords, 
            containerWidth: W, 
            containerHeight: H, 
            minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
            coordOrder 
        });

        const ov = document.createElement('div');
        ov.className = 'overlay';
        ov.dataset.coords = coords;
        ov.dataset.pageNum = page;
        
        if (pos.width > 0 && (pos.height / pos.width) > CONFIG.OVERLAY.VERTICAL_THRESHOLD) ov.classList.add('vertical-text');
        if (!info.text.includes('<div') && !info.text.includes('\n')) ov.classList.add('single-line-layout');

        Object.assign(ov.style, {
            left: Utils.toPercent(pos.left, W),
            top: Utils.toPercent(pos.top, H),
            width: Utils.toPercent(pos.width, W),
            height: Utils.toPercent(pos.height, H)
        });
        
        const txt = document.createElement('span');
        txt.className = 'overlay-text';
        txt.contentEditable = true;
        if (info.text.includes('<div')) {
            txt.innerHTML = info.text;
        } else {
            txt.textContent = info.text;
        }
        
        // Debounce text updates
        const debouncedUpdate = Utils.debounce((e) => {
            const o = e.target.closest('.overlay');
            if (!o) return;
            const newTxt = e.target.querySelector('.merged-text-block') ? e.target.innerHTML : e.target.innerText;
            this.state.updateOverlayText(o.dataset.pageNum, o.dataset.coords, newTxt);
            this.fontCalc.calculateOptimalSize(o);
        }, 300);
        
        txt.addEventListener('blur', debouncedUpdate);

        const del = document.createElement('button');
        del.className = 'delete-overlay-btn';
        del.innerHTML = '&times;';
        del.title = 'Delete this overlay';
        del.addEventListener('click', (e) => {
            const o = e.target.closest('.overlay');
            if (!o || !confirm('Are you sure you want to delete this overlay?')) return;
            this.state.deleteOverlay(o.dataset.pageNum, o.dataset.coords);
            o.remove();
        });

        ov.append(txt, del);
        
        return ov;
    }
}