import { CONFIG } from "../config.js";
import { toPx } from "../utils.js";

export class TableLayout {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 500;
    this.measureCanvas = null;
    this.measureCtx = null;
  }

  clearCache() {
    this.cache.clear();
  }

  _initMeasureCanvas() {
    if (!this.measureCanvas) {
      this.measureCanvas = document.createElement("canvas");
      this.measureCtx = this.measureCanvas.getContext("2d");
    }
  }

    optimizeTable(overlay) {
    const box = overlay.querySelector(".overlay-text");
    const table = box?.querySelector(".data-table");
    if (!box || !table) return;

    box.style.lineHeight = "1.25";

    // ✅ Use FULL container dimensions (no padding deduction)
    const W = box.clientWidth;
    const H = parseFloat(overlay.dataset.targetHeight) || overlay.clientHeight;
    
    if (W <= 0 || H <= 0) return;

    // Parse table structure
    const data = this._parseTableData(table);
    const { cells, rows, cols } = data;

    // Cache key
    const contentHash = JSON.stringify(cells).length;
    const key = `table:${W | 0}x${H | 0}:${rows}x${cols}:${contentHash}`;

    let solution;
    if (this.cache.has(key)) {
        solution = this.cache.get(key);
    } else {
        // JOINT OPTIMIZATION - using FULL space
        solution = this._optimizeTableLayout({
        cells,
        rows,
        cols,
        totalWidth: W,   // ✅ Full width
        totalHeight: H,  // ✅ Full height
        minFontSize: CONFIG.OVERLAY.MIN_FONT_SIZE,
        maxFontSize: CONFIG.OVERLAY.MAX_FONT_SIZE,
        cellPadding: 4,  // ✅ Reduced padding = more space for text
        borderWidth: 1,
        });

        if (this.cache.size >= this.maxCacheSize) {
        this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, solution);
    }

    // Apply solution
    this._applyTableLayout(table, box, solution, cells);
    }

  _parseTableData(table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const cells = rows.map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) => {
        const html = cell.innerHTML.trim();
        const withNewlines = html.replace(/<br\s*\/?>/gi, "\n");
        const temp = document.createElement("div");
        temp.innerHTML = withNewlines;
        return {
          text: temp.textContent || "",
          isHeader: cell.tagName === "TH",
        };
      })
    );

    return {
      cells,
      rows: cells.length,
      cols: Math.max(0, ...cells.map((r) => r.length)),
    };
  }

  _optimizeTableLayout({
    cells,
    rows,
    cols,
    totalWidth,
    totalHeight,
    minFontSize,
    maxFontSize,
    cellPadding,
    borderWidth,
  }) {
    this._initMeasureCanvas();

    const availWidth = totalWidth - (cols + 1) * borderWidth;
    const availHeight = totalHeight - (rows + 1) * borderWidth;

    const totalChars = cells.flat().reduce((sum, c) => sum + c.text.length, 1);
    let fontSize = Math.max(
      minFontSize,
      Math.min(maxFontSize, Math.sqrt((availWidth * availHeight) / totalChars) * 1.2)
    );

    let colWidths = this._calculateInitialColWidths(cells, cols, availWidth);
    const uniformRowHeight = availHeight / rows;

    const MAX_ITERATIONS = 15;
    let bestSolution = null;
    let bestFontSize = minFontSize;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const measurements = this._measureAllCells(
        cells,
        fontSize,
        colWidths,
        uniformRowHeight,
        cellPadding
      );

      const fits = this._checkTableFit(measurements, colWidths, uniformRowHeight);

      if (fits) {
        if (fontSize > bestFontSize) {
          bestFontSize = fontSize;
          bestSolution = {
            fontSize,
            colWidths: [...colWidths],
            rowHeight: uniformRowHeight,
          };
        }

        const nextSize = Math.min(maxFontSize, fontSize * 1.1);
        if (nextSize === fontSize) break;
        fontSize = nextSize;
      } else {
        const reducedSize = fontSize * 0.9;
        if (reducedSize >= minFontSize) {
          fontSize = reducedSize;
          continue;
        }

        const improved = this._redistributeColumns(
          colWidths,
          measurements,
          availWidth
        );

        if (improved) {
          continue;
        } else {
          break;
        }
      }
    }

    return (
      bestSolution || {
        fontSize: minFontSize,
        colWidths: colWidths,
        rowHeight: uniformRowHeight,
      }
    );
  }

  _calculateInitialColWidths(cells, cols, availWidth) {
    const colScores = new Array(cols).fill(0);

    cells.forEach((row) => {
      row.forEach((cell, colIdx) => {
        const lines = cell.text.split(/\r?\n/);
        const maxLineLength = Math.max(...lines.map((line) => line.trim().length), 1);
        const boost = cell.isHeader ? 1.15 : 1.0;
        const score = maxLineLength * boost;
        colScores[colIdx] = Math.max(colScores[colIdx], score);
      });
    });

    const weights = colScores.map((score) => Math.sqrt(score) + 0.1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const minColPercent = Math.max(100 / (cols * 2.5), 8);
    const maxColPercent = 60;

    let percentages = weights.map((w) => (w / totalWeight) * 100);

    const fixed = new Set();
    let fixedTotal = 0;
    percentages.forEach((pct, i) => {
      if (pct < minColPercent) {
        percentages[i] = minColPercent;
        fixed.add(i);
        fixedTotal += minColPercent;
      }
    });

    const remaining = 100 - fixedTotal;
    if (remaining > 0) {
      const freeIndices = percentages
        .map((_, i) => i)
        .filter((i) => !fixed.has(i));
      const freeTotal = freeIndices.reduce((sum, i) => sum + weights[i], 0);

      if (freeTotal > 0) {
        freeIndices.forEach((i) => {
          percentages[i] = remaining * (weights[i] / freeTotal);
        });
      }
    }

    let excess = 0;
    const flexible = [];
    percentages.forEach((pct, i) => {
      if (pct > maxColPercent) {
        excess += pct - maxColPercent;
        percentages[i] = maxColPercent;
      } else if (!fixed.has(i)) {
        flexible.push(i);
      }
    });

    if (excess > 0 && flexible.length > 0) {
      const headroom = flexible.map((i) => maxColPercent - percentages[i]);
      const totalHeadroom = headroom.reduce((sum, h) => sum + h, 0);
      
      if (totalHeadroom > 0) {
        flexible.forEach((i, idx) => {
          percentages[i] += excess * (headroom[idx] / totalHeadroom);
        });
      }
    }

    const total = percentages.reduce((sum, p) => sum + p, 0);
    percentages = percentages.map((p) => (p / total) * 100);

    return percentages.map((pct) => (availWidth * pct) / 100);
  }

  _measureAllCells(cells, fontSize, colWidths, rowHeight, padding) {
    const measurements = [];

    cells.forEach((row) => {
      const rowMeasurements = [];
      row.forEach((cell, colIdx) => {
        const availWidth = colWidths[colIdx] - 2 * padding;
        const availHeight = rowHeight - 2 * padding;

        const measurement = this._measureCellText(
          cell.text,
          fontSize,
          availWidth,
          availHeight,
          cell.isHeader
        );

        rowMeasurements.push(measurement);
      });
      measurements.push(rowMeasurements);
    });

    return measurements;
  }

  _measureCellText(text, fontSize, availWidth, availHeight, isHeader) {
    const ctx = this.measureCtx;
    const fontWeight = isHeader ? "bold" : "normal";
    ctx.font = `${fontWeight} ${fontSize}px "${CONFIG.FONT.NAME}", sans-serif`;

    const lines = text.split(/\r?\n/);
    const wrappedLines = [];
    const wrapStrategy = isHeader ? "aggressive" : "conservative";

    lines.forEach((line) => {
      if (!line.trim()) {
        wrappedLines.push("");
        return;
      }

      if (wrapStrategy === "aggressive") {
        const words = line.split(" ");
        let currentLine = "";

        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);

          if (metrics.width <= availWidth * 0.9) {
            currentLine = testLine;
          } else {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
          }
        });

        if (currentLine) wrappedLines.push(currentLine);
      } else {
        const words = line.split(" ");
        let currentLine = "";

        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);

          if (metrics.width <= availWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
          }
        });

        if (currentLine) wrappedLines.push(currentLine);
      }
    });

    const lineHeight = fontSize * 1.25;
    const maxWidth = Math.max(
      ...wrappedLines.map((line) => ctx.measureText(line).width),
      0
    );
    const totalHeight = wrappedLines.length * lineHeight;
    const heightTolerance = isHeader ? 1.5 : 1.0;

    return {
      wrappedLines,
      actualWidth: maxWidth,
      actualHeight: totalHeight,
      fitsWidth: maxWidth <= availWidth,
      fitsHeight: totalHeight <= availHeight * heightTolerance,
      utilization: (maxWidth / availWidth) * (totalHeight / (availHeight * heightTolerance)),
      isHeader,
      lineCount: wrappedLines.length,
    };
  }

  _checkTableFit(measurements) {
    return measurements.every((row) =>
      row.every((cell) => cell.fitsWidth && cell.fitsHeight)
    );
  }

  _redistributeColumns(colWidths, measurements, totalWidth) {
    const colUsage = colWidths.map((width, colIdx) => {
      const cells = measurements.map((row) => row[colIdx]);
      const avgUtilization =
        cells.reduce((sum, cell) => sum + cell.utilization, 0) / cells.length;
      const maxWidth = Math.max(...cells.map((cell) => cell.actualWidth));
      const needsMore = cells.some((cell) => !cell.fitsWidth);

      return {
        index: colIdx,
        currentWidth: width,
        avgUtilization,
        maxWidth,
        needsMore,
      };
    });

    const underutilized = colUsage.filter(
      (col) => col.avgUtilization < 0.6 && !col.needsMore
    );
    const needsMore = colUsage.filter((col) => col.needsMore);

    if (underutilized.length === 0 || needsMore.length === 0) {
      return false;
    }

    const totalWasted = underutilized.reduce(
      (sum, col) => sum + col.currentWidth * (1 - col.avgUtilization) * 0.5,
      0
    );

    const totalNeeded = needsMore.reduce(
      (sum, col) => sum + (col.maxWidth - col.currentWidth),
      0
    );

    const redistributeAmount = Math.min(totalWasted, totalNeeded);

    underutilized.forEach((col) => {
      const reduction =
        (col.currentWidth * (1 - col.avgUtilization) * 0.5 * redistributeAmount) /
        totalWasted;
      colWidths[col.index] -= reduction;
    });

    needsMore.forEach((col) => {
      const addition =
        ((col.maxWidth - col.currentWidth) * redistributeAmount) / totalNeeded;
      colWidths[col.index] += addition;
    });

    return true;
  }

  _applyTableLayout(table, box, solution, cells) {
    const { fontSize, colWidths, rowHeight } = solution;

    box.style.fontSize = toPx(fontSize);

    let colgroup = table.querySelector("colgroup");
    if (!colgroup) {
      colgroup = document.createElement("colgroup");
      table.insertBefore(colgroup, table.firstChild);
    }

    const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);

    while (colgroup.children.length < colWidths.length) {
      colgroup.appendChild(document.createElement("col"));
    }
    while (colgroup.children.length > colWidths.length) {
      colgroup.removeChild(colgroup.lastChild);
    }

    colWidths.forEach((width, i) => {
      const percentage = (width / totalWidth) * 100;
      colgroup.children[i].style.width = `${percentage.toFixed(4)}%`;
    });

    const rows = table.querySelectorAll("tr");
    rows.forEach((row) => {
      row.style.height = toPx(rowHeight);
      Array.from(row.children).forEach((cell) => {
        cell.style.height = toPx(rowHeight);
      });
    });

    table.offsetHeight;

    this._scaleTableCells(table, cells, fontSize, colWidths, rowHeight);
  }

    _scaleTableCells(table, cellsData, baseFontSize, colWidths, rowHeight) {
    const MAX_SCALE_HEADER = 2.0;
    const MAX_SCALE_DATA = 2.5;
    const MIN_SCALE = 1.0;
    const PADDING = 4;  // ✅ FIXED: Changed from 8 to 4

    const rows = table.querySelectorAll("tr");
    
    rows.forEach((row, rowIdx) => {
        const cellElements = Array.from(row.querySelectorAll("th, td"));
        
        cellElements.forEach((cellEl, colIdx) => {
        const cellData = cellsData[rowIdx]?.[colIdx];
        if (!cellData) return;

        const isHeader = cellEl.tagName === "TH";
        const MAX_SCALE = isHeader ? MAX_SCALE_HEADER : MAX_SCALE_DATA;

        const availWidth = colWidths[colIdx] - 2 * PADDING;
        const availHeight = rowHeight - 2 * PADDING;

        if (availWidth <= 0 || availHeight <= 0) return;

        // Create or get wrapper
        let wrapper = cellEl.querySelector(".cell-scaler");
        if (!wrapper) {
            wrapper = document.createElement("span");
            wrapper.className = "cell-scaler";
            
            while (cellEl.firstChild) {
            wrapper.appendChild(cellEl.firstChild);
            }
            cellEl.appendChild(wrapper);
        }

        // Setup wrapper styles
        wrapper.style.display = "inline-block";
        wrapper.style.transformOrigin = "top left";
        wrapper.style.lineHeight = "1.25";
        wrapper.style.transform = "scale(1)";
        wrapper.style.fontSize = `${baseFontSize}px`;
        wrapper.style.whiteSpace = "normal";
        wrapper.style.wordBreak = "break-word";
        wrapper.style.overflowWrap = "break-word";
        wrapper.style.maxWidth = `${availWidth}px`;
        wrapper.style.verticalAlign = "middle";
        
        cellEl.style.overflow = "hidden";
        cellEl.style.verticalAlign = "middle";
        
        // Force reflow to get accurate measurements
        cellEl.offsetHeight;
        wrapper.offsetHeight;

        // Skip empty cells
        const textContent = wrapper.textContent?.trim() || "";
        if (!textContent || textContent === "&nbsp;") {
            wrapper.dataset.scale = "1.000";
            return;
        }

        // Measure wrapped content size
        const wrappedWidth = wrapper.offsetWidth;
        const wrappedHeight = wrapper.offsetHeight;

        if (wrappedWidth === 0 || wrappedHeight === 0) {
            wrapper.dataset.scale = "1.000";
            return;
        }

        // Calculate scale
        const scaleX = availWidth / wrappedWidth;
        const scaleY = availHeight / wrappedHeight;
        
        let scale = Math.min(scaleX, scaleY);
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
        
        // Apply safety margin only if scaling up
        if (scale > MIN_SCALE) {
            scale = Math.max(MIN_SCALE, scale * 0.97);
        }

        // Apply scale transform
        wrapper.style.transform = `scale(${scale})`;
        wrapper.dataset.scale = scale.toFixed(3);
        });
    });
    }
}