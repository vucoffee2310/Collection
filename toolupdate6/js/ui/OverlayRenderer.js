import { CONFIG } from "../config.js";
import { calculateOverlayPosition, toPx, debounce } from "../utils.js";
import { ContentRenderer } from "../renderers/ContentRenderer.js";

export class OverlayRenderer {
  constructor(state, fontCalc) {
    this.state = state;
    this.fontCalc = fontCalc;
    this.contentRenderer = new ContentRenderer();
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
    txt.innerHTML = this.contentRenderer.formatContent(info);

    txt.addEventListener(
      "blur",
      debounce((e) => {
        const overlay = e.target.closest(".overlay");
        if (!overlay) return;
        const t = overlay.dataset.contentType;
        let val;
        if (t === CONFIG.CONTENT_TYPES.TABLE)
          val = this.contentRenderer.extractTableToJSON(e.target);
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
}