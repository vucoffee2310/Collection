import { CONFIG } from "../config.js";
import {
  calculateOverlayPosition,
  toPx,
  debounce,
  escapeHtml,
} from "../utils.js";

export class OverlayRenderer {
  constructor(state, fontCalc) {
    this.state = state;
    this.fontCalc = fontCalc;
  }

  renderPageOverlays(wrapper, page, dims, data) {
    const pageData = data[`page_${page}`];
    if (!pageData) return;
    wrapper.querySelectorAll(".overlay").forEach((el) => el.remove());

    const coordOrder = this.state.getPageCoordinateOrder(page);
    const frag = document.createDocumentFragment();
    const queue = [];

    Object.entries(pageData).forEach(([coords, info]) => {
      const overlay = this._createOverlay(coords, info, page, dims, coordOrder);
      frag.appendChild(overlay);
      if (
        [
          CONFIG.CONTENT_TYPES.TEXT,
          CONFIG.CONTENT_TYPES.LIST,
          CONFIG.CONTENT_TYPES.CODE,
          CONFIG.CONTENT_TYPES.TABLE,
        ].includes(info.type)
      ) {
        queue.push(overlay);
      }
    });

    wrapper.appendChild(frag);
    requestAnimationFrame(() =>
      queue.forEach((o) => this.fontCalc.calculateOptimalSize(o)),
    );
  }

  _createOverlay(coords, info, page, dims, coordOrder) {
    const pos = calculateOverlayPosition({
      coords,
      containerWidth: dims.width,
      containerHeight: dims.height,
      minHeight: CONFIG.OVERLAY.MIN_HEIGHT,
      coordOrder,
    });

    const type = info.type || CONFIG.CONTENT_TYPES.TEXT;
    const isVertical =
      type === CONFIG.CONTENT_TYPES.TEXT &&
      pos.width > 0 &&
      pos.height / pos.width > CONFIG.OVERLAY.VERTICAL_THRESHOLD;
    const isSingle =
      type === CONFIG.CONTENT_TYPES.TEXT &&
      !info.text.includes("<div") &&
      !info.text.includes("\n");

    const overlay = document.createElement("div");
    Object.assign(overlay.dataset, {
      coords,
      pageNum: page,
      targetHeight: pos.height,
      contentType: type,
    });
    overlay.className = [
      "overlay",
      `content-${type}`,
      isVertical ? "vertical-text" : "",
      isSingle ? "single-line-layout" : "",
    ]
      .filter(Boolean)
      .join(" ");
    overlay.style.cssText = `left:${toPx(pos.left)};top:${toPx(pos.top)};width:${toPx(pos.width)};height:${type === CONFIG.CONTENT_TYPES.TABLE ? toPx(pos.height) : "fit-content"}`;

    const txt = this._createTextElement(info, pos);
    const del = this._createDeleteButton();
    overlay.append(txt, del);
    return overlay;
  }

  _createTextElement(info) {
    const txt = document.createElement("div");
    txt.className = "overlay-text";
    txt.contentEditable = info.type !== CONFIG.CONTENT_TYPES.IMAGE;
    txt.innerHTML = this._formatContent(info);

    txt.addEventListener(
      "blur",
      debounce((e) => {
        const overlay = e.target.closest(".overlay");
        if (!overlay) return;
        const t = overlay.dataset.contentType;
        let val;
        if (t === CONFIG.CONTENT_TYPES.TABLE)
          val = this._extractTableToJSON(e.target);
        else if (t === CONFIG.CONTENT_TYPES.CODE) val = e.target.textContent;
        else if (e.target.querySelector(".merged-text-block"))
          val = e.target.innerHTML;
        else val = e.target.innerText;
        this.state.updateOverlayText(
          overlay.dataset.pageNum,
          overlay.dataset.coords,
          val,
        );
        if (
          [
            CONFIG.CONTENT_TYPES.TEXT,
            CONFIG.CONTENT_TYPES.LIST,
            CONFIG.CONTENT_TYPES.CODE,
            CONFIG.CONTENT_TYPES.TABLE,
          ].includes(t)
        ) {
          this.fontCalc.calculateOptimalSize(overlay);
        }
      }, 500),
    );

    return txt;
  }

  _createDeleteButton() {
    const b = document.createElement("button");
    b.className = "delete-overlay-btn";
    b.innerHTML = "&times;";
    b.title = "Delete this overlay";
    b.addEventListener("click", (e) => {
      const overlay = e.target.closest(".overlay");
      if (overlay && confirm("Delete this overlay?")) {
        this.state.deleteOverlay(
          overlay.dataset.pageNum,
          overlay.dataset.coords,
        );
        overlay.remove();
      }
    });
    return b;
  }

