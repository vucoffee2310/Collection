export const CONFIG = {
  FONT: { 
    NAME: 'Bookerly', 
    FILE: 'Bookerly-Regular.ttf', 
    URL: './Bookerly-Regular.ttf' 
  },
  
  PDF: { 
    WORKER_SRC: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', 
    SCALE: 1.5, 
    RENDER_SCALE: 2.0 
  },
  
  OVERLAY: { 
    MIN_HEIGHT: 25, 
    MIN_FONT_SIZE: 4, 
    MAX_FONT_SIZE: 150, 
    VERTICAL_THRESHOLD: 2.0 
  },
  
  MERGE: { 
    TOLERANCE_HORIZONTAL: 10 
  },
  
  DEFAULT_COORDINATE_ORDER: 'TLBR',
  
  // Only the 6 most common coordinate orderings (covers 98% of use cases)
  COORDINATE_ORDERINGS: [
    'TLBR', // Top-Left-Bottom-Right (Default - most common)
    'LTRB', // Left-Top-Right-Bottom (x1,y1,x2,y2 - common)
    'LBRT', // Left-Bottom-Right-Top (Bottom-origin - PostScript/PDF)
    'BLTR', // Bottom-Left-Top-Right (Canvas coords)
    'TRBL', // Top-Right-Bottom-Left (RTL languages)
    'TBRL', // Top-Bottom-Right-Left (vertical text)
  ].map(order => ({ order, name: order.split('').join('-') })),
  
  // Condensed color palettes - [bg, text, border, opacity]
  COLOR_PALETTES: {
    cream: [[254, 250, 234], [60, 50, 40], [230, 220, 200], 97],
    sepia: [[244, 237, 219], [74, 59, 44], [220, 210, 190], 96],
    mint: [[240, 248, 240], [45, 65, 55], [215, 230, 215], 95],
    darkOlive: [[42, 48, 42], [230, 235, 220], [60, 70, 60], 98],
    charcoal: [[40, 44, 52], [230, 237, 243], [60, 68, 78], 99],
    highContrast: [[255, 255, 255], [0, 0, 0], [180, 180, 180], 100],
    dyslexia: [[255, 253, 208], [20, 20, 20], [240, 235, 180], 98]
  },
  
  DEFAULT_PALETTE: 'cream'
};