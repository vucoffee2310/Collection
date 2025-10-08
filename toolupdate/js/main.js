import { PDFOverlayApp } from './app/PDFOverlayApp.js';
import { jsonData } from './data.js';

document.addEventListener('DOMContentLoaded', () => new PDFOverlayApp(jsonData));