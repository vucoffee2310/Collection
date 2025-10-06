// js/main.js
import { PDFOverlayApp } from './app/PDFOverlayApp.js';
import { jsonData } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application with the original, unmodified data.
    new PDFOverlayApp(jsonData);
});