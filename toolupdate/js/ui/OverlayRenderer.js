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

        const frag = document.createDocumentFragment();
        wrapper.querySelectorAll('.overlay').forEach(el => el.remove());
        
        Object.keys(pd).forEach(coords => {
            frag.appendChild(this._create(coords, pd[coords], page, dims.width, dims.height));
        });
        wrapper.appendChild(frag);
    }
    
    _create(coords, info, page, W, H) {
        if (W <= 0 || H <= 0) return document.createElement('div');

        const pos = Utils.calculateOverlayPosition({ coords, containerWidth: W, containerHeight: H, minHeight: CONFIG.OVERLAY.MIN_HEIGHT });

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
        txt.addEventListener('blur', (e) => {
            const o = e.target.closest('.overlay');
            if (!o) return;
            const newTxt = e.target.querySelector('.merged-text-block') ? e.target.innerHTML : e.target.innerText;
            this.state.updateOverlayText(o.dataset.pageNum, o.dataset.coords, newTxt);
            this.fontCalc.calculateOptimalSize(o);
        });

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
        requestAnimationFrame(() => this.fontCalc.calculateOptimalSize(ov));
        
        return ov;
    }
}