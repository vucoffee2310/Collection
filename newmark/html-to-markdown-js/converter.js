// html-to-markdown-js/converter.js
import { RenderStatus, TagType } from './constants.js';
import { cleanupEscapeMarkers, escapeText, unescapeMarkdown } from './escape.js';
import { collapse } from './dom-utils.js';

export class Converter {
  constructor(options = {}) {
    this.options = options;

    this.preRenderHandlers = [];
    this.renderHandlers = [];
    this.postRenderHandlers = [];
    this.textTransformHandlers = [];
    this.tagTypes = new Map();

    this.register = {
      plugin: (plugin) => {
        if (plugin.init) plugin.init(this);
      },
      preRenderer: (fn, priority) => {
        this.preRenderHandlers.push({ fn, priority });
        this.preRenderHandlers.sort((a, b) => a.priority - b.priority);
      },
      renderer: (fn, priority) => {
        this.renderHandlers.push({ fn, priority });
        this.renderHandlers.sort((a, b) => a.priority - b.priority);
      },
      postRenderer: (fn, priority) => {
        this.postRenderHandlers.push({ fn, priority });
        this.postRenderHandlers.sort((a, b) => a.priority - b.priority);
      },
      textTransformer: (fn, priority) => {
        this.textTransformHandlers.push({ fn, priority });
        this.textTransformHandlers.sort((a, b) => a.priority - b.priority);
      },
      tagType: (tagName, type, priority) => {
        if (!this.tagTypes.has(tagName)) {
          this.tagTypes.set(tagName, []);
        }
        this.tagTypes.get(tagName).push({ type, priority });
        this.tagTypes.get(tagName).sort((a, b) => a.priority - b.priority);
      },
      rendererFor: (tagName, tagType, renderFn, priority) => {
          this.register.tagType(tagName, tagType, priority);
          this.register.renderer((ctx, node) => {
              if (node.nodeName.toLowerCase() === tagName) {
                  return renderFn(ctx, node);
              }
              return RenderStatus.TRY_NEXT;
          }, priority);
      }
    };
  }
  
  getTagType(tagName) {
      const types = this.tagTypes.get(tagName.toLowerCase());
      if (types && types.length > 0) {
          return types[0].type;
      }
      // Basic fallback for unknown tags
      const inline = /^(a|abbr|acronym|b|bdo|big|br|button|cite|code|dfn|em|i|img|input|kbd|label|map|object|q|samp|script|select|small|span|strong|sub|sup|textarea|time|tt|var)$/i;
      return inline.test(tagName) ? TagType.INLINE : TagType.BLOCK;
  }

  convert(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;

    // 1. Pre-render phase (DOM manipulation)
    for (const handler of this.preRenderHandlers) {
      handler.fn(body, this);
    }
    collapse(body, this);


    // 2. Render phase
    let markdown = this.renderNode(body);

    // 3. Post-render phase (string manipulation)
    for (const handler of this.postRenderHandlers) {
      markdown = handler.fn(markdown);
    }

    return markdown;
  }
  
  renderNode(node) {
    if (this.getTagType(node.nodeName) === TagType.REMOVE) {
        return '';
    }
      
    // Handle Text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      let textContent = node.textContent;
      for (const handler of this.textTransformHandlers) {
        textContent = handler.fn(textContent);
      }
      return textContent;
    }
    
    // Handle Element nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const handler of this.renderHandlers) {
        const result = handler.fn(this, node);
        if (result !== RenderStatus.TRY_NEXT) {
          return result;
        }
      }
      // Fallback: render children
      return this.renderChildren(node);
    }

    return ''; // Ignore comments, etc. by default
  }

  renderChildren(node) {
    let result = '';
    for (const child of node.childNodes) {
      result += this.renderNode(child);
    }
    return result;
  }
}