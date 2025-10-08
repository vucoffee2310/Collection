export class PrintExporter {
    async save(pdf, ui) {
        const ind = ui.showSavingIndicator('Preparing pages for PDF export...');
        try {
            await pdf.renderAllQueuedPages();
            await new Promise(r => setTimeout(r, 100));
            window.print();
        } catch (e) {
            alert('Could not prepare for PDF export. See console for details.');
        } finally {
            ui.removeSavingIndicator(ind);
        }
    }
}