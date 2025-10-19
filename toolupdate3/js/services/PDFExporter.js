import { CONFIG } from '../config.js';
import { parsePageSpec, formatPageList, withErrorHandling, forceUIUpdate } from '../utils.js';

export class PDFExporter {
  constructor(pdf) {
    this.pdf = pdf;
    this._baselineCache = new Map();
  }
  
  _rgba = (str) => (str?.match(/(\d+(\.\d+)?)/g) || [0, 0, 0, 1]).map(Number).slice(0, 4);
  
  _fontStyle = (weight, style) => {
    const bold = weight === 'bold' || Number(weight) >= 700;
    const italic = style === 'italic' || style === 'oblique';
    return bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
  };
  
  async _canvasToDataURL(canvas) {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed')),
        'image/jpeg', 0.92
      );
    });
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  _measureBaselineRatio(fontFamily, fontSize) {
    const key = `${fontFamily}-${fontSize}`;
    if (this._baselineCache.has(key)) return this._baselineCache.get(key);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = `${fontSize}px ${fontFamily}`;
      
      // ✨ Use mixed characters including Vietnamese diacritics
      const metrics = ctx.measureText('ÁẢÃÀẠĂẮẲẴẰẶÂẤẨẪẦẬÉẺẼÈẸÊẾỂỄỀỆgpqy');
      
      if (metrics.actualBoundingBoxAscent !== undefined && metrics.actualBoundingBoxDescent !== undefined) {
        const ratio = metrics.actualBoundingBoxAscent / 
                     (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
        this._baselineCache.set(key, ratio);
        return ratio;
      }
    } catch (e) {
      console.warn('Canvas metrics unavailable:', e);
    }
    
    // ✨ Better default for Open Sans
    this._baselineCache.set(key, 0.78);
    return 0.78;
  }
  
  _extractOverlay(overlay, wrapper) {
    const textEl = overlay.querySelector('.overlay-text');
    if (!textEl) return null;
    
    const oStyle = getComputedStyle(overlay);
    const tStyle = getComputedStyle(textEl);
    const wRect = wrapper.getBoundingClientRect();
    const oRect = overlay.getBoundingClientRect();
    
    // ✨ Detect layout type
    const isVertical = overlay.classList.contains('vertical-text');
    const isSingleLine = overlay.classList.contains('single-line-layout');
    
    return {
      x: oRect.left - wRect.left,
      y: oRect.top - wRect.top,
      w: oRect.width,
      h: oRect.height,
      bg: this._rgba(oStyle.backgroundColor),
      border: this._rgba(oStyle.borderColor),
      borderW: parseFloat(oStyle.borderWidth) || 0,
      borderR: parseFloat(oStyle.borderRadius) || 0,
      opacity: parseFloat(oStyle.opacity) || 1,
      pad: [
        parseFloat(oStyle.paddingTop) || 0,
        parseFloat(oStyle.paddingLeft) || 0,
        parseFloat(oStyle.paddingRight) || 0,
        parseFloat(oStyle.paddingBottom) || 0
      ],
      txt: this._rgba(tStyle.color),
      fontSize: parseFloat(tStyle.fontSize),
      fontStyle: this._fontStyle(tStyle.fontWeight, tStyle.fontStyle),
      align: tStyle.textAlign,
      
      // ✨ Capture spacing properties
      letterSpacing: parseFloat(tStyle.letterSpacing) || 0,
      wordSpacing: parseFloat(tStyle.wordSpacing) || 0,
      lineHeight: tStyle.lineHeight === 'normal' 
        ? parseFloat(tStyle.fontSize) * 1.15
        : parseFloat(tStyle.lineHeight),
      
      textElement: textEl,
      wrapperRect: wRect,
      isVertical,
      isSingleLine
    };
  }
  
  // ✨ NEW: Character-level positioning with spacing support
  _getLinePositionsWithSpacing(element, wrapperRect) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const range = document.createRange();
    const lines = [];
    const style = getComputedStyle(element);
    const baselineRatio = this._measureBaselineRatio(style.fontFamily, parseFloat(style.fontSize));
    
    // ✨ Check if custom letter-spacing is applied
    const letterSpacing = parseFloat(style.letterSpacing) || 0;
    const hasCustomSpacing = Math.abs(letterSpacing) > 0.1;
    
    let currentLine = null;
    let textNode;
    
    const finishLine = () => {
      if (currentLine?.text.trim()) {
        const height = currentLine.maxY - currentLine.minY;
        
        const lineData = {
          text: currentLine.text.trim(),
          x: Math.round((currentLine.minX - wrapperRect.left) * 100) / 100,
          baseline: Math.round(((currentLine.minY - wrapperRect.top) + (height * baselineRatio)) * 100) / 100
        };
        
        // ✨ Store character positions for accurate spacing
        if (hasCustomSpacing && currentLine.charPositions) {
          lineData.charPositions = currentLine.charPositions.map(pos => 
            Math.round((pos - wrapperRect.left) * 100) / 100
          );
        }
        
        lines.push(lineData);
      }
    };
    
    while (textNode = walker.nextNode()) {
      const nodeText = textNode.textContent;
      
      for (let i = 0; i < nodeText.length; i++) {
        try {
          range.setStart(textNode, i);
          range.setEnd(textNode, i + 1);
          const rect = range.getBoundingClientRect();
          
          // New line detection
          if (currentLine && Math.abs(rect.top - currentLine.lastY) > 3) {
            finishLine();
            currentLine = null;
          }
          
          if (!currentLine) {
            currentLine = {
              text: nodeText[i],
              minX: rect.left,
              minY: rect.top,
              maxY: rect.bottom,
              lastY: rect.top,
              charPositions: hasCustomSpacing ? [rect.left] : null
            };
          } else {
            currentLine.text += nodeText[i];
            currentLine.minX = Math.min(currentLine.minX, rect.left);
            currentLine.minY = Math.min(currentLine.minY, rect.top);
            currentLine.maxY = Math.max(currentLine.maxY, rect.bottom);
            currentLine.lastY = rect.top;
            
            if (hasCustomSpacing) {
              currentLine.charPositions.push(rect.left);
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
  
  _extractLines(textElement, wrapperRect) {
    const blocks = textElement.querySelectorAll('.merged-text-block');
    
    const process = (el) => {
      const text = el.textContent?.trim();
      if (!text) return null;
      const lines = this._getLinePositionsWithSpacing(el, wrapperRect);
      return lines.length ? { lines } : null;
    };
    
    const result = [];
    
    if (blocks.length > 0) {
      // Process each merged text block
      // Line positions are already absolute and include CSS spacing
      blocks.forEach(block => {
        const data = process(block);
        if (data) result.push(data);
      });
    } else {
      // Single text block (no merging)
      const data = process(textElement);
      if (data) result.push(data);
    }
    
    return result;
  }
  
  _drawShapes(pdf, overlays) {
    const opaque = new jspdf.GState({ opacity: 1 });
    
    overlays.forEach(o => {
      // Background
      if (o.bg[3] > 0) {
        pdf.setGState(new jspdf.GState({ opacity: o.opacity * o.bg[3] }));
        pdf.setFillColor(...o.bg.slice(0, 3));
        
        // ✨ Only use rounded rect if radius is significant
        if (o.borderR > 1) {
          pdf.roundedRect(o.x, o.y, o.w, o.h, o.borderR, o.borderR, 'F');
        } else {
          pdf.rect(o.x, o.y, o.w, o.h, 'F');
        }
      }
    });
    
    // Borders (drawn separately for better layering)
    overlays.forEach(o => {
      if (o.borderW > 0 && o.border[3] > 0) {
        pdf.setGState(new jspdf.GState({ opacity: o.opacity }));
        pdf.setLineWidth(o.borderW);
        pdf.setDrawColor(...o.border.slice(0, 3));
        
        if (o.borderR > 1) {
          pdf.roundedRect(o.x, o.y, o.w, o.h, o.borderR, o.borderR, 'S');
        } else {
          pdf.rect(o.x, o.y, o.w, o.h, 'S');
        }
      }
    });
    
    pdf.setGState(opaque);
  }
  
  // ✨ NEW: Draw text with character positions
  _drawTextWithCharPositions(pdf, o) {
    this._extractLines(o.textElement, o.wrapperRect).forEach(block => {
      block.lines.forEach(line => {
        if (line.charPositions && line.charPositions.length > 0) {
          // ✨ Draw using actual character positions from browser
          const chars = line.text.split('');
          chars.forEach((char, index) => {
            const x = line.charPositions[index] || line.x;
            pdf.text(char, x, line.baseline, { baseline: 'alphabetic' });
          });
        } else {
          // Normal rendering
          pdf.text(line.text, line.x, line.baseline, { baseline: 'alphabetic' });
        }
      });
    });
  }
  
  // ✨ NEW: Draw vertical text
  _drawVerticalText(pdf, o) {
    const text = o.textElement.textContent || '';
    const centerX = o.x + o.w / 2;
    const centerY = o.y + o.h / 2;
    
    pdf.saveGraphicsState();
    
    // For vertical text, we need to draw character by character vertically
    if (Math.abs(o.letterSpacing) > 0.1) {
      // Vertical with letter spacing
      let currentY = centerY - (text.length * (o.fontSize + o.letterSpacing)) / 2;
      
      text.split('').forEach(char => {
        pdf.text(char, centerX, currentY, {
          angle: 90,
          baseline: 'middle',
          align: 'center'
        });
        currentY += o.fontSize + o.letterSpacing;
      });
    } else {
      // Simple vertical text
      pdf.text(text, centerX, centerY, {
        angle: 90,
        baseline: 'middle',
        align: 'center'
      });
    }
    
    pdf.restoreGraphicsState();
  }
  
  _drawText(pdf, overlays) {
    const opaque = new jspdf.GState({ opacity: 1 });
    
    overlays.forEach(o => {
      if (!o.textElement) return;
      
      pdf.setFont(CONFIG.FONT.NAME, o.fontStyle);
      pdf.setFontSize(o.fontSize);
      pdf.setTextColor(...o.txt.slice(0, 3));
      pdf.setGState(new jspdf.GState({ opacity: o.opacity }));
      
      // ✨ Handle different text types
      if (o.isVertical) {
        this._drawVerticalText(pdf, o);
      } else {
        this._drawTextWithCharPositions(pdf, o);
      }
    });
    
    pdf.setGState(opaque);
  }
  
  async _preparePage(wrapper, pageNum) {
    let canvas = wrapper.querySelector('canvas');
    if (!canvas) {
      await this.pdf.renderPageToCanvas(wrapper, pageNum, CONFIG.PDF.SCALE);
      canvas = wrapper.querySelector('canvas');
    }
    
    const imageData = await this._canvasToDataURL(canvas);
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
  
  _addPage(pdf, pageData, isFirst) {
    const { imageData, overlays, width, height } = pageData;
    
    if (!isFirst) {
      pdf.addPage([width, height], width > height ? 'l' : 'p');
    }
    
    pdf.addImage(imageData, 'JPEG', 0, 0, width, height);
    this._drawShapes(pdf, overlays);
    this._drawText(pdf, overlays);
  }
  
  async _embedFont(pdf) {
    const font = await this.pdf.loadFont();
    if (!font) {
      console.warn('Font not loaded, PDF will use default font');
      return;
    }
    
    try {
      // ✨ Add font to VFS
      pdf.addFileToVFS(CONFIG.FONT.FILE, font);
      
      // ✨ Register for all styles
      ['normal', 'bold', 'italic', 'bolditalic'].forEach(style => {
        pdf.addFont(CONFIG.FONT.FILE, CONFIG.FONT.NAME, style);
      });
      
      console.log(`Font "${CONFIG.FONT.NAME}" loaded successfully`);
    } catch (e) {
      console.error('Failed to embed font:', e);
      alert('Warning: Could not embed custom font in PDF. Default font will be used.');
    }
  }
  
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
  
  async _exportCombined(pageNumbers, filename, indicator) {
    const firstWrapper = document.querySelector(`#page-wrapper-${pageNumbers[0]}`);
    const pdf = await this._createPDF(firstWrapper);
    
    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNum = pageNumbers[i];
      indicator.textContent = `Processing page ${pageNum} (${i + 1}/${pageNumbers.length})...`;
      
      const wrapper = document.querySelector(`#page-wrapper-${pageNum}`);
      if (wrapper) {
        const pageData = await this._preparePage(wrapper, pageNum);
        this._addPage(pdf, pageData, i === 0);
      }
      
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }
    
    indicator.textContent = 'Saving PDF...';
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
      
      const filename = groupSize === 1
        ? `${filenameBase}_page_${String(startPage).padStart(3, '0')}.pdf`
        : `${filenameBase}_pages_${String(startPage).padStart(3, '0')}_to_${String(endPage).padStart(3, '0')}.pdf`;
      
      pdf.save(filename);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
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
  
  async save(name, ui) {
    const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
    return this._export({
      pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
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
    const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
    
    if (!confirm(`Split ${total} pages into individual files?\n\nThis will download ${total} separate PDFs.\n\nContinue?`)) return;
    
    return this._export({
      pageNumbers: Array.from({ length: total }, (_, i) => i + 1),
      filename: name,
      strategy: 'multiple',
      groupSize: 1
    }, ui);
  }
  
  async splitByNumberOfFiles(numFiles, name, ui) {
    const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
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
    const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
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
    const total = document.querySelectorAll('.page-wrapper:not(.page-placeholder)').length;
    const pageNumbers = parsePageSpec(pageSpec, total);
    
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