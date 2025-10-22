export class PageManager {
  constructor() {
    this.container = document.querySelector("#pdf-container");
  }

  showLoading(msg) {
    if (this.container) {
      this.container.innerHTML = `<div class="loading">${msg}</div>`;
    }
  }

  updatePageInfo(msg) {
    const el = document.getElementById("page-info");
    if (el) el.textContent = msg;
  }

  updateFileName(el, name, def) {
    if (el) el.textContent = name || def;
  }

  clearContainer() {
    if (this.container) this.container.innerHTML = "";
  }

  createPageWrapper(n, vp) {
    const wrapper = document.createElement("div");
    wrapper.className = "page-wrapper page-placeholder";
    wrapper.id = `page-wrapper-${n}`;
    wrapper.dataset.pageNum = n;
    wrapper.style.aspectRatio = `${vp.width} / ${vp.height}`;
    wrapper.innerHTML = `
      <span>Loading page ${n}...</span>
      <div class="page-export-controls">
        <button class="page-export-btn" data-page="${n}" title="Export page ${n}">💾 Save Page ${n}</button>
      </div>
    `;

    wrapper.addEventListener("click", (e) => {
      if (e.target.classList.contains("page-export-btn")) {
        e.stopPropagation();
        document.dispatchEvent(
          new CustomEvent("exportSinglePage", {
            detail: { pageNum: parseInt(e.target.dataset.page) },
          }),
        );
      }
    });

    this.container?.appendChild(wrapper);
    return wrapper;
  }

  showSavingIndicator(msg = "Processing...") {
    const indicator = document.createElement("div");
    indicator.className = "saving-indicator active";
    indicator.innerHTML = `
      <div class="saving-content">
        <div class="saving-spinner"></div>
        <div class="saving-message">${msg}</div>
      </div>
    `;

    document.body.appendChild(indicator);
    indicator.offsetHeight;

    return indicator;
  }

  removeSavingIndicator(indicator) {
    if (indicator) {
      indicator.classList.remove("active");
      setTimeout(() => indicator.remove(), 200);
    }
  }
}