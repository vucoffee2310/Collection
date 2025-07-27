// ==============================================================================
// INTEGRATED SRT PROCESSING SCRIPT
// ==============================================================================

// --- CONFIGURATION ---
const scriptConfig = {
    smallGroupSize: 5,
    largeGroupSize: 10,
    largeKeyLen: 6,
    mediumKeyLen: 1,
    keyChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    mergeMaxWords: 0,
    randomSeed: 42,
};

// --- SRT UTILITIES ---

function srtTimeToMs(timeStr) {
    try {
        const [timePart, msPart] = timeStr.split(',');
        const [h, m, s] = timePart.split(':').map(Number);
        return (h * 3600 + m * 60 + s) * 1000 + Number(msPart);
    } catch {
        return 0;
    }
}

function createSeededRandom(seed) {
    const a = 1664525, c = 1013904223, m = 2 ** 32;
    let currentSeed = seed;
    return function() {
        currentSeed = (a * currentSeed + c) % m;
        return currentSeed / m;
    };
}

function htmlEscape(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// --- SRT PROCESSING ---

function prepareDataForGrouping(rawSrtText, config) {
    const entries = rawSrtText.trim().split(/\n\s*\n/)
        .map(block => block.trim().split('\n'))
        .filter(lines => lines.length >= 3 && lines[1].includes('-->'))
        .map(lines => ({
            time: lines[1].trim(),
            text: lines.slice(2).join(' ').trim()
        }))
        .filter(entry => !(entry.text.startsWith('[') && entry.text.endsWith(']')));

    if (!entries.length || config.mergeMaxWords <= 0) {
        return entries.map((entry, i) => [i + 1, entry.time, entry.text]);
    }

    const mergedEntries = [];
    let cursor = 0;
    while (cursor < entries.length) {
        const current = entries[cursor];
        if (
            current.text.split(/\s+/).length <= config.mergeMaxWords &&
            (mergedEntries.length > 0 || cursor + 1 < entries.length)
        ) {
            const prevEntry = mergedEntries.length > 0 ? mergedEntries[mergedEntries.length - 1] : null;
            const nextEntry = cursor + 1 < entries.length ? entries[cursor + 1] : null;

            const prevGap = prevEntry
                ? srtTimeToMs(current.time.split(' --> ')[0]) - srtTimeToMs(prevEntry.time.split(' --> ')[1])
                : Infinity;
            const nextGap = nextEntry
                ? srtTimeToMs(nextEntry.time.split(' --> ')[0]) - srtTimeToMs(current.time.split(' --> ')[1])
                : Infinity;

            if (prevEntry && (prevGap <= nextGap || !nextEntry)) {
                prevEntry.text += ' ' + current.text;
                prevEntry.time = `${prevEntry.time.split(' --> ')[0]} --> ${current.time.split(' --> ')[1]}`;
                cursor++;
            } else if (nextEntry) {
                mergedEntries.push({
                    text: `${current.text} ${nextEntry.text}`,
                    time: `${current.time.split(' --> ')[0]} --> ${nextEntry.time.split(' --> ')[1]}`
                });
                cursor += 2;
            } else {
                mergedEntries.push(current);
                cursor++;
            }
        } else {
            mergedEntries.push(current);
            cursor++;
        }
    }
    return mergedEntries.map((entry, i) => [i + 1, entry.time, entry.text]);
}

function generateKeys(largeGroupsStructure, config, random) {
    const generateRandomKey = (length) =>
        Array.from({ length }, () => config.keyChars.charAt(Math.floor(random() * config.keyChars.length))).join('');

    // Large keys
    const usedLargeKeys = new Set();
    const largeKeys = [];
    while (largeKeys.length < largeGroupsStructure.length) {
        const key = generateRandomKey(config.largeKeyLen);
        if (!usedLargeKeys.has(key)) {
            usedLargeKeys.add(key);
            largeKeys.push(key);
        }
    }

    // Medium keys (unique in 3-group window)
    const mediumKeysNested = [];
    let keysFromPreviousGroup = new Set();

    for (const largeGroup of largeGroupsStructure) {
        const keysForThisGroup = [];
        const usedKeysInThisGroup = new Set();
        const numKeysNeeded = largeGroup.length;
        const forbiddenKeys = new Set(keysFromPreviousGroup);
        let lastGeneratedKey = null;

        while (keysForThisGroup.length < numKeysNeeded) {
            let key;
            do {
                key = generateRandomKey(config.mediumKeyLen);
            } while (
                usedKeysInThisGroup.has(key) ||
                forbiddenKeys.has(key) ||
                key === lastGeneratedKey
            );
            keysForThisGroup.push(key);
            usedKeysInThisGroup.add(key);
            lastGeneratedKey = key;
        }
        mediumKeysNested.push(keysForThisGroup);
        keysFromPreviousGroup = usedKeysInThisGroup;
    }

    return { largeKeys, mediumKeysNested };
}

function buildAllOutputs(largeGroups, keysStructure, baseFileName) {
    const { largeKeys, mediumKeysNested } = keysStructure;
    const outputs = {
        htmlParts: [],
        markdownProseParts: [],
        fullTextParts: [],
        xmlEntryParts: [],
        jsonArticleContent: []
    };

    // --- STATIC CONTENT TO PREPEND ---
    const staticEntries = [
        {
            id: "ABCDEF",
            transcript: "John (A) introduced himself and expressed his (B)"
        },
        {
            id: "NOPQRS",
            transcript: "delight at meeting the listener. (C)"
        }

    ];

    // --- PRE-POPULATE ALL FORMATS WITH STATIC CONTENT ---
    for (const entry of staticEntries) {
        // For JSON
        outputs.jsonArticleContent.push({ id: entry.id, transcript: entry.transcript });

        // For Markdown
        const markdownBlock = [
            `  - **id**: "${entry.id}"`,
            `  - **transcript**: ${entry.transcript}\n`,
        ].join('\n');
        outputs.markdownProseParts.push(markdownBlock);

        // For HTML
        outputs.htmlParts.push(`<p>${htmlEscape(entry.transcript)}</p>\n<br>`);

        // For XML
        outputs.xmlEntryParts.push(`    <entry>\n      <key>${entry.id}</key>\n      <paragraph>${htmlEscape(entry.transcript)}</paragraph>\n    </entry>`);
    }

    // --- PROCESS AND APPEND DYNAMIC CONTENT FROM SRT ---
    for (const [i, largeGroup] of largeGroups.entries()) {
    const largeKey = largeKeys[i];
    const concatenatedParts = [];

    for (const [j, mediumGroup] of largeGroup.entries()) {
        const mediumText = mediumGroup.map(utt => utt[2]).join(' ').trim();
        const mediumKey = mediumKeysNested[i][j];
        let partWithKey;

        // CHECK: Is this the very first part of the very first large group?
        if (i === 0 && j === 0) {
            // If yes, do not add the medium key.
            partWithKey = `(Hello) ${mediumText} (${mediumKey})`;;
        } else {
            // For all other parts, add the medium key.
            // The original logic had no space for the first part of a group (j === 0)
            // and a space for all subsequent parts. This preserves that.
            const separator = (j === 0) ? '' : ' ';
            partWithKey = `${mediumText} (${mediumKey})`;
        }

        concatenatedParts.push(partWithKey);
        outputs.fullTextParts.push(partWithKey);
    }

        const concatenatedText = concatenatedParts.join(' ');

        // A. Append dynamic HTML and XML
        outputs.htmlParts.push(`<p>${htmlEscape(concatenatedText)}</p>\n<br>`);
        outputs.xmlEntryParts.push(`    <entry>\n      <key>${largeKey}</key>\n      <paragraph>${htmlEscape(concatenatedText)}</paragraph>\n    </entry>`);
        
        // B. Append dynamic Markdown block
        const markdownBlock = [
            `  - **id**: "${largeKey}"`,
            `  - **transcript**: ${concatenatedText}\n`
        ].join('\n');
        outputs.markdownProseParts.push(markdownBlock);

        // C. Append dynamic JSON content
        outputs.jsonArticleContent.push({
            id: largeKey,
            transcript: concatenatedText
        });
    }

    const mainArticleContent = outputs.markdownProseParts.join('\n');
    const today = new Date().toISOString();

    // --- BUILD MARKDOWN OUTPUT ---
    const markdownFileContent = `### **METADATA**

- **title**: "Các khía cạnh chính (A) và Nội dung chính (B)"
- **date**: \`${today.split('T')[0]}\`
- **slug**: "key-content-aspects-for-article"
- **layout**: "bài viết trực tiếp (C)"
- **tags**: ["key", "content", "article", "aspects"]

### **AUTHOR INFO**

- **authors**: 
  - **name**: "John Smith"
  - **url**:
    - **ref**: "curator-url"
  - **avatar**:
    - **ref**: "curator-avatar"

---

### **MAIN ARTICLE CONTENT**

${mainArticleContent}
---

### **PAGE SETTINGS**

- **show_toc**: \`true\`
- **show_author_box**: \`true\`
- **enable_comments**: \`true\`

### **CENTRAL LINK & IMAGE DEFINITIONS**

- **reference_definitions**:
  - **curator-url**: "https://johnsmith.com"
  - **curator-avatar**: "/img/authors/john-smith.jpg"`;
    outputs.markdownProse = `Translate into Vietnamese\n\n\`\`\`markdown\n${markdownFileContent}\n\`\`\``;

    // --- BUILD JSON OUTPUT ---
    const jsonObject = {
      metadata: {
        title: "Các khía cạnh chính (A) và Nội dung chính (B)",
        date: today,
        slug: "key-content-aspects-for-article",
        layout: "bài viết trực tiếp (C)",
        tags: ["chính", "nội dung", "bài viết", "khía cạnh"]
      },
      author_info: {
        authors: [{
          name: "John Smith",
          url: { ref: "curator-url" },
          avatar: { ref: "curator-avatar" }
        }]
      },
      main_article_content: outputs.jsonArticleContent,
      page_settings: {
        show_toc: "true",
        show_author_box: "true",
        enable_comments: "true"
      },
      central_link_image_definitions: {
        reference_definitions: {
          "curator-url": "https://johnsmith.com",
          "curator-avatar": "/img/authors/john-smith.jpg"
        }
      }
    };
    outputs.jsonOutput = `Translate into Vietnamese\n\n\`\`\`json\n` + JSON.stringify(jsonObject, null, 2) + `\n\`\`\`\n`;


    // --- BUILD HTML OUTPUT ---
    outputs.htmlOutput = `Translate into Vietnamese

\`\`\`html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Các khía cạnh chính (A) và Nội dung chính (B)</title>
<style>
body {font-family: sans-serif; line-height: 1.6;}
br {margin-bottom: 1em;}
p {margin-top: 0;}
</style>
</head>
<body>
${outputs.htmlParts.join('\n')}
</body>
</html>
\`\`\``;

    // --- BUILD XML OUTPUT ---
    const xmlMetadata = `  <metadata>
    <title>${htmlEscape("Các khía cạnh chính (A) và Nội dung chính (B)")}</title>
    <date>${today}</date>
    <layout>${htmlEscape("bài viết trực tiếp (C)")}</layout>
    <slug>key-content-aspects-for-article</slug>
    <tags>
      <tag>key</tag>
      <tag>content</tag>
      <tag>article</tag>
      <tag>aspects</tag>
    </tags>
    <authors>
      <author>
        <name>John Smith</name>
        <url>https://johnsmith.com</url>
        <avatar>/img/authors/john-smith.jpg</avatar>
      </author>
    </authors>
    <primary_contact>
      <author>
        <name>John Smith</name>
        <url>https://johnsmith.com</url>
        <avatar>/img/authors/john-smith.jpg</avatar>
      </author>
    </primary_contact>
    <toc>1</toc>
    <dy_rd_te>false</dy_rd_te>
    <dy_ar_bo>true</dy_ar_bo>
  </metadata>`;
    outputs.xmlOutput = `Translate into Vietnamese
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<document>
${xmlMetadata}
  <content>
${outputs.xmlEntryParts.join('\n')}
  </content>
</document>
\`\`\`
`;

    // --- CLEANUP ---
    outputs.allMediumKeys = [].concat(...(keysStructure.mediumKeysNested || []));
    delete outputs.htmlParts;
    delete outputs.markdownProseParts;
    delete outputs.fullTextParts;
    delete outputs.xmlEntryParts;
    delete outputs.jsonArticleContent;
    return outputs;
}


function generateGroupedOutputsFromSrt(rawSrtText, config, baseFileName) {
    const random = createSeededRandom(config.randomSeed);
    const preparedData = prepareDataForGrouping(rawSrtText, config);
    if (!preparedData.length) return null;

    const small_groups = [];
    for (let i = 0; i < preparedData.length; i += config.smallGroupSize) {
        small_groups.push(preparedData.slice(i, i + config.smallGroupSize));
    }

    const large_groups = [];
    for (let i = 0; i < small_groups.length; i += config.largeGroupSize) {
        large_groups.push(small_groups.slice(i, i + config.largeGroupSize));
    }
    if (!large_groups.length) return null;

    const keysStructure = generateKeys(large_groups, config, random);
    return buildAllOutputs(large_groups, keysStructure, baseFileName);
}

// ==============================================================================
// YOUTUBE SUBTITLE DOWNLOADER
// ==============================================================================

const CONTAINER_ID = 'captionDownloadContainer';
const PROCESSED_LINKS_CONTAINER_ID = 'processedLinksContainer';
const TOGGLE_CONTAINER_ID = 'copyToggleContainer';

let insertPosition;
let currentUrl = '';
let copyToClipboardEnabled = false;
const COPY_SETTING_KEY = 'copyToClipboardEnabled';

// --- CLIPBOARD & STORAGE ---

const copyToClipboard = (text, feedbackElement) => {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = feedbackElement.textContent;
        const originalColor = feedbackElement.style.color;
        const originalTextDecoration = feedbackElement.style.textDecoration;
        feedbackElement.textContent = 'Copied!';
        feedbackElement.style.color = 'green';
        feedbackElement.style.textDecoration = 'none';
        setTimeout(() => {
            feedbackElement.textContent = originalText;
            feedbackElement.style.color = originalColor;
            feedbackElement.style.textDecoration = originalTextDecoration;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        feedbackElement.textContent = 'Copy Failed!';
        feedbackElement.style.color = 'red';
    });
};

const saveCopySetting = (enabled) => {
    chrome.storage.local.set({ [COPY_SETTING_KEY]: enabled });
};

const loadCopySetting = () => {
    return new Promise(resolve => {
        chrome.storage.local.get([COPY_SETTING_KEY], (result) => {
            resolve(!!result[COPY_SETTING_KEY]);
        });
    });
};

// --- FILE & HTML HELPERS ---

const getParameter = param => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
};

