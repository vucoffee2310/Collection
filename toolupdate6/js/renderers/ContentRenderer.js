import { CONFIG } from "../config.js";
import { escapeHtml } from "../utils.js";

export class ContentRenderer {
  formatContent(info) {
    const { text, type } = info;

    const formatters = {
      [CONFIG.CONTENT_TYPES.CODE]: () => this.formatCode(text),
      [CONFIG.CONTENT_TYPES.LIST]: () => this.formatList(text),
      [CONFIG.CONTENT_TYPES.TABLE]: () => this.formatTable(text, info.tableData),
      [CONFIG.CONTENT_TYPES.IMAGE]: () => this.formatImage(),
      [CONFIG.CONTENT_TYPES.TEXT]: () => this.formatText(text),
    };

    return (formatters[type] || formatters[CONFIG.CONTENT_TYPES.TEXT])();
  }

  formatCode(text) {
    return escapeHtml(text || "");
  }

  formatList(text) {
    if (text.includes('<div class="list-item">')) {
      return text;
    }

    return text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => `<div class="list-item">${escapeHtml(l)}</div>`)
      .join("");
  }

  formatTable(text, tableData) {
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
    const scores = new Array(cols).fill(1);
    const HEAD_BOOST = 1.15;

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
      const minPct = Math.max(100 / (cols * 2.5), 6);
      const maxPct = 60;
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
        for (let i = 0; i < cols; i++) {
          if (!fixed.has(i)) {
            freeIdx.push(i);
            freeSum += base[i];
          }
        }
        if (!freeIdx.length) {
          p = new Array(cols).fill(100 / cols);
        } else {
          freeIdx.forEach((i) => (p[i] = remain * (base[i] / (freeSum || 1))));
        }
      }

      let excess = 0;
      const flex = [];
      for (let i = 0; i < cols; i++) {
        if (p[i] > maxPct) {
          excess += p[i] - maxPct;
          p[i] = maxPct;
        } else flex.push(i);
      }

      if (excess > 0 && flex.length) {
        const headroom = flex.map((i) => maxPct - p[i]);
        const sumH = headroom.reduce((a, b) => a + b, 0) || 1;
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

    return `<table class="data-table">${colgroup}${head}${body}</table>`;
  }

  formatImage() {
    return '<div class="image-placeholder">[Image]</div>';
  }

  formatText(text) {
    if (text.includes('<div class="merged-text-block">')) {
      return text;
    }
    return escapeHtml(text || "");
  }

  extractTableToJSON(root) {
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