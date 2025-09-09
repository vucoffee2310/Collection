// html-to-markdown-js/plugins/strikethrough.js
import { Priority } from '../constants.js';

export class StrikethroughPlugin {
  constructor(options = {}) {
    this.delimiter = options.delimiter || '~~';
  }

  init(converter) {
    const renderer = (ctx, node) => {
      return `${this.delimiter}${ctx.renderChildren(node)}${this.delimiter}`;
    };
    
    converter.register.rendererFor('del', 'inline', renderer, Priority.STANDARD);
    converter.register.rendererFor('s', 'inline', renderer, Priority.STANDARD);
    converter.register.rendererFor('strike', 'inline', renderer, Priority.STANDARD);
  }
}