const saveTextAsFile = (text, fileName) => {
    const textFileAsBlob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const hrefLink = window.URL.createObjectURL(textFileAsBlob);
    const downloadLink = document.createElement('a');
    downloadLink.download = fileName;
    downloadLink.textContent = 'Download file';
    downloadLink.href = hrefLink;
    downloadLink.style.display = 'none';
    downloadLink.addEventListener('click', evt => {
        document.body.removeChild(evt.target);
    });
    document.body.appendChild(downloadLink);
    downloadLink.click();
};

const unescapeHTML = inputText => {
    const ESCAPE_SEQ = [/&amp;/g, /&quot;/g, /&lt;/g, /&gt;/g, /&#39;/g];
    const UNESCAPE_SEQ = ['&', '"', '<', '>', '\''];
    for (let i = 0; i < ESCAPE_SEQ.length; i++) {
        inputText = inputText.replace(ESCAPE_SEQ[i], UNESCAPE_SEQ[i]);
    }
    return inputText;
};

// --- YOUTUBE CAPTION TO SRT ---

const convertFromTimedToSrtFormat = xml => {
    let content = '', count = 1;
    let trustedXml;
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        const trustedPolicy = window.trustedTypes.createPolicy('my-extension-policy', { createHTML: s => s });
        trustedXml = trustedPolicy.createHTML(xml);
    } else {
        trustedXml = xml;
    }
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(trustedXml, 'text/xml');
    const arr = [...xmlDoc.getElementsByTagName('text')];
    arr.forEach(text => {
        const startTime = parseFloat(text.getAttribute('start'));
        const duration = parseFloat(text.getAttribute('dur'));
        const orginalText = (text.childNodes && text.childNodes.length) ? text.childNodes[0].nodeValue : '';
        const endTime = startTime + duration;
        const normalizedText = orginalText
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .trim();
        if (normalizedText) {
            content += count + '\n'
                + formatTime(startTime) + ' --> ' + formatTime(endTime) + '\n'
                + unescapeHTML(normalizedText) + '\n\n';
            count++;
        }
    });
    return content;
};

