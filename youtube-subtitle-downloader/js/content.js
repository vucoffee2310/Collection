// ==============================================================================
// INTEGRATED SRT PROCESSOR & YOUTUBE DOWNLOADER
// ==============================================================================

// -------------------------------------------------------------------------
// CONFIGURATION
// -------------------------------------------------------------------------
const CONFIG = {
    srt: {
        smallGroupSize: 5,
        largeGroupSize: 13,
        mediumKeyLen: 1,
        // Modified: Custom character sets
        keyChars: {
            part1: 'QZJKHUTAMRDCB',
            part2: 'SPOWNYFVELGXI'
        },
        randomSeed: 42,
        // New configuration for paragraph breaks
        paragraphBreaks: {
            minLength: 150,    // Minimum characters between breaks
            maxLength: 500,    // Maximum characters between breaks
            keyBufferDistance: 15 // Minimum distance from medium keys
        }
    },
    ui: {
        checkInterval: 500,
        copyFeedbackDuration: 1500
    }
};

// -------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -------------------------------------------------------------------------
const Utils = {
    /**
     * Convert SRT timestamp to milliseconds
     */
    srtTimeToMs(timeStr) {
        try {
            const [timePart, msPart] = timeStr.split(',');
            const [h, m, s] = timePart.split(':').map(Number);
            return (h * 3600 + m * 60 + s) * 1000 + Number(msPart);
        } catch {
            return 0;
        }
    },

    /**
     * Create seeded random number generator
     */
    createSeededRandom(seed) {
        const a = 1664525;
        const c = 1013904223;
        const m = 2 ** 32;
        let currentSeed = seed;
        
        return () => {
            currentSeed = (a * currentSeed + c) % m;
            return currentSeed / m;
        };
    },

    /**
     * Format seconds to SRT timestamp
     */
    formatTime(sec) {
        const ms = Math.floor(sec * 1000) % 1000;
        sec = Math.floor(sec);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        
        return `${h.toString().padStart(2, '0')}:` +
               `${m.toString().padStart(2, '0')}:` +
               `${s.toString().padStart(2, '0')},` +
               `${ms.toString().padStart(3, '0')}`;
    }
};

