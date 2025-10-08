export class PrintExporter {
    async save(pdfHandler, uiManager) {
        const indicator = uiManager.showSavingIndicator('Preparing pages for PDF export...');
        try {
            await pdfHandler.renderAllQueuedPages();
            await new Promise(resolve => setTimeout(resolve, 100)); // Allow final DOM updates
            window.print();
        } catch (error) {
            console.error('Print to PDF failed:', error);
            alert('Could not prepare for PDF export. See console for details.');
        } finally {
            uiManager.removeSavingIndicator(indicator);
        }
    }
}