const formatTime = timeInSec => {
    const SSS = Math.floor(timeInSec * 1000) % 1000;
    timeInSec = Math.floor(timeInSec);
    const hh = Math.floor(timeInSec / 3600);
    const mm = Math.floor((timeInSec - hh * 3600) / 60);
    const ss = timeInSec - hh * 3600 - mm * 60;
    return (
        fillZero(hh, 2) + ':'
        + fillZero(mm, 2) + ':'
        + fillZero(ss, 2) + ','
        + fillZero(SSS, 3)
    );
};

const fillZero = (num, len) => {
    let result = '' + num;
    while (result.length < len) result = '0' + result;
    return result;
};

// --- MAIN DOWNLOAD & GUI ---

const downloadCaptionFile = track => {
    const url = track.baseUrl;
    chrome.runtime.sendMessage({ action: 'getPot' }, async response => {
        const pot = response.pot;
        const fullUrl = url + '&fromExt=true&c=WEB&pot=' + pot;
        const xml = await fetch(pot ? fullUrl : url).then(resp => resp.text());
        const srtContent = convertFromTimedToSrtFormat(xml);
        const baseFileName = document.title.replace(/ - YouTube/gi, '') + '.' + track.languageCode;
        saveTextAsFile(srtContent, baseFileName + '.srt');
        const allOutputs = generateGroupedOutputsFromSrt(srtContent, scriptConfig, baseFileName);
        if (allOutputs) displayProcessedFileLinks(allOutputs, baseFileName);
    });
};

