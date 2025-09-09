let inspectModeActive = false;
let currentHoverElement = null;
let highlightDiv = null;

// ======== ENHANCEMENTS ========
function enhanceTurndown(td) {
  // 1. Reduce excessive newlines
  td.addRule('tightenNewlines', {
    filter: ['p', 'div', 'section', 'article', 'header', 'footer', 'aside', 'nav'],
    replacement: (content) => content.trim() ? `\n\n${content.trim()}\n\n` : `\n`
  });

  // 2. Better list handling
  td.addRule('tightLists', {
    filter: ['ul', 'ol'],
    replacement: (content) => `\n${content.trim()}\n`
  });

  td.addRule('tightListItem', {
    filter: 'li',
    replacement: (content, node, options) => {
      const prefix = node.parentNode.nodeName === 'OL'
        ? `${Array.prototype.indexOf.call(node.parentNode.children, node) + 1}. `
        : `${options.bulletListMarker} `;
      return prefix + content.trim().replace(/\n/g, `\n${' '.repeat(prefix.length)}`) + `\n`;
    }
  });

  // 3. Clean inline elements
  td.addRule('cleanInline', {
    filter: ['span', 'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'code'],
    replacement: (content) => content.trim()
  });

  // 4. Better headings
  td.addRule('betterHeadings', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content, node) => {
      const level = node.nodeName.charAt(1);
      return `\n\n${'#'.repeat(level)} ${content.trim()}\n\n`;
    }
  });

  // 5. Clean links
  td.addRule('cleanLinks', {
    filter: 'a',
    replacement: (content, node) => {
      const href = node.getAttribute('href') || '';
      const title = node.getAttribute('title') || '';
      const display = content.trim();
      const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
      return `[${display}](${href}${titlePart})`;
    }
  });

  // 6. Clean blockquotes
  td.addRule('cleanBlockquote', {
    filter: 'blockquote',
    replacement: (content) => {
      const lines = content.trim().split('\n').map(line => `> ${line.trim()}`).join('\n');
      return `\n\n${lines}\n\n`;
    }
  });

  // 7. Remove clutter attributes
  td.addRule('removeAttributes', {
    filter: node => node.nodeType === 1,
    replacement: (content, node) => {
      if (node.hasAttribute('class')) node.removeAttribute('class');
      if (node.hasAttribute('style')) node.removeAttribute('style');
      for (let attr of node.getAttributeNames()) {
        if (attr.startsWith('data-')) node.removeAttribute(attr);
      }
      return content;
    }
  });

  // 8. Clean code blocks
  td.addRule('cleanCodeBlocks', {
    filter: node => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
    replacement: (content, node) => {
      const code = node.textContent;
      const fence = '```';
      const lang = (node.querySelector('code')?.getAttribute('class') || '').replace('language-', '');
      return `\n\n${fence}${lang}\n${code.trim()}\n${fence}\n\n`;
    }
  });

  // 9. Normalize text nodes
  td.addRule('normalizeSpaces', {
    filter: node => node.nodeType === 3,
    replacement: content => content.replace(/\s+/g, ' ')
  });

  // 10. Remove empty meaningless elements
  td.addRule('removeEmpty', {
    filter: node => {
      if (node.nodeType !== 1) return false;
      const text = node.textContent.trim();
      return !text && !['img', 'br', 'hr', 'input', 'iframe'].some(tag => node.querySelector(tag));
    },
    replacement: () => ''
  });
}

// ======== MAIN CONVERTER ========
function htmlToMarkdown(html) {
  if (!window.TurndownService) throw new Error('Turndown not loaded');
  const td = new window.TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    bulletListMarker: '-',
    hr: '---',
    br: '  ',
    fence: '```'
  });

// ✅ DEBUG: Check if GFM Plugin is available
console.log('GFM Plugin Debug:', window.turndownPluginGfm);

// ✅✅✅ FIXED: USE OFFICIAL GFM PLUGIN
// The plugin function is directly on window.turndownPluginGfm, not under .gfm
if (window.turndownPluginGfm) {
  td.use(window.turndownPluginGfm);
} else {
  console.warn('⚠️ GFM plugin not loaded. Tables, task lists, strikethrough may not work.');
}

  // ✅ APPLY OUR CUSTOM ENHANCEMENTS
  enhanceTurndown(td);
  // ✅ CONVERT & CLEAN
  let markdown = td.turndown(html);
  // Final cleanup
  markdown = markdown.replace(/\n{3,}/g, '\n'); // collapse excess newlines
  markdown = markdown.split('\n').map(line => line.trimEnd()).join('\n'); // trim trailing spaces
  markdown = markdown.trim();
  return markdown;
}

// ======== UI & EVENT HANDLERS (UNCHANGED) ========
function createHighlight() {
  if (highlightDiv) return;
  highlightDiv = document.createElement('div');
  highlightDiv.style.cssText = `position:fixed; border:2px solid #ff6b6b; pointer-events:none; z-index:999999; background:rgba(255,107,107,0.1)`;
  document.body.appendChild(highlightDiv);
}

function removeHighlight() {
  if (highlightDiv) highlightDiv.remove(), highlightDiv = null;
}

function updateHighlight(el) {
  if (!el || !highlightDiv) return;
  const r = el.getBoundingClientRect();
  Object.assign(highlightDiv.style, {
    left: r.left + 'px',
    top: r.top + 'px',
    width: r.width + 'px',
    height: r.height + 'px'
  });
}

function showStatus(msg, bg) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed; top:20px; right:20px; padding:10px 16px; border-radius:4px; z-index:1000001; font-family:Arial; box-shadow:0 3px 8px rgba(0,0,0,0.15); white-space:nowrap; background:${bg}; color:white; font-weight:500`;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1500);
}

function handleClick(e) {
  if (!inspectModeActive || !currentHoverElement) return;
  e.preventDefault(); e.stopPropagation();

  try {
    const md = htmlToMarkdown(currentHoverElement.outerHTML);
    navigator.clipboard.writeText(md).then(() => {
		showStatus('✅ Copied as Markdown!', '#4CAF50');
		stopInspectMode();
		chrome.runtime.sendMessage({ type: 'inspectModeStopped' }).catch(err => {
		});
    });
  } catch (err) {
    showStatus('❌ Failed', '#dc3545');
  }
}

function handleMouseMove(e) {
  if (!inspectModeActive) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el === highlightDiv || el === currentHoverElement) return;
  currentHoverElement = el;
  if (el && ![document.body, document.documentElement].includes(el)) {
    createHighlight(); updateHighlight(el);
  } else removeHighlight();
}

function startInspectMode() {
  if (inspectModeActive) return;
  inspectModeActive = true;
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.body.style.cursor = 'crosshair';
  chrome.runtime.sendMessage({ type: 'inspectModeStarted' }).catch(err => {
});
}

function stopInspectMode() {
  if (!inspectModeActive) return;
  inspectModeActive = false;
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.body.style.cursor = '';
  removeHighlight();
}

chrome.runtime.onMessage.addListener((req, _, send) => {
  if (req.action === 'startInspectMode') startInspectMode();
  else if (req.action === 'stopInspectMode') stopInspectMode();
  send({ success: true });
  return true;
});

window.addEventListener('beforeunload', stopInspectMode);