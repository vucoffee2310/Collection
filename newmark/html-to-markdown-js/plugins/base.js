// html-to-markdown-js/plugins/base.js
import { Priority, TagType, RenderStatus } from '../constants.js';
import { escapeText, unescapeMarkdown, cleanupEscapeMarkers } from '../escape.js';
import { isBlock } from '../dom-utils.js';

const ENTITY_REPLACER = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
};

function escapeHtmlEntities(text) {
  return text.replace(/[<>&]/g, (char) => ENTITY_REPLACER[char]);
}

export class BasePlugin {
  init(converter) {
    // Tags to be completely removed
    const tagsToRemove = [
        'head', 'script', 'style', 'link', 'meta', 'iframe',
        'noscript', 'input', 'textarea', '#comment'
    ];
    for (const tag of tagsToRemove) {
        converter.register.tagType(tag, TagType.REMOVE, Priority.STANDARD);
    }

    // Default renderer for block elements to ensure spacing
    converter.register.renderer((ctx, node) => {
        if (isBlock(node, ctx)) {
            const content = ctx.renderChildren(node);
            const prev = node.previousSibling;
            const needsPrefix = prev && !isBlock(prev, ctx);
            return (needsPrefix ? '\n\n' : '') + content + '\n\n';
        }
        return RenderStatus.TRY_NEXT;
    }, Priority.LATE);
    
    // Text transformation
    converter.register.textTransformer((text) => {
        return escapeText(escapeHtmlEntities(text));
    }, Priority.STANDARD);
    
    // Post-rendering cleanup
    converter.register.postRenderer((markdown) => {
        let result = unescapeMarkdown(markdown);
        result = cleanupEscapeMarkers(result);
        // Trim consecutive newlines
        result = result.replace(/\n{3,}/g, '\n\n');
        return result.trim();
    }, Priority.LATE);
  }
}