const displayProcessedFileLinks = (outputs, baseFileName) => {
    const container = document.getElementById(PROCESSED_LINKS_CONTAINER_ID);
    if (!container) return;
    container.innerHTML = 'Processed files: ';

    const createProcessedLink = (text, title, fileName, data) => {
        const link = document.createElement('a');
        link.textContent = text;
        link.href = 'javascript:;';
        link.title = title;
        link.style.cssText = 'margin-left: 10px; cursor: pointer; color: #007bff; text-decoration: underline; background: transparent; border: none; font-size: 15px;';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            saveTextAsFile(data, fileName);
            if (copyToClipboardEnabled) copyToClipboard(data, link);
        });
        return link;
    };

    const markdownLink = createProcessedLink('original subtitle to md', 'Download prose Markdown and copy if enabled', baseFileName + '.md', outputs.markdownProse);
    const htmlLink = createProcessedLink('original subtitle to html', 'Download processed HTML and copy if enabled', baseFileName + '.html', outputs.htmlOutput);
    const xmlLink = createProcessedLink('original subtitle to xml', 'Download processed XML and copy if enabled', baseFileName + '.xml', outputs.xmlOutput);
    const jsonLink = createProcessedLink('original subtitle to json', 'Download processed JSON and copy if enabled', baseFileName + '.json', outputs.jsonOutput);

    const mediumKeysBtn = document.createElement('button');
    mediumKeysBtn.textContent = 'Copy & Download mediumKeys (array)';
    mediumKeysBtn.title = 'Copy and download the array of all mediumKeys used (JSON)';
    mediumKeysBtn.style.cssText = 'margin-left: 10px; cursor: pointer; color: #fff; background: #007bff; border: none; border-radius: 3px; padding: 3px 8px; font-size: 14px;';
    mediumKeysBtn.addEventListener('click', () => {
        const keysArray = outputs.allMediumKeys || [];
        const keysJson = JSON.stringify(keysArray);
        saveTextAsFile(keysJson, baseFileName + '.mediumKeys.json');
        if (copyToClipboardEnabled) copyToClipboard(keysJson, mediumKeysBtn);
    });

    container.appendChild(markdownLink);
    container.appendChild(document.createTextNode(' - '));
    container.appendChild(htmlLink);
    container.appendChild(document.createTextNode(' - '));
    container.appendChild(xmlLink);
    container.appendChild(document.createTextNode(' - '));
    container.appendChild(jsonLink);
    container.appendChild(mediumKeysBtn);
};

