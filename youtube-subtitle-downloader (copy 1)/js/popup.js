// js/popup.js
// This script runs in the popup and orchestrates the entire process.

let copyToClipboardEnabled = false;
let currentVideoTitle = 'video';

const statusEl = document.getElementById('status');
const subtitleListEl = document.getElementById('subtitle-list');
const processedFilesEl = document.getElementById('processed-files');
const optionsEl = document.getElementById('options-container');
const dividerEl = document.getElementById('divider');
const copyToggleEl = document.getElementById('copy-toggle');

function setStatus(message) {
    statusEl.textContent = message;
    statusEl.classList.remove('hidden');
    subtitleListEl.classList.add('hidden');
}

function clearStatus() {
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
    subtitleListEl.classList.remove('hidden');
}

function renderSubtitleList(captionTracks) {
    clearStatus();
    subtitleListEl.innerHTML = ''; // Clear previous list

    captionTracks.forEach(track => {
        const button = document.createElement('button');
        button.textContent = track.name.simpleText;
        button.className = 'subtitle-button';
        button.title = `Download "${track.name.simpleText}" and process`;
        button.addEventListener('click', () => {
            setStatus('Processing... Please wait.');
            processedFilesEl.innerHTML = '';
            dividerEl.classList.add('hidden');
            optionsEl.classList.add('hidden');
            
            // The onProcessed callback will be executed by downloadCaptionFile
            YSD_Youtube.downloadCaptionFile(track, renderProcessedLinks);
        });
        subtitleListEl.appendChild(button);
    });
}

function renderProcessedLinks(outputs, baseFileName) {
    clearStatus();
    processedFilesEl.innerHTML = ''; // Clear previous links
    dividerEl.classList.remove('hidden');
    optionsEl.classList.remove('hidden');

    const createLink = (text, title, fileName, data) => {
        const link = document.createElement('a');
        link.textContent = text;
        link.href = '#';
        link.className = 'processed-link';
        link.title = title;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            YSD_UTILS.saveTextAsFile(data, fileName);
            if (copyToClipboardEnabled) YSD_UTILS.copyToClipboard(data, link);
        });
        return link;
    };

    processedFilesEl.appendChild(createLink('Download .md', 'Download prose Markdown', baseFileName + '.md', outputs.markdownProse));
    processedFilesEl.appendChild(createLink('Download .html', 'Download processed HTML', baseFileName + '.html', outputs.htmlOutput));
    processedFilesEl.appendChild(createLink('Download .xml', 'Download processed XML', baseFileName + '.xml', outputs.xmlOutput));
    processedFilesEl.appendChild(createLink('Download .json', 'Download processed JSON', baseFileName + '.json', outputs.jsonOutput));
    
    const mediumKeysBtn = document.createElement('button');
    mediumKeysBtn.textContent = 'Copy & Download mediumKeys';
    mediumKeysBtn.title = 'Copy/download the array of all mediumKeys (JSON)';
    mediumKeysBtn.className = 'medium-keys-button';
    mediumKeysBtn.addEventListener('click', () => {
        const keysJson = JSON.stringify(outputs.allMediumKeys || []);
        YSD_UTILS.saveTextAsFile(keysJson, baseFileName + '.mediumKeys.json');
        if (copyToClipboardEnabled) YSD_UTILS.copyToClipboard(keysJson, mediumKeysBtn);
    });
    processedFilesEl.appendChild(mediumKeysBtn);
}

async function init() {
    // Load settings
    copyToClipboardEnabled = await YSD_UTILS.loadCopySetting();
    copyToggleEl.checked = copyToClipboardEnabled;
    copyToggleEl.addEventListener('change', (e) => {
        copyToClipboardEnabled = e.target.checked;
        YSD_UTILS.saveCopySetting(copyToClipboardEnabled);
    });

    // Get active tab and request video details
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url && tab.url.includes("youtube.com/watch")) {
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: "getVideoDetails" });
            if (response && response.videoId) {
                currentVideoTitle = response.title;
                YSD_Youtube.getSubtitleList(
                    response.videoId,
                    renderSubtitleList,
                    () => setStatus("No subtitles found for this video.")
                );
            } else {
                setStatus("This is not a YouTube video page.");
            }
        } catch (e) {
            console.error("Error communicating with content script:", e);
            setStatus("Could not connect to the YouTube page. Please refresh the page and try again.");
        }
    } else {
        setStatus("Navigate to a YouTube video to use this extension.");
    }
}

document.addEventListener('DOMContentLoaded', init);