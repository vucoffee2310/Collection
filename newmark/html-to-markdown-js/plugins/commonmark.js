// html-to-markdown-js/plugins/commonmark.js
import { Priority, RenderStatus } from '../constants.js';
import { escapeUrl } from '../escape.js';

export class CommonmarkPlugin {
  constructor(options = {}) {
    this.options = {
      strongDelimiter: '**',
      emDelimiter: '*',
      hr: '* * *',
      bulletListMarker: '-',
      ...options,
    };
  }

  init(converter) {
    const { strongDelimiter, emDelimiter, hr, bulletListMarker } = this.options;
    
    // Bold
    converter.register.rendererFor('strong', 'inline', (ctx, node) => {
      return `${strongDelimiter}${ctx.renderChildren(node)}${strongDelimiter}`;
    }, Priority.STANDARD);
    converter.register.rendererFor('b', 'inline', (ctx, node) => {
      return `${strongDelimiter}${ctx.renderChildren(node)}${strongDelimiter}`;
    }, Priority.STANDARD);

    // Italic
    converter.register.rendererFor('em', 'inline', (ctx, node) => {
      return `${emDelimiter}${ctx.renderChildren(node)}${emDelimiter}`;
    }, Priority.STANDARD);
    converter.register.rendererFor('i', 'inline', (ctx, node) => {
      return `${emDelimiter}${ctx.renderChildren(node)}${emDelimiter}`;
    }, Priority.STANDARD);

    // Headings
    for (let i = 1; i <= 6; i++) {
      converter.register.rendererFor(`h${i}`, 'block', (ctx, node) => {
        return `${'#'.repeat(i)} ${ctx.renderChildren(node)}`;
      }, Priority.STANDARD);
    }
    
    // Horizontal Rule
    converter.register.rendererFor('hr', 'block', () => hr, Priority.STANDARD);

    // Line Break
    converter.register.rendererFor('br', 'inline', () => '  \n', Priority.STANDARD);
    
    // Paragraph
    converter.register.rendererFor('p', 'block', (ctx, node) => {
        return ctx.renderChildren(node);
    }, Priority.STANDARD);

    // Blockquote
    converter.register.rendererFor('blockquote', 'block', (ctx, node) => {
      const content = ctx.renderChildren(node).trim();
      return content.split('\n').map(line => `> ${line}`).join('\n');
    }, Priority.STANDARD);
    
    // Code
    converter.register.rendererFor('pre', 'block', (ctx, node) => {
      const codeNode = node.querySelector('code');
      const lang = codeNode ? (codeNode.className.match(/language-(\S+)/) || [])[1] || '' : '';
      const content = node.textContent.replace(/\n$/, '');
      return `\`\`\`${lang}\n${content}\n\`\`\``;
    }, Priority.STANDARD);

    converter.register.rendererFor('code', 'inline', (ctx, node) => {
        if (node.closest('pre')) return ctx.renderChildren(node); // handled by <pre>
        const content = ctx.renderChildren(node);
        const fence = content.includes('`') ? '``' : '`';
        return `${fence}${content}${fence}`;
    }, Priority.STANDARD);

    // Lists
    const listRenderer = (ctx, node) => {
      const isOrdered = node.nodeName === 'OL';
      const start = isOrdered ? parseInt(node.getAttribute('start') || '1', 10) : null;
      let output = '';
      Array.from(node.children).forEach((li, i) => {
        if (li.nodeName !== 'LI') return;
        const prefix = isOrdered ? `${start + i}. ` : `${bulletListMarker} `;
        let content = ctx.renderChildren(li).trim();
        content = content.replace(/\n/g, '\n    '); // Indent nested lists/content
        output += `${prefix}${content}\n`;
      });
      return output;
    };
    converter.register.rendererFor('ul', 'block', listRenderer, Priority.STANDARD);
    converter.register.rendererFor('ol', 'block', listRenderer, Priority.STANDARD);

    // Links
    converter.register.rendererFor('a', 'inline', (ctx, node) => {
      const href = node.getAttribute('href') || '';
      const text = ctx.renderChildren(node);
      const title = node.getAttribute('title');
      const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
      if (!href) return text;
      return `[${text}](${escapeUrl(href)}${titlePart})`;
    }, Priority.STANDARD);

    // Images
    converter.register.rendererFor('img', 'inline', (ctx, node) => {
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      const title = node.getAttribute('title');
      const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : '';
      return `![${alt}](${escapeUrl(src)}${titlePart})`;
    }, Priority.STANDARD);
  }
}