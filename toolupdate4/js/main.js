import { PDFOverlayApp } from './app/App.js';
import { jsonData } from './data.js';

document.addEventListener('DOMContentLoaded', () => new PDFOverlayApp(jsonData));