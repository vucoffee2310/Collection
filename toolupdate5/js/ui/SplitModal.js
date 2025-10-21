import { parsePageSpec, formatPageList, validateRange } from "../utils.js";

export class SplitModal {
  constructor(pdfExporter, pdfHandler, pageManager) {
    this.pdfExp = pdfExporter;
    this.pdf = pdfHandler;
    this.pageManager = pageManager;
    this.pdfName = "";

    this.modal = document.getElementById("split-modal");
    this._setupEventListeners();
  }

  _setupEventListeners() {
    // Event delegation on modal
    this.modal?.addEventListener("click", (e) => {
      const target = e.target;

      if (target.id === "modal-close" || target.id === "modal-cancel") {
        this.hide();
      } else if (target.id === "modal-export") {
        this.handleExport();
      } else if (target === this.modal) {
        this.hide();
      }
    });

    // Update estimate on any change
    this.modal?.addEventListener("change", () => this.updateEstimate());
    this.modal?.addEventListener("input", () => this.updateEstimate());

    // ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal?.classList.contains("active")) {
        this.hide();
      }
    });
  }

  show(pdfName) {
    this.pdfName = pdfName;
    const totalPages = this.pdf.getNumPages();

    const el = (id) => document.getElementById(id);

    el("modal-total-pages").textContent = totalPages;
    el("num-files").max = totalPages;
    el("pages-per-file").max = totalPages;
    el("range-start").max = totalPages;
    el("range-end").max = totalPages;
    el("range-end").value = totalPages;

    this.updateEstimate();
    this.modal?.classList.add("active");
  }

  hide() {
    this.modal?.classList.remove("active");
  }

  updateEstimate() {
    const mode = document.querySelector(
      'input[name="split-mode"]:checked',
    )?.value;
    const total = this.pdf.getNumPages();
    const el = (id) => document.getElementById(id);

    const estimates = {
      all: () => `${total} PDF files (1 page each)`,

      "by-files": () => {
        const numFiles = parseInt(el("num-files").value || 2);
        const pagesPerFile = Math.ceil(total / numFiles);
        return `${numFiles} PDF files (~${pagesPerFile} pages each)`;
      },

      "by-pages": () => {
        const pagesPerFile = parseInt(el("pages-per-file").value || 10);
        const numFiles = Math.ceil(total / pagesPerFile);
        return `${numFiles} PDF files (${pagesPerFile} pages each)`;
      },

      range: () => {
        const start = parseInt(el("range-start").value || 1);
        const end = parseInt(el("range-end").value || total);
        const validation = validateRange(start, end, total);

        if (!validation.valid) return validation.error;
        return `1 PDF file (${end - start + 1} pages)`;
      },

      custom: () => {
        const spec = el("custom-pages").value || "";
        const pages = parsePageSpec(spec, total);

        if (!pages.length) return "Enter page numbers";
        return `1 PDF file (${pages.length} pages)`;
      },
    };

    el("modal-estimate").textContent = estimates[mode]?.() || "-";
  }

  async handleExport() {
    const mode = document.querySelector(
      'input[name="split-mode"]:checked',
    )?.value;
    if (!mode) {
      alert("Please select a split mode");
      return;
    }

    this.hide();

    const el = (id) => document.getElementById(id);

    const actions = {
      all: () => this.pdfExp.splitPDF(this.pdfName, this.pageManager),
      "by-files": () =>
        this.pdfExp.splitByNumberOfFiles(
          parseInt(el("num-files").value || 2),
          this.pdfName,
          this.pageManager,
        ),
      "by-pages": () =>
        this.pdfExp.splitByPagesPerFile(
          parseInt(el("pages-per-file").value || 10),
          this.pdfName,
          this.pageManager,
        ),
      range: () =>
        this.pdfExp.exportPageRange(
          parseInt(el("range-start").value || 1),
          parseInt(el("range-end").value || 1),
          this.pdfName,
          this.pageManager,
        ),
      custom: () =>
        this.pdfExp.exportSpecificPages(
          el("custom-pages").value || "",
          this.pdfName,
          this.pageManager,
        ),
    };

    try {
      await actions[mode]?.();
    } catch (e) {
      console.error("Export error:", e);
      alert(`Export failed: ${e.message}`);
    }
  }
}
