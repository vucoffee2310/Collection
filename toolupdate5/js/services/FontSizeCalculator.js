import { CONFIG } from '../config.js';
import { checkOverflow, toPx } from '../utils.js';

export class FontSizeCalculator {
  constructor(){ this.cache=new Map(); this.maxCacheSize=500; }
  clearCache(){ this.cache.clear(); }

  calculateOptimalSize(overlay){
    const t=overlay.dataset.contentType;
    if(t===CONFIG.CONTENT_TYPES.TABLE) return this._fitTable(overlay);

    const txt=overlay.querySelector('.overlay-text'); if(!txt?.innerHTML.trim()) return;
    const w=overlay.clientWidth,h=parseFloat(overlay.dataset.targetHeight)||overlay.clientHeight; if(w<=0||h<=0) return;

    const key=`${w|0}x${h|0}:${txt.innerHTML.length}`;
    if(this.cache.has(key)){ overlay.style.fontSize=toPx(this.cache.get(key)); overlay.offsetHeight; return; }

    const prev=overlay.style.height; overlay.style.height=toPx(h); overlay.offsetHeight;
    const size=this._fitBlock(txt,overlay,w,h); overlay.style.height=prev; overlay.offsetHeight;

    if(this.cache.size>=this.maxCacheSize)this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key,size); overlay.style.fontSize=toPx(size); overlay.offsetHeight;
  }

  // FLOW TABLE: content-aware cols, binary-fit (even with equal-rows), per-cell exaggeration
  _fitTable(overlay){
    const box=overlay.querySelector('.overlay-text'), table=box?.querySelector('.data-table'); if(!box||!table) return;
    const equalRows = document.getElementById('equal-rows-toggle')?.checked;
    const exaggerate = document.getElementById('exaggeration-toggle')?.checked;

    // Recompute columns from ALL rows each time
    this._autoCols(table);

    // Start clean: no forced heights before measuring
    this._clearRowHeights(table);
    box.style.lineHeight='1.25';

    const w=box.clientWidth,h=parseFloat(overlay.dataset.targetHeight)||overlay.clientHeight; if(w<=0||h<=0) return;
    const rows=table.rows.length, len=(table.textContent||'').length||1;
    const key=`tflow:${w|0}x${h|0}:${rows}:${len}:er${equalRows?1:0}`;

    const fits=(size)=>{
      box.style.fontSize=toPx(size);
      // Apply equal rows during the check if enabled
      if(equalRows) this._equalizeRows(table, box); else this._clearRowHeights(table);
      // Reflow then check overflow
      box.offsetHeight; table.offsetHeight;
      return (box.scrollHeight - box.clientHeight) <= 0.5 && (box.scrollWidth - box.clientWidth) <= 0.5;
    };

    const {MIN_FONT_SIZE:MIN,MAX_FONT_SIZE:MAX}=CONFIG.OVERLAY;

    if(this.cache.has(key)){ box.style.fontSize=toPx(this.cache.get(key)); box.offsetHeight; if(equalRows) this._equalizeRows(table, box); this._exaggerate(table, exaggerate); return; }

    // Binary search (with equal-rows applied inside fits)
    let lo=MIN, hi=MAX;
    // a decent guess to cut iterations
    let guess = Math.max(MIN, Math.min(MAX, Math.sqrt((w*h)/Math.max(len,1))*1.6));
    let best = fits(guess) ? (lo=guess, guess) : (hi=guess, MIN);

    for(let i=0;i<14 && hi-lo>0.5;i++){
      const mid=(lo+hi)/2;
      if(fits(mid)){ best=mid; lo=mid; } else { hi=mid; }
    }
    best=Math.max(MIN,best*0.995);
    box.style.fontSize=toPx(best);
    if(equalRows) this._equalizeRows(table, box); else this._clearRowHeights(table);

    if(this.cache.size>=this.maxCacheSize)this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key,best);

    // Per-cell exaggeration (no row-uniform cap, so short cells can grow)
    this._exaggerate(table, exaggerate);
  }

  // Build/refresh colgroup widths using ALL rows (longest line per column, header gets a tiny boost)
  _autoCols(table){
    const rows=Array.from(table.querySelectorAll('tr')); if(!rows.length) return;
    const cols=Math.max(0,...rows.map(r=>r.children.length)); if(!cols) return;

    const scores=new Array(cols).fill(1), HEAD_BOOST=1.15;
    rows.forEach(r=>{
      Array.from(r.children).forEach((cell,j)=>{
        const raw=(cell.textContent||'').trim();
        const maxLine = raw.split(/\r?\n/).reduce((m,s)=>Math.max(m,s.trim().length),0) || 1;
        scores[j]=Math.max(scores[j], maxLine*(cell.tagName==='TH'?HEAD_BOOST:1));
      });
    });

    const weights=scores.map(s=>Math.sqrt(s)+1e-3), sum=weights.reduce((a,b)=>a+b,0)||1;
    let perc=weights.map(w=>w/sum*100);

    const minPct=Math.max(100/(cols*2.5),6), maxPct=60;
    const fixed=new Set(); let fixedSum=0, base=perc.slice();
    for(let i=0;i<cols;i++){ if(base[i]<minPct){ perc[i]=minPct; fixed.add(i); fixedSum+=minPct; } }
    const remain=Math.max(0,100-fixedSum);
    if(remain===0){ perc=new Array(cols).fill(100/cols); }
    else{
      let freeSum=0; const freeIdx=[];
      for(let i=0;i<cols;i++) if(!fixed.has(i)) { freeIdx.push(i); freeSum+=base[i]; }
      if(!freeIdx.length) perc=new Array(cols).fill(100/cols);
      else freeIdx.forEach(i=>perc[i]=remain*(base[i]/(freeSum||1)));
    }
    let excess=0, flex=[];
    for(let i=0;i<cols;i++){ if(perc[i]>maxPct){ excess+=perc[i]-maxPct; perc[i]=maxPct; } else flex.push(i); }
    if(excess>0 && flex.length){
      const headroom=flex.map(i=>maxPct-perc[i]), hrSum=headroom.reduce((a,b)=>a+b,0)||1;
      flex.forEach((i,k)=>perc[i]+=excess*(headroom[k]/hrSum));
    }
    const norm=100/(perc.reduce((a,b)=>a+b,0)||1); perc=perc.map(p=>p*norm);

    let cg=table.querySelector('colgroup'); if(!cg){ cg=document.createElement('colgroup'); table.insertBefore(cg, table.firstChild); }
    while(cg.children.length<cols) cg.appendChild(document.createElement('col'));
    while(cg.children.length>cols) cg.removeChild(cg.lastChild);
    for(let i=0;i<cols;i++) cg.children[i].style.width=`${perc[i].toFixed(4)}%`;
  }

  _equalizeRows(table, box){
    // Clear first, then set equal heights that fill the overlay height
    this._clearRowHeights(table);
    const trs=Array.from(table.querySelectorAll('tr')); if(!trs.length) return;
    const avail=box.clientHeight; // good enough; collapsed borders are small
    const h=Math.max(1, Math.floor(avail / trs.length));
    trs.forEach(r=>{
      r.style.height=toPx(h);
      Array.from(r.children).forEach(c=>c.style.height=toPx(h));
    });
    table.offsetHeight;
  }
  _clearRowHeights(table){ table.querySelectorAll('tr,th,td').forEach(el=>el.style.height=''); }

  _exaggerate(table, on){
    const MAXS=1.8;
    const cells = table.querySelectorAll('th,td');
    cells.forEach(cell=>{
      let wrap = cell.querySelector('.cell-fit');
      if(!on){
        if(wrap) wrap.style.transform='scale(1)';
        return;
      }
      if(!wrap){ wrap=document.createElement('span'); wrap.className='cell-fit'; while(cell.firstChild) wrap.appendChild(cell.firstChild); cell.appendChild(wrap); }
      const cs=getComputedStyle(cell), padX=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0), padY=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
      const aw=Math.max(0, cell.clientWidth - padX), ah=Math.max(0, cell.clientHeight - padY);
      wrap.style.display='inline-block'; wrap.style.transformOrigin='top left'; wrap.style.transform='scale(1)'; cell.style.overflow='hidden'; wrap.offsetHeight;
      const nw=wrap.offsetWidth||0.001, nh=wrap.offsetHeight||0.001;
      let s = (nw>0 && nh>0 && aw>0 && ah>0) ? Math.min(aw/nw, ah/nh) * 0.995 : 1;
      s = Math.max(1, Math.min(s, MAXS));
      wrap.style.transform=`scale(${s})`; wrap.dataset.scale=String(s);
    });
  }

  // Non-table block fitting
  _fitBlock(txt,cont,w,h){
    const {MIN_FONT_SIZE:MIN,MAX_FONT_SIZE:MAX}=CONFIG.OVERLAY; txt.style.fontSize=''; txt.offsetHeight;
    const len=txt.textContent.length||1; let g=Math.max(MIN,Math.min(MAX,Math.sqrt((w*h)/len)*1.8));
    txt.style.fontSize=toPx(g); txt.offsetHeight;
    if(!checkOverflow(cont,0.5)){const up=Math.min(MAX,g*1.5); txt.style.fontSize=toPx(up); txt.offsetHeight; return checkOverflow(cont,0.5)?this._bin(txt,cont,g,up):up;}
    return this._bin(txt,cont,MIN,g);
  }
  _bin(txt,cont,lo,hi){let best=lo;for(let i=0;i<10&&hi-lo>0.5;i++){const mid=(lo+hi)/2;txt.style.fontSize=toPx(mid);txt.offsetHeight;checkOverflow(cont,0.5)?(hi=mid):(best=lo=mid);} txt.style.fontSize=''; return best;}
}