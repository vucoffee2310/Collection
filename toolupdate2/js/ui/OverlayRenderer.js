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

        const oldOverlays = wrapper.querySelectorAll('.overlay');
        oldOverlays.forEach(el => el.remove());
        
        const coordOrder = this.state.getPageCoordinateOrder(page);
        const entries = Object.entries(pd);
        
        const frag = document.createDocumentFragment();
        const overlaysToCalculate = [];
        
        entries.forEach(([coords, info]) => {
            const overlay = this._createFast(coords, info, page, dims.width, dims.height, coordOrder);
            frag.appendChild(overlay);
            overlaysToCalculate.push(overlay);
        });
        
        wrapper.appendChild(frag);
        
        requestAnimationFrame(() => {
            overlaysToCalculate.forEach(overlay => {
                this.fontCalc.calculateOptimalSize(overlay);
            });
        });
    }
    
    _createFast(coords, info, page, W, H, coordOrder) {
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
        
        const classes = ['overlay'];
        if (pos.width > 0 && (pos.height / pos.width) > CONFIG.OVERLAY.VERTICAL_THRESHOLD) {
            classes.push('vertical-text');
        }
        if (!info.text.includes('<div') && !info.text.includes('\n')) {
            classes.push('single-line-layout');
        }
        ov.className = classes.join(' ');

        ov.style.cssText = `
            left: ${Utils.toPercent(pos.left, W)};
            top: ${Utils.toPercent(pos.top, H)};
            width: ${Utils.toPercent(pos.width, W)};
            height: ${Utils.toPercent(pos.height, H)};
        `;
        
        const txt = document.createElement('span');
        txt.className = 'overlay-text';
        txt.contentEditable = true;
        
        if (info.text.includes('<div')) {
            txt.innerHTML = info.text;
        } else {
            txt.textContent = info.text;
        }
        
        const debouncedUpdate = Utils.debounce((e) => {
            const o = e.target.closest('.overlay');
            if (!o) return;
            const newTxt = e.target.querySelector('.merged-text-block') ? e.target.innerHTML : e.target.innerText;
            this.state.updateOverlayText(o.dataset.pageNum, o.dataset.coords, newTxt);
            this.fontCalc.calculateOptimalSize(o);
        }, 500);
        
        txt.addEventListener('blur', debouncedUpdate);

        const del = document.createElement('button');
        del.className = 'delete-overlay-btn';
        del.innerHTML = '&times;';
        del.title = 'Delete this overlay';
        del.addEventListener('click', (e) => {
            const o = e.target.closest('.overlay');
            if (!o || !confirm('Delete this overlay?')) return;
            this.state.deleteOverlay(o.dataset.pageNum, o.dataset.coords);
            o.remove();
        });

        ov.append(txt, del);
        
        return ov;
    }
}