// -------------------------------------------------------------------------
// SRT PROCESSOR MODULE
// -------------------------------------------------------------------------
const SrtProcessor = {
    /**
     * Parse and prepare SRT data
     */
    prepareSrtData(rawSrtText) {
        return rawSrtText.trim()
            .split(/\n\s*\n/)
            .map(block => block.trim().split('\n'))
            .filter(lines => lines.length >= 3 && lines[1].includes('-->'))
            .map(lines => ({
                time: lines[1].trim(),
                text: lines.slice(2).join(' ').trim()
            }))
            .filter(entry => !(entry.text.startsWith('[') && entry.text.endsWith(']')))
            .map((entry, i) => [i + 1, entry.time, entry.text]);
    },

    /**
     * Generate unique keys for groups using custom character sets
     */
    generateKeys(largeGroups) {
        const { part1, part2 } = CONFIG.srt.keyChars;
        
        const genKey = (charSet, index) => {
            return charSet.charAt(index % charSet.length);
        };

        const mediumKeysNested = [];
        let globalKeyIndex = 0;
        let currentPart = 1; // Start with part 1
        let partIndex = 0;

        for (const group of largeGroups) {
            const keys = [];
            
            for (let i = 0; i < group.length; i++) {
                let key;
                
                if (currentPart === 1) {
                    key = genKey(part1, partIndex);
                    partIndex++;
                    
                    // If we've used all characters in part1, switch to part2
                    if (partIndex >= part1.length) {
                        currentPart = 2;
                        partIndex = 0;
                    }
                } else {
                    key = genKey(part2, partIndex);
                    partIndex++;
                    
                    // If we've used all characters in part2, switch to part1
                    if (partIndex >= part2.length) {
                        currentPart = 1;
                        partIndex = 0;
                    }
                }
                
                keys.push(key);
                globalKeyIndex++;
            }

            mediumKeysNested.push(keys);
        }

        return { mediumKeysNested };
    },

    /**
     * Find valid whitespace positions for paragraph breaks with random lengths
     */
    findValidBreakPositions(fullText, random) {
        const { minLength, maxLength, keyBufferDistance } = CONFIG.srt.paragraphBreaks;
        const keyPattern = /\([A-Z]\)/g;
        const breakPositions = [];
        
        // Find all medium key positions
        const keyPositions = [];
        let match;
        while ((match = keyPattern.exec(fullText)) !== null) {
            keyPositions.push({
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        let currentPos = 0;
        
        while (currentPos < fullText.length - minLength) {
            // Generate random length for next paragraph
            const paragraphLength = Math.floor(
                random() * (maxLength - minLength) + minLength
            );
            
            // Find target position
            let targetPos = currentPos + paragraphLength;
            
            // Look for the nearest whitespace after target position
            let breakPos = -1;
            for (let i = targetPos; i < Math.min(targetPos + 100, fullText.length); i++) {
                if (fullText[i] === ' ') {
                    // Check if this space is safe from all keys
                    const isSafeFromKeys = keyPositions.every(keyPos => 
                        Math.abs(i - keyPos.start) > keyBufferDistance && 
                        Math.abs(i - keyPos.end) > keyBufferDistance
                    );
                    
                    if (isSafeFromKeys) {
                        breakPos = i;
                        break;
                    }
                }
            }
            
            // If we found a valid break position, add it
            if (breakPos !== -1) {
                breakPositions.push(breakPos);
                currentPos = breakPos;
            } else {
                // Move forward and try again
                currentPos = targetPos + 50;
            }
        }
        
        return breakPositions;
    },

    /**
     * Build output formats
     */
    buildOutputs(largeGroups, { mediumKeysNested }) {
        const outputs = { markdownParts: [] };

        // First, build the complete text without breaks
        const allParts = [];
        largeGroups.forEach((group, i) => {
            group.forEach((mediumGroup, j) => {
                const text = mediumGroup.map(u => u[2]).join(' ').trim();
                const key = mediumKeysNested[i][j];
                
                const part = (i === 0 && j === 0) 
                    ? `(Z) ${text} (${key})` 
    
                    : `${text} (${key})`;
                
                allParts.push(part);
            });
        });

        // Join all parts into one continuous text
        let fullText = allParts.join(' ');
        
        // Create a separate random generator for paragraph breaks
        const breakRandom = Utils.createSeededRandom(CONFIG.srt.randomSeed + 1000);
        
        // Find valid break positions and insert breaks
        const breakPositions = this.findValidBreakPositions(fullText, breakRandom);
        
        // Insert breaks from end to start to avoid position shifting
        breakPositions.reverse().forEach(pos => {
            fullText = fullText.slice(0, pos + 1) + '\n\n' + fullText.slice(pos + 1);
        });

        outputs.markdownParts.push(fullText);

        const date = new Date().toISOString().split('T')[0];
        const title = "Các khía cạnh chính (A) và Nội dung chính (B)";

        return {
            markdown: `Translate into Vietnamese\n\n\`\`\`\n` +
                     `# METADATA\n` +
                     `Title: "${title}". Date: \`${date}\`\n\n` +
                     `# MAIN ARTICLE CONTENT\n` +
                     `${outputs.markdownParts.join(' ')}\n\`\`\``,
            allMediumKeys: [].concat(...mediumKeysNested)
        };
    },

    /**
     * Main SRT processing function
     */
    process(rawSrtText) {
        const data = this.prepareSrtData(rawSrtText);
        if (!data.length) return null;

        // Create small groups
        const smallGroups = [];
        for (let i = 0; i < data.length; i += CONFIG.srt.smallGroupSize) {
            smallGroups.push(data.slice(i, i + CONFIG.srt.smallGroupSize));
        }

        // Create large groups
        const largeGroups = [];
        for (let i = 0; i < smallGroups.length; i += CONFIG.srt.largeGroupSize) {
            largeGroups.push(smallGroups.slice(i, i + CONFIG.srt.largeGroupSize));
        }

        const keys = this.generateKeys(largeGroups);
        
        return this.buildOutputs(largeGroups, keys);
    }
};

// -------------------------------------------------------------------------
// FILE OPERATIONS MODULE
// -------------------------------------------------------------------------
const FileOperations = {
    /**
     * Copy text to clipboard with feedback
     */
    async copyToClipboard(text, feedbackElement) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = feedbackElement.textContent;
            
            feedbackElement.textContent = 'Copied!';
            feedbackElement.style.color = 'green';
            
            setTimeout(() => {
                feedbackElement.textContent = originalText;
                feedbackElement.style.color = '';
            }, CONFIG.ui.copyFeedbackDuration);
        } catch (error) {
            console.error('Copy failed:', error);
        }
    },

    /**
     * Save text as file
     */
    saveFile(text, fileName) {
        const blob = new Blob([text], { type: 'text/plain' });
        const link = document.createElement('a');
        
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(link.href);
    },

    /**
     * Convert XML to SRT format
     */
    convertXmlToSrt(xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        let srt = '';
        let count = 1;

        [...doc.getElementsByTagName('text')].forEach(text => {
            const start = parseFloat(text.getAttribute('start'));
            const dur = parseFloat(text.getAttribute('dur'));
            const content = text.textContent?.replace(/\\n/g, '\n').trim();
            
            if (content) {
                srt += `${count}\n`;
                srt += `${Utils.formatTime(start)} --> ${Utils.formatTime(start + dur)}\n`;
                srt += `${content}\n\n`;
                count++;
            }
        });

        return srt;
    }
};

// -------------------------------------------------------------------------
// YOUTUBE DOWNLOADER MODULE
// -------------------------------------------------------------------------
const YouTubeDownloader = {
    state: {
        currentUrl: '',
        copyEnabled: false
    },

    /**
     * Download caption track
     */
    async downloadCaption(track) {
        try {
            // Get POT token
            const response = await chrome.runtime.sendMessage({ action: 'getPot' });
            const urlParams = response.pot 
                ? `&fromExt=true&c=WEB&pot=${response.pot}` 
                : '';
            const url = track.baseUrl + urlParams;

            // Fetch and convert caption
            const xml = await fetch(url).then(r => r.text());
            const srt = FileOperations.convertXmlToSrt(xml);
            
            // Prepare filenames
            const baseName = document.title
                .replace(/ - YouTube/gi, '')
                .concat('.', track.languageCode);

            // Save SRT file
            FileOperations.saveFile(srt, `${baseName}.srt`);

            // Process and show additional outputs
            const outputs = SrtProcessor.process(srt);
            if (outputs) {
                this.showProcessedLinks(outputs, baseName);
            }
        } catch (error) {
            console.error('Caption download failed:', error);
        }
    },

    /**
     * Display processed output links
     */
    showProcessedLinks(outputs, baseName) {
        const container = document.getElementById('processedLinks');
        if (!container) return;

        container.innerHTML = 'Processed: ';

        const link = document.createElement('a');
        link.textContent = 'md';
        link.href = 'javascript:;';
        link.style.cssText = 'margin:0 5px; color:#007bff; ' +
                            'text-decoration:underline; cursor:pointer;';
        
        link.onclick = () => {
            FileOperations.saveFile(outputs.markdown, `${baseName}.md`);
            
            if (this.state.copyEnabled) {
                FileOperations.copyToClipboard(outputs.markdown, link);
            }
        };

        container.appendChild(link);
    },

    /**
     * Fetch available subtitles
     */
    async fetchSubtitles(videoId) {
        try {
            const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await response.text();
            const match = /\{"captionTracks":(\[.*?\]),/g.exec(html);

            if (match) {
                const tracks = JSON.parse(match[1]);
                UIBuilder.buildInterface(tracks, this);
            }
        } catch (error) {
            console.error('Error fetching subtitles:', error);
        }
    }
};

// -------------------------------------------------------------------------
// UI BUILDER MODULE
// -------------------------------------------------------------------------
const UIBuilder = {
    /**
     * Build complete UI interface
     */
    buildInterface(tracks, downloader) {
        // Clean up existing elements
        this.cleanup();

        const insertPoint = document.querySelector(
            '#bottom-row, #meta #meta-contents #container #top-row'
        );
        if (!insertPoint) return;

        // Create container structure
        const container = this.createContainer();
        
        // Add subtitle links
        this.addSubtitleLinks(container, tracks, downloader);
        
        // Setup event handlers
        this.setupEventHandlers(container, downloader);
        
        // Insert into DOM
        insertPoint.parentNode.insertBefore(container, insertPoint);
    },

    /**
     * Create UI container
     */
    createContainer() {
        const container = document.createElement('div');
        container.innerHTML = `
            <div id="captionContainer" style="padding:10px 0; color:blue; font-size:15px;">
                Subtitle: 
            </div>
            <div id="copyToggle">
                <label>
                    <input type="checkbox" id="copyCheckbox"> 
                    Also copy to clipboard
                </label>
            </div>
            <div id="processedLinks" style="padding:10px 0; color:green; font-size:15px;">
            </div>
        `;
        return container;
    },

    /**
     * Add subtitle download links
     */
    addSubtitleLinks(container, tracks, downloader) {
        const captionContainer = container.querySelector('#captionContainer');
        
        tracks.forEach(track => {
            const link = document.createElement('a');
            
            Object.assign(link, {
                textContent: track.name.simpleText,
                href: 'javascript:;'
            });
            
            link.style.cssText = 'margin-left:10px; color:red; ' +
                                'text-decoration:underline; cursor:pointer;';
            link.onclick = () => downloader.downloadCaption(track);
            
            captionContainer.appendChild(link);
        });
    },

    /**
     * Setup UI event handlers
     */
    setupEventHandlers(container, downloader) {
        container.querySelector('#copyCheckbox').onchange = e => {
            downloader.state.copyEnabled = e.target.checked;
        };
    },

    /**
     * Clean up existing UI elements
     */
    cleanup() {
        const selectors = '#captionContainer, #processedLinks, #copyToggle';
        document.querySelectorAll(selectors).forEach(el => el.remove());
    }
};

// -------------------------------------------------------------------------
// MAIN APPLICATION
// -------------------------------------------------------------------------
const App = {
    /**
     * Monitor URL changes and initialize
     */
    monitorUrl() {
        const currentUrl = location.href;
        
        if (YouTubeDownloader.state.currentUrl !== currentUrl) {
            YouTubeDownloader.state.currentUrl = currentUrl;
            
            const videoId = new URLSearchParams(location.search).get('v');
            
            if (videoId) {
                YouTubeDownloader.fetchSubtitles(videoId);
            } else {
                UIBuilder.cleanup();
            }
        }
        
        setTimeout(() => this.monitorUrl(), CONFIG.ui.checkInterval);
    },

    /**
     * Initialize application
     */
    init() {
        this.monitorUrl();
    }
};

// -------------------------------------------------------------------------
// START APPLICATION
// -------------------------------------------------------------------------
App.init();