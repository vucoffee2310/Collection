import { CONFIG } from "../config.js";
import {
  parsePageSpec,
  formatPageList,
  validateRange,
  withErrorHandling,
  forceUIUpdate,
} from "../utils.js";
import { PDFRenderer } from "../renderers/PDFRenderer.js";

export class PDFExporter {
  constructor(pdf) {
    this.pdf = pdf;
    this.renderer = new PDFRenderer();
  }

  async _canvasToDataURL(canvas) {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Canvas to Blob failed")),
        "image/jpeg",
        0.92,
      );
    });

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async _preparePage(wrapper, pageNum) {
    let canvas = wrapper.querySelector("canvas");
    if (!canvas) {
      await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
      canvas = wrapper.querySelector("canvas");
    }

    const imageData = await this._canvasToDataURL(canvas);
    const overlays = Array.from(wrapper.querySelectorAll(".overlay"))
      .map((el) => this.renderer.extractOverlay(el, wrapper))
      .filter(Boolean);

    return {
      imageData,
      overlays,
      width: wrapper.clientWidth,
      height: wrapper.clientHeight,
    };
  }

  _addPage(pdf, pageData, isFirst) {
    const { imageData, overlays, width, height } = pageData;

    if (!isFirst) {
      pdf.addPage([width, height], width > height ? "l" : "p");
    }

    pdf.addImage(imageData, "JPEG", 0, 0, width, height);
    this.renderer.drawShapes(pdf, overlays);
    this.renderer.drawText(pdf, overlays);
  }

  async _embedFont(pdf) {
    const embed = async (fontConfig, loader) => {
      if (!fontConfig) return;
      const fontData = await loader();
      if (!fontData) {
        console.warn(
          `Font "${fontConfig.NAME}" not loaded, PDF will use default font.`,
        );
        return;
      }

      try {
        pdf.addFileToVFS(fontConfig.FILE, fontData);
        ["normal", "bold", "italic", "bolditalic"].forEach((style) => {
          pdf.addFont(fontConfig.FILE, fontConfig.NAME, style);
        });
        console.log(`Font "${fontConfig.NAME}" embedded successfully`);
      } catch (e) {
        console.error(`Failed to embed font "${fontConfig.NAME}":`, e);
        alert(`Warning: Could not embed font "${fontConfig.NAME}" in PDF.`);
      }
    };

    await Promise.all([
      embed(CONFIG.FONT, () => this.pdf.loadFont()),
      embed(CONFIG.CODE_FONT, () => this.pdf.loadCodeFont()),
    ]);
  }

  async _createPDF(wrapper) {
    const pdf = new jspdf.jsPDF({
      orientation: wrapper.clientWidth > wrapper.clientHeight ? "l" : "p",
      unit: "pt",
      format: [wrapper.clientWidth, wrapper.clientHeight],
      compress: true,
    });

    await this._embedFont(pdf);
    return pdf;
  }

  async _exportCombined(pageNumbers, filename, indicator) {
    const firstWrapper = document.querySelector(
      `#page-wrapper-${pageNumbers[0]}`,
    );
    const pdf = await this._createPDF(firstWrapper);

    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNum = pageNumbers[i];
      indicator.textContent = `Processing page ${pageNum} (${i + 1}/${pageNumbers.length})...`;

      const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
      if (wrapper) {
        const pageData = await this._preparePage(wrapper, pageNum);
        this._addPage(pdf, pageData, i === 0);
      }

      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    indicator.textContent = "Saving PDF...";
    pdf.save(filename);
  }

  async _exportMultiple(pageNumbers, filenameBase, groupSize, indicator) {
    const totalGroups = Math.ceil(pageNumbers.length / groupSize);

    for (let i = 0; i < pageNumbers.length; i += groupSize) {
      const group = pageNumbers.slice(i, i + groupSize);
      const groupIndex = Math.floor(i / groupSize) + 1;
      const [startPage, endPage] = [group[0], group[group.length - 1]];

      indicator.textContent = `Creating file ${groupIndex}/${totalGroups} (pages ${startPage}-${endPage})...`;

      const firstWrapper = document.querySelector(`#page-wrapper-${startPage}`);
      const pdf = await this._createPDF(firstWrapper);

      for (let j = 0; j < group.length; j++) {
        const wrapper = document.querySelector(`#page-wrapper-${group[j]}`);
        if (wrapper) {
          const pageData = await this._preparePage(wrapper, group[j]);
          this._addPage(pdf, pageData, j === 0);
        }
      }

      const filename =
        groupSize === 1
          ? `${filenameBase}_page_${String(startPage).padStart(3, "0")}.pdf`
          : `${filenameBase}_pages_${String(startPage).padStart(3, "0")}_to_${String(endPage).padStart(3, "0")}.pdf`;

      pdf.save(filename);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  async _export({ pageNumbers, filename, strategy, groupSize }, ui) {
    return withErrorHandling(async () => {
      const indicator = ui.showSavingIndicator("Preparing export...");
      await forceUIUpdate();

      try {
        if (strategy === "combined") {
          await this._exportCombined(pageNumbers, filename, indicator);
        } else {
          await this._exportMultiple(
            pageNumbers,
            filename,
            groupSize,
            indicator,
          );
        }
      } finally {
        ui.removeSavingIndicator(indicator);
      }
    }, "Export failed");
  }

  async save(name, ui) {
    const total = document.querySelectorAll(
      ".page-wrapper:not(.page-placeholder)",
    ).length;
    return this._export(
      {
        pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
        filename: `${name}_export.pdf`,
        strategy: "combined",
      },
      ui,
    );
  }

  async saveSinglePage(pageNum, name, ui) {
    return this._export(
      {
        pageNumbers: [pageNum],
        filename: `${name}_page_${String(pageNum).padStart(3, "0")}.pdf`,
        strategy: "combined",
      },
      ui,
    );
  }

  async splitPDF(name, ui) {
    const total = document.querySelectorAll(
      ".page-wrapper:not(.page-placeholder)",
    ).length;

    if (
      !confirm(
        `Split ${total} pages into individual files?\n\nThis will download ${total} separate PDFs.\n\nContinue?`,
      )
    )
      return;

    return this._export(
      {
        pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
        filename: name,
        strategy: "multiple",
        groupSize: 1,
      },
      ui,
    );
  }

  async splitByNumberOfFiles(numFiles, name, ui) {
    const total = document.querySelectorAll(
      ".page-wrapper:not(.page-placeholder)",
    ).length;
    const pagesPerFile = Math.ceil(total / numFiles);

    if (
      !confirm(
        `Split ${total} pages into ${numFiles} files?\n\nEach file will contain ~${pagesPerFile} pages.\n\nContinue?`,
      )
    )
      return;

    return this._export(
      {
        pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
        filename: name,
        strategy: "multiple",
        groupSize: pagesPerFile,
      },
      ui,
    );
  }

  async splitByPagesPerFile(pagesPerFile, name, ui) {
    const total = document.querySelectorAll(
      ".page-wrapper:not(.page-placeholder)",
    ).length;
    const numFiles = Math.ceil(total / pagesPerFile);

    if (
      !confirm(
        `Split into groups of ${pagesPerFile} pages?\n\nThis will create ${numFiles} files.\n\nContinue?`,
      )
    )
      return;

    return this._export(
      {
        pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
        filename: name,
        strategy: "multiple",
        groupSize: pagesPerFile,
      },
      ui,
    );
  }

  async exportPageRange(start, end, name, ui) {
    if (start > end) {
      alert("Start page must be ≤ end page");
      return;
    }

    return this._export(
      {
        pageNumbers: Array.from(
          { length: end - start + 1 },
          (_, i) => start + i,
        ),
        filename: `${name}_pages_${String(start).padStart(3, "0")}_to_${String(end).padStart(3, "0")}.pdf`,
        strategy: "combined",
      },
      ui,
    );
  }

  async exportSpecificPages(pageSpec, name, ui) {
    const total = document.querySelectorAll(
      ".page-wrapper:not(.page-placeholder)",
    ).length;
    const pageNumbers = parsePageSpec(pageSpec, total);

    if (!pageNumbers.length) {
      alert(
        'Invalid page specification.\n\nExamples:\n• "1,5,10"\n• "1-5,10,15-20"',
      );
      return;
    }

    if (
      !confirm(
        `Export ${pageNumbers.length} specific pages?\n\nPages: ${formatPageList(pageNumbers)}\n\nContinue?`,
      )
    )
      return;

    const filename =
      pageNumbers.length === 1
        ? `${name}_page_${String(pageNumbers[0]).padStart(3, "0")}.pdf`
        : `${name}_selected_${pageNumbers.length}_pages.pdf`;

    return this._export(
      {
        pageNumbers,
        filename,
        strategy: "combined",
      },
      ui,
    );
  }
}