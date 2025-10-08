export const CONFIG = {
    FONT: { NAME: 'Bookerly', FILE: 'Bookerly-Regular.ttf', URL: './Bookerly-Regular.ttf' },
    PDF: { WORKER_SRC: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', SCALE: 1.5, RENDER_SCALE: 2.0 },
    OVERLAY: { MIN_HEIGHT: 25, MIN_FONT_SIZE: 4, MAX_FONT_SIZE: 150, VERTICAL_THRESHOLD: 2.0 },
    MERGE: { TOLERANCE_HORIZONTAL: 10 },
    DEFAULT_COORDINATE_ORDER: 'TLBR', // Top, Left, Bottom, Right
    COLOR_PALETTES: {
        modernDark: { name: "Modern Dark (Default)", background: [44, 62, 80], text: [255, 255, 255], border: [52, 73, 94] },
        highContrast: { name: "High Contrast (Yellow/Black)", background: [255, 241, 118], text: [21, 21, 21], border: [253, 216, 53] },
        classicSoft: { name: "Classic (Soft White)", background: [249, 249, 249], text: [21, 21, 21], border: [200, 200, 200] },
        sepia: { name: "Sepia (Eye Comfort)", background: [244, 237, 219], text: [94, 69, 44], border: [220, 210, 190] },
        softPeach: { name: "Soft Peach (Dyslexia Friendly)", background: [253, 228, 201], text: [85, 53, 33], border: [240, 210, 180] },
        nightReader: { name: "Night Reader (Dark Mode)", background: [21, 21, 21], text: [220, 220, 220], border: [50, 50, 50] }
    },
    DEFAULT_PALETTE: 'softPeach'
};