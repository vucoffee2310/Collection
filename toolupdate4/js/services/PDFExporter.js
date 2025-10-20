import { CONFIG } from '../config.js';
import { parsePageSpec, formatPageList, withErrorHandling, forceUIUpdate } from '../utils.js';

export class PDFExporter {
  constructor(pdf) {
    this.pdf = pdf;
  }
  
  // Helpers
  _rgba = (str) => (str?.match(/(\d+(\.\d+)?)/g) || [0, 0, 0, 1]).map(Number).slice(0, 4);
  
  _fontStyle = (weight, style) => {
    const bold = weight === 'bold' || Number(weight) >= 700;
    const italic = style === 'italic' || style === 'oblique';
    return bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
  };
  
  async _canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed')),
        'image/jpeg',
        0.92
      );
    });
  }
  
  async _blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // Extract complete overlay data from DOM
  _extractOverlay(overlay, wrapper) {
    const textEl = overlay.querySelector('.overlay-text');
    if (!textEl) return null;
    
    const oStyle = getComputedStyle(overlay);
    const tStyle = getComputedStyle(textEl);
    const wRect = wrapper.getBoundingClientRect();
    const oRect = overlay.getBoundingClientRect();
    
    return {
      // Position - uses actual rendered dimensions (auto-height already calculated)
      x: oRect.left - wRect.left,
      y: oRect.top - wRect.top,
      w: oRect.width,
      h: oRect.height,
      
      // Visual
      bg: this._rgba(oStyle.backgroundColor),
      border: this._rgba(oStyle.borderColor),
      borderW: parseFloat(oStyle.borderWidth) || 0,
      borderR: parseFloat(oStyle.borderRadius) || 0,
      opacity: parseFloat(oStyle.opacity) || 1,
      
      // Padding
      pad: [
        parseFloat(oStyle.paddingTop) || 0,
        parseFloat(oStyle.paddingLeft) || 0,
        parseFloat(oStyle.paddingRight) || 0,
        parseFloat(oStyle.paddingBottom) || 0
      ],
      
      // Text
      txt: this._rgba(tStyle.color),
      fontSize: parseFloat(tStyle.fontSize),
      fontStyle: this._fontStyle(tStyle.fontWeight, tStyle.fontStyle),
      align: tStyle.textAlign,
      
      // For line extraction
      textElement: textEl,
      wrapperRect: wRect
    };
  }
  
  // Extract exact line positions from DOM using Range API
  _extractLines(textElement, wrapperRect) {
    const blocks = textElement.querySelectorAll('.merged-text-block');
    const result = [];
    
    const processElement = (el) => {
      const text = el.textContent?.trim();
      if (!text) return null;
      
      const style = getComputedStyle(el);
      const lines = this._getLinePositions(el, wrapperRect);
      
      return lines.length ? {
        lines,
        indent: parseFloat(style.textIndent) || 0,
        marginBottom: parseFloat(style.marginBottom) || 0
      } : null;
    };
    
    if (blocks.length > 0) {
      blocks.forEach(block => {
        const data = processElement(block);
        if (data) result.push(data);
      });
    } else {
      const data = processElement(textElement);
      if (data) result.push(data);
    }
    
    return result;
  }
  
  // Get exact line positions using character-level scanning
  _getLinePositions(element, wrapperRect) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const range = document.createRange();
    const lines = [];
    
    let currentLine = null;
    let textNode;
    
    const finishLine = () => {
      if (currentLine?.text.trim()) {
        lines.push({
          text: currentLine.text.trim(),
          x: currentLine.minX - wrapperRect.left,
          y: currentLine.minY - wrapperRect.top
        });
      }
    };
    
    const startNewLine = (char, rect) => ({
      text: char,
      minX: rect.left,
      minY: rect.top,
      lastY: rect.top
    });
    
    while (textNode = walker.nextNode()) {
      const nodeText = textNode.textContent;
      
      for (let i = 0; i < nodeText.length; i++) {
        try {
          range.setStart(textNode, i);
          range.setEnd(textNode, i + 1);
          const rect = range.getBoundingClientRect();
          
          // Detect line break (Y position changed)
          if (currentLine && Math.abs(rect.top - currentLine.lastY) > 2) {
            finishLine();
            currentLine = startNewLine(nodeText[i], rect);
          } else {
            if (!currentLine) {
              currentLine = startNewLine(nodeText[i], rect);
            } else {
              currentLine.text += nodeText[i];
              currentLine.minX = Math.min(currentLine.minX, rect.left);
              currentLine.minY = Math.min(currentLine.minY, rect.top);
            }
          }
        } catch (e) {
          if (currentLine) currentLine.text += nodeText[i];
        }
      }
    }
    
    finishLine();
    return lines;
  }
  
  // Render overlay backgrounds and borders
  _drawShapes(pdf, overlays) {
    const opaque = new jspdf.GState({ opacity: 1 });
    
    // Backgrounds
    overlays.forEach(o => {
      if (o.bg[3] > 0) {
        pdf.setGState(new jspdf.GState({ opacity: o.opacity * o.bg[3] }));
        pdf.setFillColor(...o.bg.slice(0, 3));
        o.borderR > 0 
          ? pdf.roundedRect(o.x, o.y, o.w, o.h, o.borderR, o.borderR, 'F')
          : pdf.rect(o.x, o.y, o.w, o.h, 'F');
      }
    });
    
    // Borders
    overlays.forEach(o => {
      if (o.borderW > 0 && o.border[3] > 0) {
        pdf.setGState(new jspdf.GState({ opacity: o.opacity }));
        pdf.setLineWidth(o.borderW);
        pdf.setDrawColor(...o.border.slice(0, 3));
        o.borderR > 0
          ? pdf.roundedRect(o.x, o.y, o.w, o.h, o.borderR, o.borderR, 'S')
          : pdf.rect(o.x, o.y, o.w, o.h, 'S');
      }
    });
    
    pdf.setGState(opaque);
  }
  
  // Render text with exact positioning
  _drawText(pdf, overlays) {
    const opaque = new jspdf.GState({ opacity: 1 });
    
    overlays.forEach(o => {
      if (!o.textElement) return;
      
      pdf.setFont(CONFIG.FONT.NAME, o.fontStyle);
      pdf.setFontSize(o.fontSize);
      pdf.setTextColor(...o.txt.slice(0, 3));
      pdf.setGState(new jspdf.GState({ opacity: o.opacity }));
      
      const blocks = this._extractLines(o.textElement, o.wrapperRect);
      
      blocks.forEach(block => {
        block.lines.forEach((line, idx) => {
          const y = line.y + (o.fontSize * 0.85); // Baseline offset
          const maxWidth = o.w - o.pad[1] - o.pad[2];
          
          // Justify non-last lines
          if (o.align === 'justify' && idx < block.lines.length - 1 && block.lines.length > 1) {
            this._justify(pdf, line.text, line.x, y, maxWidth);
          } else {
            pdf.text(line.text, line.x, y, { baseline: 'alphabetic' });
          }
        });
      });
    });
    
    pdf.setGState(opaque);
  }
  
  // Justify text by spacing words
  _justify(pdf, text, x, y, maxWidth) {
    const words = text.trim().split(/\s+/);
    if (words.length <= 1) {
      pdf.text(text, x, y, { baseline: 'alphabetic' });
      return;
    }
    
    const wordWidths = words.map(w => pdf.getTextWidth(w));
    const totalWordWidth = wordWidths.reduce((sum, w) => sum + w, 0);
    
    // Don't over-justify
    if (totalWordWidth > maxWidth * 0.95) {
      pdf.text(text, x, y, { baseline: 'alphabetic' });
      return;
    }
    
    const spaceWidth = (maxWidth - totalWordWidth) / (words.length - 1);
    let currentX = x;
    
    words.forEach((word, i) => {
      pdf.text(word, currentX, y, { baseline: 'alphabetic' });
      currentX += wordWidths[i] + spaceWidth;
    });
  }
  
  // Prepare page data for export
  async _preparePage(wrapper, pageNum) {
    // Ensure canvas is rendered
    let canvas = wrapper.querySelector('canvas');
    if (!canvas) {
      await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
      canvas = wrapper.querySelector('canvas');
    }
    
    // Convert canvas to data URL
    const blob = await this._canvasToBlob(canvas);
    const imageData = await this._blobToDataURL(blob);
    
    // Extract all overlays
    const overlays = Array.from(wrapper.querySelectorAll('.overlay'))
      .map(el => this._extractOverlay(el, wrapper))
      .filter(Boolean);
    
    return {
      imageData,
      overlays,
      width: wrapper.clientWidth,
      height: wrapper.clientHeight
    };
  }
  
  // Add page to PDF
  _addPage(pdf, pageData, isFirst) {
    const { imageData, overlays, width, height } = pageData;
    
    if (!isFirst) {
      pdf.addPage([width, height], width > height ? 'l' : 'p');
    }
    
    pdf.addImage(imageData, 'JPEG', 0, 0, width, height);
    this._drawShapes(pdf, overlays);
    this._drawText(pdf, overlays);
  }
  
  // Embed font
  async _embedFont(pdf) {
    const font = await this.pdf.loadFont();
    if (!font) return;
    
    pdf.addFileToVFS(`${CONFIG.FONT.NAME}.ttf`, font);
    ['normal', 'bold', 'italic', 'bolditalic'].forEach(style => {
      pdf.addFont(`${CONFIG.FONT.NAME}.ttf`, CONFIG.FONT.NAME, style);
    });
  }
  
  // Create PDF instance
  async _createPDF(wrapper) {
    const pdf = new jspdf.jsPDF({
      orientation: wrapper.clientWidth > wrapper.clientHeight ? 'l' : 'p',
      unit: 'pt',
      format: [wrapper.clientWidth, wrapper.clientHeight],
      compress: true
    });
    
    await this._embedFont(pdf);
    return pdf;
  }
  
  // Main export engine
  async _export({ pageNumbers, filename, strategy, groupSize }, ui) {
    return withErrorHandling(async () => {
      const indicator = ui.showSavingIndicator('Preparing export...');
      await forceUIUpdate();
      
      try {
        if (strategy === 'combined') {
          await this._exportCombined(pageNumbers, filename, indicator);
        } else {
          await this._exportMultiple(pageNumbers, filename, groupSize, indicator);
        }
      } finally {
        ui.removeSavingIndicator(indicator);
      }
    }, 'Export failed');
  }
  
  // Export as single combined PDF
  async _exportCombined(pageNumbers, filename, indicator) {
    const firstWrapper = document.querySelector(`#page-wrapper-${pageNumbers[0]}`);
    const pdf = await this._createPDF(firstWrapper);
    
    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNum = pageNumbers[i];
      indicator.textContent = `Processing page ${pageNum} (${i + 1}/${pageNumbers.length})...`;
      
      const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
      if (!wrapper) continue;
      
      const pageData = await this._preparePage(wrapper, pageNum);
      this._addPage(pdf, pageData, i === 0);
      
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }
    
    indicator.textContent = 'Saving PDF...';
    pdf.save(filename);
  }
  
  // Export as multiple PDFs
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
        if (!wrapper) continue;
        
        const pageData = await this._preparePage(wrapper, group[j]);
        this._addPage(pdf, pageData, j === 0);
      }
      
      const filename = groupSize === 1
        ? `${filenameBase}_page_${String(startPage).padStart(3, '0')}.pdf`
        : `${filenameBase}_pages_${String(startPage).padStart(3, '0')}_to_${String(endPage).padStart(3, '0')}.pdf`;
      
      pdf.save(filename);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  // Public API
  async save(name, ui) {
    const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
    return this._export({
      pageNumbers: Array.from({ length: wrappers.length }, (_, i) => i + 1),
      filename: `${name}_export.pdf`,
      strategy: 'combined'
    }, ui);
  }
  
  async saveSinglePage(pageNum, name, ui) {
    return this._export({
      pageNumbers: [pageNum],
      filename: `${name}_page_${String(pageNum).padStart(3, '0')}.pdf`,
      strategy: 'combined'
    }, ui);
  }
  
  async splitPDF(name, ui) {
    const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
    const total = wrappers.length;
    
    if (!confirm(`Split ${total} pages into individual files?\n\nThis will download ${total} separate PDFs.\n\nContinue?`)) return;
    
    return this._export({
      pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
      filename: name,
      strategy: 'multiple',
      groupSize: 1
    }, ui);
  }
  
  async splitByNumberOfFiles(numFiles, name, ui) {
    const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
    const total = wrappers.length;
    const pagesPerFile = Math.ceil(total / numFiles);
    
    if (!confirm(`Split ${total} pages into ${numFiles} files?\n\nEach file will contain ~${pagesPerFile} pages.\n\nContinue?`)) return;
    
    return this._export({
      pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
      filename: name,
      strategy: 'multiple',
      groupSize: pagesPerFile
    }, ui);
  }
  
  async splitByPagesPerFile(pagesPerFile, name, ui) {
    const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
    const total = wrappers.length;
    const numFiles = Math.ceil(total / pagesPerFile);
    
    if (!confirm(`Split into groups of ${pagesPerFile} pages?\n\nThis will create ${numFiles} files.\n\nContinue?`)) return;
    
    return this._export({
      pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
      filename: name,
      strategy: 'multiple',
      groupSize: pagesPerFile
    }, ui);
  }
  
  async exportPageRange(start, end, name, ui) {
    if (start > end) {
      alert('Start page must be ≤ end page');
      return;
    }
    
    return this._export({
      pageNumbers: Array.from({ length: end - start + 1 }, (_, i) => start + i),
      filename: `${name}_pages_${String(start).padStart(3, '0')}_to_${String(end).padStart(3, '0')}.pdf`,
      strategy: 'combined'
    }, ui);
  }
  
  async exportSpecificPages(pageSpec, name, ui) {
    const wrappers = document.querySelectorAll('.page-wrapper:not(.page-placeholder)');
    const pageNumbers = parsePageSpec(pageSpec, wrappers.length);
    
    if (!pageNumbers.length) {
      alert('Invalid page specification.\n\nExamples:\n• "1,5,10"\n• "1-5,10,15-20"');
      return;
    }
    
    if (!confirm(`Export ${pageNumbers.length} specific pages?\n\nPages: ${formatPageList(pageNumbers)}\n\nContinue?`)) return;
    
    const filename = pageNumbers.length === 1
      ? `${name}_page_${String(pageNumbers[0]).padStart(3, '0')}.pdf`
      : `${name}_selected_${pageNumbers.length}_pages.pdf`;
    
    return this._export({
      pageNumbers,
      filename,
      strategy: 'combined'
    }, ui);
  }
}