export class PrintExporter {
    async save(pdfHandler, uiManager) {
        const indicator = uiManager.showSavingIndicator('Preparing pages for PDF export...');
        try {
            // Ensure all pages are rendered in the DOM before printing.
            await pdfHandler.renderAllQueuedPages();
            
            // Allow a brief moment for final rendering updates.
            await new Promise(resolve => setTimeout(resolve, 100));

            // Trigger the browser's print dialog.
            window.print();
        } catch (error) {
            console.error('Print to PDF failed:', error);
            alert('Could not prepare for PDF export. See console for details.');
        } finally {
            // The indicator will be hidden by the print dialog, so we remove it afterwards.
            uiManager.removeSavingIndicator(indicator);
        }
    }
}