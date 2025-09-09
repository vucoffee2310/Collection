// html-to-markdown-js/html-to-markdown.js
import { Converter } from './converter.js';
import { BasePlugin } from './plugins/base.js';
import { CommonmarkPlugin } from './plugins/commonmark.js';
import { StrikethroughPlugin } from './plugins/strikethrough.js';
import { TablePlugin } from './plugins/table.js';

/**
 * Converts an HTML string to Markdown.
 * @param {string} htmlString The HTML string to convert.
 * @param {object} [options] Conversion options.
 * @returns {string} The converted Markdown string.
 */
export function convert(htmlString, options = {}) {
  const converter = new Converter(options);

  // Register default plugins
  converter.register.plugin(new BasePlugin());
  converter.register.plugin(new CommonmarkPlugin(options.commonmark));
  
  // Register optional plugins
  if (options.strikethrough !== false) {
    converter.register.plugin(new StrikethroughPlugin(options.strikethrough));
  }
  if (options.table !== false) {
    converter.register.plugin(new TablePlugin(options.table));
  }
  
  return converter.convert(htmlString);
}

// Export classes for custom builds
export {
  Converter,
  BasePlugin,
  CommonmarkPlugin,
  StrikethroughPlugin,
  TablePlugin
};