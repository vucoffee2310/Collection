import { forceUIUpdate, toPx } from '../utils.js';
import { CONFIG } from '../config.js';

export class Exporters {
  constructor(pdf) {
    this.pdf = pdf;
  }

  /**
   * Converts a canvas element to a WebP data URL.
   * @param {HTMLCanvasElement} canvas The canvas to convert.
   * @param {string} [format='image/webp'] The image format.
   * @param {number} [quality=0.85] The image quality for lossy formats.
   * @returns {Promise<string>} A promise that resolves with the data URL.
   */
  async _canvasToDataURL(canvas, format = 'image/webp', quality = 0.85) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Canvas to Blob conversion failed.'));
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        format,
        quality
      );
    });
  }

  /**
   * Extracts the HTML and computed styles for a single overlay element.
   * @param {HTMLElement} overlay The overlay element.
   * @param {HTMLElement} wrapper The page wrapper element for position calculation.
   * @returns {string} The generated HTML for the overlay.
   */
  _extractOverlayHTML(overlay, wrapper) {
    const textElement = overlay.querySelector('.overlay-text');
    if (!textElement) return '';

    const overlayComputedStyle = getComputedStyle(overlay);
    const textComputedStyle = getComputedStyle(textElement);
    const wrapperRect = wrapper.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    const left = overlayRect.left - wrapperRect.left;
    const top = overlayRect.top - wrapperRect.top;
    const { width, height } = overlayRect;

    const fontSize = parseFloat(textComputedStyle.fontSize);
    const borderWidth = parseFloat(overlayComputedStyle.borderWidth) || 1;
    const borderRadius = parseFloat(overlayComputedStyle.borderRadius) || 3;
    const padding = parseFloat(overlayComputedStyle.padding) || 1;

    const overlayStyles = [
      `position: absolute`,
      `left: ${toPx(left)}`,
      `top: ${toPx(top)}`,
      `width: ${toPx(width)}`,
      `height: ${toPx(height)}`,
      `background-color: ${overlayComputedStyle.backgroundColor}`,
      `border: ${toPx(borderWidth)} solid ${overlayComputedStyle.borderColor}`,
      `border-radius: ${toPx(borderRadius)}`,
      `color: ${textComputedStyle.color}`,
      `font-size: ${toPx(fontSize)}`,
      `font-family: ${textComputedStyle.fontFamily}`,
      `font-weight: ${textComputedStyle.fontWeight}`,
      `font-style: ${textComputedStyle.fontStyle}`,
      `line-height: ${textComputedStyle.lineHeight}`,
      `padding: ${toPx(padding)}`,
      `opacity: ${overlayComputedStyle.opacity}`,
      `display: flex`,
      `flex-direction: column`,
      `overflow: hidden`,
      `white-space: pre-wrap`,
      `word-wrap: break-word`,
    ];

    const classes = ['overlay'];
    const classChecks = ['vertical-text', 'single-line-layout', 'content-code', 'content-list', 'content-table'];
    classChecks.forEach(c => {
      if (overlay.classList.contains(c)) {
        classes.push(c);
      }
    });

    const textStyles = [
      `text-align: ${textComputedStyle.textAlign}`,
      `letter-spacing: ${textComputedStyle.letterSpacing}`,
      `word-spacing: ${textComputedStyle.wordSpacing}`,
    ];

    if (overlay.classList.contains('content-table')) {
      textStyles.push(`width: 100%`, `height: 100%`, `overflow: auto`, `text-align: left`);
    } else if (overlay.classList.contains('content-code')) {
      textStyles.push(`width: 100%`, `text-align: left`, `white-space: pre-wrap`, `line-height: 1.4`);
    } else if (overlay.classList.contains('content-list')) {
      textStyles.push(`width: 100%`, `text-align: left`);
    } else if (overlay.classList.contains('vertical-text')) {
      textStyles.push(`writing-mode: vertical-rl`, `transform: rotate(180deg)`, `white-space: nowrap`, `text-align: center`, `line-height: 1`, `align-self: center`);
    } else if (overlay.classList.contains('single-line-layout')) {
      textStyles.push(`width: auto`, `text-align: left`, `align-self: center`);
    } else {
      textStyles.push(`width: 100%`, `align-self: stretch`);
    }

    return `
<div class="${classes.join(' ')}" style="${overlayStyles.join('; ')}">
  <div class="overlay-text" style="${textStyles.join('; ')}">${textElement.innerHTML || ''}</div>
</div>`;
  }

  /**
   * Generates the complete HTML for a single page, including the background image and overlays.
   * @param {HTMLElement} wrapper The page-wrapper element.
   * @param {number} pageNum The page number.
   * @returns {Promise<string>} A promise resolving to the page's HTML.
   */
  async _generatePageHTML(wrapper, pageNum) {
    const canvas = wrapper.querySelector('canvas');
    if (!canvas) return '';

    const imageDataUrl = await this._canvasToDataURL(canvas);
    const overlaysHTML = Array.from(wrapper.querySelectorAll('.overlay'))
      .map(overlay => this._extractOverlayHTML(overlay, wrapper))
      .filter(Boolean)
      .join('\n    ');

    const aspectRatio = canvas.width / canvas.height;
    const { clientWidth, clientHeight } = wrapper;

    return `
<div class="page-wrapper" style="position: relative; width: ${toPx(clientWidth)}; height: ${toPx(clientHeight)}; aspect-ratio: ${aspectRatio}; margin: 0 auto 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); line-height: 0;">
  <img src="${imageDataUrl}" class="bg-image" alt="PDF Page ${pageNum}" loading="lazy" style="display: block; width: 100%; height: auto;">
  ${overlaysHTML}
</div>`;
  }

  /**
   * Generates the HTML for all pages in the document, processing in batches.
   * @param {HTMLElement} indicator A UI element to display progress.
   * @returns {Promise<string>} A promise resolving to the body HTML.
   */
  async _generateBodyHTML(indicator) {
    const wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
    const totalPages = wrappers.length;
    const BATCH_SIZE = 10;
    const outputHTML = [];

    for (let i = 0; i < totalPages; i += BATCH_SIZE) {
      const segment = wrappers.slice(i, i + BATCH_SIZE);
      const startPage = i + 1;
      const endPage = Math.min(i + BATCH_SIZE, totalPages);
      indicator.textContent = `Processing pages ${startPage}-${endPage} of ${totalPages}...`;

      const htmlPromises = segment.map((wrapper, index) => this._generatePageHTML(wrapper, i + index + 1));
      const htmls = await Promise.all(htmlPromises);
      outputHTML.push(...htmls);

      // Yield to the main thread every few batches to keep the UI responsive
      if (i % 30 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    return outputHTML.filter(Boolean).join('\n');
  }

  /**
   * Builds the complete CSS string for the exported HTML file.
   * @param {object} fonts Object containing base64 encoded fonts.
   * @returns {string} The CSS string.
   */
  _buildCSS(fonts) {
    const mainFontFace = fonts.mainFontBase64
      ? `@font-face {
          font-family: '${CONFIG.FONT.NAME}';
          src: url(data:font/ttf;base64,${fonts.mainFontBase64}) format('truetype');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }`
      : `/* Main font not embedded */`;

    const codeFontFace = fonts.codeFontBase64
      ? `@font-face {
          font-family: '${CONFIG.CODE_FONT.NAME}';
          src: url(data:font/ttf;base64,${fonts.codeFontBase64}) format('truetype');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }`
      : `/* Code font not embedded */`;

    const paragraphSpacing = getComputedStyle(document.body).getPropertyValue('--paragraph-spacing') || '0.4em';

    return `
      ${mainFontFace}
      ${codeFontFace}
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { margin: 0; background: #e9e9e9; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      main { margin: 0 auto; max-width: 100%; padding: 20px 0; }
      .page-wrapper { position: relative; margin: 0 auto 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); line-height: 0; background: #fff; }
      .bg-image { display: block; width: 100%; height: auto; }
      .overlay { position: absolute; border: 1px solid; font-family: '${CONFIG.FONT.NAME}', sans-serif; line-height: 1.15; overflow: hidden; display: flex; flex-direction: column; white-space: pre-wrap; word-wrap: break-word; border-radius: 3px; padding: 1px; transition: all .2s; }
      .overlay:hover { box-shadow: 0 0 12px rgba(52,152,219,.8); transform: scale(1.01); z-index: 200; }
      .overlay-text { cursor: text; user-select: text; }
      .overlay.single-line-layout { justify-content: center; align-items: center; }
      .overlay.single-line-layout .overlay-text { width: auto; text-align: left; align-self: center; }
      .overlay.vertical-text { justify-content: center; align-items: center; }
      .overlay.vertical-text .overlay-text { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; text-align: center; line-height: 1; align-self: center; }
      .overlay.content-code { font-family: '${CONFIG.CODE_FONT.NAME}', 'Courier New', Consolas, Monaco, monospace; font-weight: 600; padding: 6px; overflow-y: auto; justify-content: flex-start; align-items: flex-start; }
      .overlay.content-code .overlay-text { width: 100%; text-align: left; white-space: pre-wrap; font-family: '${CONFIG.CODE_FONT.NAME}', 'Courier New', Consolas, Monaco, monospace; font-weight: 600; line-height: 1.4; }
      .overlay.content-list { justify-content: flex-start; align-items: flex-start; }
      .overlay.content-list .overlay-text { width: 100%; text-align: left; }
      .list-item { margin-bottom: .4em; text-align: left; line-height: 1.3; }
      .list-item:last-child { margin-bottom: 0; }
      .overlay.content-table { overflow: auto; padding: 4px; justify-content: flex-start; align-items: flex-start; }
      .overlay.content-table .overlay-text { width: 100%; height: 100%; overflow: auto; text-align: left; line-height: 1.25; }
      .table-fit, .cell-fit { display: inline-block; transform-origin: top left; }
      .data-table { width: 100%; height: 100%; border-collapse: collapse; font-size: inherit; line-height: inherit; border: 1px solid; border-color: inherit; color: inherit; table-layout: fixed; }
      .data-table colgroup col { box-sizing: border-box; }
      .data-table th, .data-table td { padding: 6px 8px; border: 1px solid; border-color: inherit; text-align: left; vertical-align: middle; word-break: break-word; font-size: inherit; overflow: hidden; position: relative; }
      .data-table th { font-weight: 700; background: rgba(0,0,0,.15); white-space: normal; }
      .data-table td { background: rgba(0,0,0,.05); }
      .data-table tr:nth-child(even) td { background: rgba(0,0,0,.08); }
      .image-placeholder { font-style: italic; opacity: .6; user-select: none; pointer-events: none; }
      .merged-text-block { text-indent: 1.5em; }
      .merged-text-block:not(:last-child) { margin-bottom: ${paragraphSpacing}; }

      @media print {
        body { background: none; }
        main { margin: 0; padding: 0; }
        .page-wrapper { box-shadow: none; margin: 0; break-inside: avoid; }
        .page-wrapper + .page-wrapper { break-before: page; }
        .overlay, canvas { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .overlay.content-code, .overlay.content-table { overflow: visible; }
        .overlay.content-code .overlay-text { overflow: visible; white-space: pre-wrap; }
        .data-table { page-break-inside: avoid; }
        @page { size: auto; margin: 0; }
      }
      @media (max-width: 768px) {
        main { padding: 10px 0; }
        .page-wrapper { margin-bottom: 15px; }
        .data-table th, .data-table td { padding: 3px 4px; }
      }
    `;
  }

  /**
   * Constructs the final HTML document string.
   * @param {string} title The document title.
   * @param {object} fonts Object containing base64 encoded fonts.
   * @param {string} body The body HTML content.
   * @returns {string} The complete HTML document.
   */
  _buildHTMLDocument(title, fonts, body) {
    const css = this._buildCSS(fonts);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - View</title>
  <style>${css}</style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
  }

  /**
   * Exports the current view as a self-contained HTML file.
   * @param {string} name The base name for the downloaded file.
   * @param {object} ui The UI service for showing indicators.
   */
  async html(name, ui) {
    const indicator = ui.showSavingIndicator('Initializing HTML export...');
    await forceUIUpdate();
    try {
      indicator.textContent = 'Loading fonts...';
      const mainFontBase64 = await this.pdf.loadFont();
      const codeFontBase64 = await this.pdf.loadCodeFont();
      const fonts = { mainFontBase64, codeFontBase64 };

      const bodyContent = await this._generateBodyHTML(indicator);

      indicator.textContent = 'Building document...';
      const doc = this._buildHTMLDocument(name, fonts, bodyContent);

      indicator.textContent = 'Saving file...';
      const blob = new Blob([doc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${name}_view.html`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('HTML Export Error:', error);
      alert(`Error saving as HTML: ${error.message}`);
    } finally {
      ui.removeSavingIndicator(indicator);
    }
  }

  /**
   * Prepares the document for printing and opens the print dialog.
   * @param {object} ui The UI service for showing indicators.
   */
  async print(ui) {
    const indicator = ui.showSavingIndicator('Preparing for print...');
    await forceUIUpdate();
    try {
      await this.pdf.renderAllQueuedPages();
      // Brief delay to ensure all content is painted before printing.
      await new Promise(resolve => setTimeout(resolve, 100));

      ui.removeSavingIndicator(indicator);
      await forceUIUpdate(); // Ensure indicator is gone before print dialog.

      window.print();
    } catch (error) {
      console.error('Print Error:', error);
      alert('Could not prepare for print. See console for details.');
    }
  }
}
