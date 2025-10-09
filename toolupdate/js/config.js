export const CONFIG = {
    FONT: { NAME: 'Bookerly', FILE: 'Bookerly-Regular.ttf', URL: './Bookerly-Regular.ttf' },
    PDF: { WORKER_SRC: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', SCALE: 1.5, RENDER_SCALE: 2.0 },
    OVERLAY: { MIN_HEIGHT: 25, MIN_FONT_SIZE: 4, MAX_FONT_SIZE: 150, VERTICAL_THRESHOLD: 2.0 },
    MERGE: { TOLERANCE_HORIZONTAL: 10 },
    DEFAULT_COORDINATE_ORDER: 'TLBR', // Top, Left, Bottom, Right
    COORDINATE_ORDERINGS: [
        // Most Common - Standard PDF formats
        { order: 'TLBR', name: 'Top-Left-Bottom-Right (Default)' },
        { order: 'LTRB', name: 'Left-Top-Right-Bottom (x1,y1,x2,y2)' },
        { order: 'TLRB', name: 'Top-Left-Right-Bottom' },
        { order: 'LBRT', name: 'Left-Bottom-Right-Top (Bottom-origin)' },
        
        // Common - Alternative top/left origin
        { order: 'BLTR', name: 'Bottom-Left-Top-Right' },
        { order: 'TRBL', name: 'Top-Right-Bottom-Left (RTL)' },
        { order: 'LTBR', name: 'Left-Top-Bottom-Right' },
        { order: 'TBLR', name: 'Top-Bottom-Left-Right' },
        
        // Less Common - Other top-first variants
        { order: 'TRLB', name: 'Top-Right-Left-Bottom' },
        { order: 'TBRL', name: 'Top-Bottom-Right-Left' },
        
        // Less Common - Other left-first variants  
        { order: 'LRTB', name: 'Left-Right-Top-Bottom' },
        { order: 'LRBT', name: 'Left-Right-Bottom-Top' },
        { order: 'LBTR', name: 'Left-Bottom-Top-Right' },
        
        // Uncommon - Other bottom-first variants
        { order: 'BLRT', name: 'Bottom-Left-Right-Top' },
        { order: 'BRTL', name: 'Bottom-Right-Top-Left' },
        { order: 'BRLT', name: 'Bottom-Right-Left-Top' },
        { order: 'BTLR', name: 'Bottom-Top-Left-Right' },
        { order: 'BTRL', name: 'Bottom-Top-Right-Left' },
        
        // Rare - Right-first variants (very uncommon)
        { order: 'RTBL', name: 'Right-Top-Bottom-Left' },
        { order: 'RTLB', name: 'Right-Top-Left-Bottom' },
        { order: 'RBTL', name: 'Right-Bottom-Top-Left' },
        { order: 'RBLT', name: 'Right-Bottom-Left-Top' },
        { order: 'RLTB', name: 'Right-Left-Top-Bottom' },
        { order: 'RLBT', name: 'Right-Left-Bottom-Top' },
    ],
    COLOR_PALETTES: {
        // Light Reading (Warm - Reduces Blue Light)
        creamPaper: { 
            name: "Cream Paper (Best Reading)", 
            background: [254, 250, 234], 
            text: [60, 50, 40], 
            border: [230, 220, 200],
            opacity: 97 // Light backgrounds can be slightly more transparent
        },
        sepia: { 
            name: "Sepia (Eye Comfort)", 
            background: [244, 237, 219], 
            text: [74, 59, 44], 
            border: [220, 210, 190],
            opacity: 96
        },
        softMint: { 
            name: "Soft Mint (Low Strain)", 
            background: [240, 248, 240], 
            text: [45, 65, 55], 
            border: [215, 230, 215],
            opacity: 95
        },
        
        // Dark Reading (Night Mode)
        darkOlive: { 
            name: "Dark Olive (Warm Night)", 
            background: [42, 48, 42], 
            text: [230, 235, 220], 
            border: [60, 70, 60],
            opacity: 98 // Dark modes need higher opacity
        },
        charcoal: { 
            name: "Charcoal (True Dark)", 
            background: [40, 44, 52], 
            text: [230, 237, 243], 
            border: [60, 68, 78],
            opacity: 99
        },
        
        // Accessibility
        highContrast: { 
            name: "High Contrast (Max)", 
            background: [255, 255, 255], 
            text: [0, 0, 0], 
            border: [180, 180, 180],
            opacity: 100 // Max contrast needs full opacity
        },
        dyslexia: { 
            name: "Black/Yellow (Dyslexia)", 
            background: [255, 253, 208], 
            text: [20, 20, 20], 
            border: [240, 235, 180],
            opacity: 98
        }
    },
    DEFAULT_PALETTE: 'creamPaper'
};