const buildGui = captionTracks => {
    removeIfAlreadyExists();
    const mainContainer = createOutterContainer('Subtitle: ', CONTAINER_ID);
    captionTracks.forEach(track => {
        const link = createDownloadLink(track);
        mainContainer.appendChild(link);
    });

    const toggleContainer = createOutterContainer('', TOGGLE_CONTAINER_ID);
    toggleContainer.style.cssText = 'padding: 0px 5px 10px 0; margin: 0; font-size: 14px; color: blue; line-height: 1.5;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'copyToggleCheckbox';
    checkbox.checked = copyToClipboardEnabled;
    checkbox.style.cssText = 'margin-right: 5px; vertical-align: middle;';
    checkbox.addEventListener('change', (e) => {
        copyToClipboardEnabled = e.target.checked;
        saveCopySetting(copyToClipboardEnabled);
    });

    const label = document.createElement('label');
    label.htmlFor = 'copyToggleCheckbox';
    label.textContent = 'Also copy to clipboard when clicking a processed file link';
    label.style.cssText = 'cursor: pointer; font-weight: normal; color: #333; vertical-align: middle;';

    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(label);

    const processedContainer = createOutterContainer('', PROCESSED_LINKS_CONTAINER_ID);
    processedContainer.style.cssText = 'padding: 10px 5px 10px 0; margin: 0 0 10px 0; color: green; font-size: 15px; line-height: 1.5;';

    addToCurrentPage(mainContainer);
    addToCurrentPage(toggleContainer);
    addToCurrentPage(processedContainer);
};