  _formatContent(info) {
    const { text, type } = info;
    const map = {
      [CONFIG.CONTENT_TYPES.CODE]: () => escapeHtml(text || ""),
      [CONFIG.CONTENT_TYPES.LIST]: () =>
        text.includes('<div class="list-item">')
          ? text
          : text
              .split("\n")
              .filter((l) => l.trim())
              .map((l) => `<div class="list-item">${escapeHtml(l)}</div>`)
              .join(""),
      [CONFIG.CONTENT_TYPES.TABLE]: () =>
        this._formatTableFlow(text, info.tableData),
      [CONFIG.CONTENT_TYPES.IMAGE]: () =>
        '<div class="image-placeholder">[Image]</div>',
      [CONFIG.CONTENT_TYPES.TEXT]: () =>
        text.includes('<div class="merged-text-block">')
          ? text
          : escapeHtml(text || ""),
    };
    return (map[type] || map[CONFIG.CONTENT_TYPES.TEXT])();
  }

  // Flow table, content-aware columns, wrapped in .table-fit for single global scaling
  _formatTableFlow(text, tableData) {
    let data = tableData;
    if (!data) {
      try {
        data = JSON.parse(text);
      } catch {
        return text;
      }
    }
    if (!Array.isArray(data) || !data.length) return text;

    const rows = data.filter((r) => Array.isArray(r));
    if (!rows.length) return text;
    const cols = Math.max(0, ...rows.map((r) => r.length));
    const scores = new Array(cols).fill(1),
      HEAD_BOOST = 1.15;

    rows.forEach((r, idx) => {
      for (let j = 0; j < cols; j++) {
        const raw = String(r[j] ?? "");
        const maxLine =
          raw
            .split(/\r?\n/)
            .reduce((m, s) => Math.max(m, s.trim().length), 0) || 1;
        scores[j] = Math.max(scores[j], maxLine * (idx === 0 ? HEAD_BOOST : 1));
      }
    });

    const weights = scores.map((s) => Math.sqrt(s) + 1e-3);
    let perc = (() => {
      const sum = weights.reduce((a, b) => a + b, 0) || 1;
      let p = weights.map((w) => (w / sum) * 100);
      const minPct = Math.max(100 / (cols * 2.5), 6),
        maxPct = 60;
      const fixed = new Set();
      let fixedSum = 0;
      const base = p.slice();

      for (let i = 0; i < cols; i++) {
        if (base[i] < minPct) {
          p[i] = minPct;
          fixed.add(i);
          fixedSum += minPct;
        }
      }
      const remain = Math.max(0, 100 - fixedSum);
      if (remain === 0) {
        p = new Array(cols).fill(100 / cols);
      } else {
        let freeSum = 0;
        const freeIdx = [];
        for (let i = 0; i < cols; i++)
          if (!fixed.has(i)) {
            freeIdx.push(i);
            freeSum += base[i];
          }
        if (!freeIdx.length) p = new Array(cols).fill(100 / cols);
        else
          freeIdx.forEach((i) => (p[i] = remain * (base[i] / (freeSum || 1))));
      }
      let excess = 0,
        flex = [];
      for (let i = 0; i < cols; i++) {
        if (p[i] > maxPct) {
          excess += p[i] - maxPct;
          p[i] = maxPct;
        } else flex.push(i);
      }
      if (excess > 0 && flex.length) {
        const headroom = flex.map((i) => maxPct - p[i]),
          sumH = headroom.reduce((a, b) => a + b, 0) || 1;
        flex.forEach((i, k) => (p[i] += excess * (headroom[k] / sumH)));
      }
      const norm = 100 / (p.reduce((a, b) => a + b, 0) || 1);
      return p.map((x) => x * norm);
    })();

    const colgroup = `<colgroup>${perc.map((p) => `<col style="width:${p.toFixed(4)}%;">`).join("")}</colgroup>`;
    const cell = (tag, c) =>
      `<${tag}>${escapeHtml(String(c ?? "")).replace(/\n/g, "<br>") || "&nbsp;"}</${tag}>`;
    const head = `<thead><tr>${(rows[0] || []).map((c) => cell("th", c)).join("")}</tr></thead>`;
    const body = `<tbody>${rows
      .slice(1)
      .map(
        (r) =>
          `<tr>${Array.from({ length: cols }, (_, j) => cell("td", r[j] ?? "")).join("")}</tr>`,
      )
      .join("")}</tbody>`;

    // Wrap in a scaler so FontSizeCalculator can scale once
    return `<div class="table-fit"><table class="data-table">${colgroup}${head}${body}</table></div>`;
  }

  _extractTableToJSON(root) {
    const t = root.querySelector(".data-table");
    if (!t) return "[]";
    const rows = Array.from(t.querySelectorAll("tr"));
    return JSON.stringify(
      rows.map((r) =>
        Array.from(r.querySelectorAll("th,td")).map((c) => {
          const d = document.createElement("div");
          d.innerHTML = c.innerHTML.trim().replace(/<br\s*\/?>/gi, "\n");
          return d.textContent || "";
        }),
      ),
    );
  }
}
