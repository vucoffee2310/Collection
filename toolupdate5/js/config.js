export const CONFIG = {
  FONT: {
    NAME: "Open Sans",
    FILE: "OpenSans_SemiCondensed-Medium.ttf",
    URL: "./OpenSans_SemiCondensed-Medium.ttf",
  },
  CODE_FONT: {
    NAME: "JetBrains Mono",
    FILE: "JetBrainsMono-Medium.ttf",
    URL: "./JetBrainsMono-Medium.ttf",
  },

  PDF: {
    WORKER_SRC:
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    SCALE: 1.5,
    RENDER_SCALE: 2.0,
  },

  OVERLAY: {
    MIN_HEIGHT: 25,
    MIN_FONT_SIZE: 4,
    MAX_FONT_SIZE: 150,
    VERTICAL_THRESHOLD: 2.0,
  },

  MERGE: {
    TOLERANCE_HORIZONTAL: 10,
  },

  // Default coordinate order: TLBR (Top, Left, Bottom, Right)
  // This matches the data format: [y1, x1, y2, x2] = [top, left, bottom, right]
  DEFAULT_COORDINATE_ORDER: "TLBR",

  COORDINATE_ORDERINGS: [
    "TLBR", // Default - matches [top, left, bottom, right]
    "LTRB", // [left, top, right, bottom]
    "LBRT", // [left, bottom, right, top]
    "BLTR", // [bottom, left, top, right]
    "TRBL", // [top, right, bottom, left]
    "TBRL", // [top, bottom, right, left]
  ].map((order) => ({ order, name: order.split("").join("-") })),

  CONTENT_TYPES: {
    TEXT: "text",
    CODE: "code",
    LIST: "list",
    TABLE: "table",
    IMAGE: "image",
  },

  COLOR_PALETTES: {
    cream: [[254, 250, 234], [60, 50, 40], [230, 220, 200], 97],
    sepia: [[244, 237, 219], [74, 59, 44], [220, 210, 190], 96],
    mint: [[240, 248, 240], [45, 65, 55], [215, 230, 215], 95],
    darkOlive: [[42, 48, 42], [230, 235, 220], [60, 70, 60], 98],
    charcoal: [[40, 44, 52], [230, 237, 243], [60, 68, 78], 99],
    highContrast: [[255, 255, 255], [0, 0, 0], [180, 180, 180], 100],
    // ✨ Code-friendly palette (dark theme optimized for code blocks)
    code: [[40, 44, 52], [171, 178, 191], [60, 68, 78], 98],
    dyslexia: [[255, 253, 208], [20, 20, 20], [240, 235, 180], 98],
  },

  DEFAULT_PALETTE: "cream",
};