const addToCurrentPage = container => {
    insertPosition.parentNode.insertBefore(container, insertPosition);
};

const canInsert = () => {
    const selectorList = [
        '#bottom-row',
        '#meta #meta-contents #container #top-row'
    ];
    for (const selector of selectorList) {
        insertPosition = document.querySelector(selector);
        if (insertPosition) return true;
    }
    return false;
};

const createOutterContainer = (text, id) => {
    const container = document.createElement('div');
    container.setAttribute('id', id);
    container.style.cssText = 'padding: 10px 5px 10px 0; margin: 0 0 10px 0; color: blue; font-size: 15px; line-height: 1.5;';
    container.textContent = text;
    return container;
};

const createDownloadLink = track => {
    const link = document.createElement('a');
    link.textContent = track.name.simpleText;
    link.href = 'javascript:;';
    link.title = 'Please click to download SRT and generate processed files';
    link.style.cssText = 'margin-left: 10px; cursor: pointer; color: red; text-decoration: underline; background: transparent; border: none; font-size: 15px;';
    link.addEventListener('click', () => {
        downloadCaptionFile(track);
    });
    return link;
};

const removeIfAlreadyExists = () => {
    [CONTAINER_ID, PROCESSED_LINKS_CONTAINER_ID, TOGGLE_CONTAINER_ID].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.parentNode.removeChild(el);
    });
};

const notifyNotFound = () => {
    removeIfAlreadyExists();
    const container = createOutterContainer('No subtitle', CONTAINER_ID);
    addToCurrentPage(container);
};

const checkSubtitle = () => {
    const newUrl = location.href;
    if (currentUrl != newUrl) {
        const videoId = getParameter('v');
        if (videoId) {
            if (canInsert()) {
                currentUrl = newUrl;
                getSubtitleList(videoId);
            }
        } else {
            currentUrl = newUrl;
            removeIfAlreadyExists();
        }
    }
    setTimeout(checkSubtitle, 500);
};

const init = async () => {
    copyToClipboardEnabled = await loadCopySetting();
    setTimeout(checkSubtitle, 0);
};

const getSubtitleList = async videoId => {
    const url = 'https://www.youtube.com/watch?v=' + videoId;
    const html = await fetch(url).then(resp => resp.text());
    const regex = /\{"captionTracks":(\[.*?\]),/g;
    const arr = regex.exec(html);
    if (arr == null) {
        notifyNotFound();
    } else {
        const match = arr[1];
        try {
            const captionTracks = JSON.parse(match);
            buildGui(captionTracks);
        } catch (e) {
            console.error("Failed to parse caption tracks:", e);
            notifyNotFound();
        }
    }
};

init();