// html-to-markdown-js/plugins/table.js
import { Priority } from '../constants.js';

export class TablePlugin {
    init(converter) {
        converter.register.rendererFor('table', 'block', (ctx, tableNode) => {
            let headerContent = '';
            let headerSeparator = '';
            let bodyContent = '';

            const headerRow = tableNode.querySelector('thead tr, tr:first-child');
            if (headerRow) {
                const headerCells = Array.from(headerRow.children).filter(c => c.matches('th, td'));
                const headerTexts = headerCells.map(cell => ctx.renderNode(cell).replace(/\|/g, '\\|'));

                headerContent = `| ${headerTexts.join(' | ')} |`;
                headerSeparator = `| ${headerTexts.map(text => {
                    const align = (headerCells[headerTexts.indexOf(text)].getAttribute('align') || '---');
                    if (align === 'left') return ':--';
                    if (align === 'right') return '--:';
                    if (align === 'center') return ':-:';
                    return '---';
                }).join(' | ')} |`;
            }

            const bodyRows = Array.from(tableNode.querySelectorAll('tbody tr, tr')).filter(r => r !== headerRow);
            bodyRows.forEach(row => {
                const rowCells = Array.from(row.children).filter(c => c.matches('td, th'));
                const rowTexts = rowCells.map(cell => ctx.renderNode(cell).replace(/\|/g, '\\|'));
                bodyContent += `| ${rowTexts.join(' | ')} |\n`;
            });

            return `${headerContent}\n${headerSeparator}\n${bodyContent.trim()}`;
        }, Priority.STANDARD);
    }
}