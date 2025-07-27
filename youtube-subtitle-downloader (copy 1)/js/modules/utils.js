// js/modules/utils.js
// Contains generic helper functions for file saving, clipboard, storage, and text/time formatting.

const YSD_UTILS = {
    // --- CLIPBOARD & STORAGE ---
    copyToClipboard: (text, feedbackElement) => {
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
    },

    saveCopySetting: (enabled) => {
        chrome.storage.local.set({ [YSD_CONFIG.COPY_SETTING_KEY]: enabled });
    },

    loadCopySetting: () => {
        return new Promise(resolve => {
            chrome.storage.local.get([YSD_CONFIG.COPY_SETTING_KEY], (result) => {
                resolve(!!result[YSD_CONFIG.COPY_SETTING_KEY]);
            });
        });
    },

    // --- FILE & URL HELPERS ---
    getParameter: param => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    saveTextAsFile: (text, fileName) => {
        const textFileAsBlob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const hrefLink = window.URL.createObjectURL(textFileAsBlob);
        const downloadLink = document.createElement('a');
        downloadLink.download = fileName;
        downloadLink.href = hrefLink;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(hrefLink);
    },

    // --- TEXT & TIME FORMATTING ---
    htmlEscape: text => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    unescapeHTML: inputText => {
        const ESCAPE_SEQ = [/&amp;/g, /&quot;/g, /&lt;/g, /&gt;/g, /&#39;/g];
        const UNESCAPE_SEQ = ['&', '"', '<', '>', '\''];
        for (let i = 0; i < ESCAPE_SEQ.length; i++) {
            inputText = inputText.replace(ESCAPE_SEQ[i], UNESCAPE_SEQ[i]);
        }
        return inputText;
    },

    srtTimeToMs: timeStr => {
        try {
            const [timePart, msPart] = timeStr.split(',');
            const [h, m, s] = timePart.split(':').map(Number);
            return (h * 3600 + m * 60 + s) * 1000 + Number(msPart);
        } catch {
            return 0;
        }
    },

    createSeededRandom: seed => {
        const a = 1664525, c = 1013904223, m = 2 ** 32;
        let currentSeed = seed;
        return function() {
            currentSeed = (a * currentSeed + c) % m;
            return currentSeed / m;
        };
    },

    formatTime: timeInSec => {
        const SSS = Math.floor(timeInSec * 1000) % 1000;
        timeInSec = Math.floor(timeInSec);
        const hh = Math.floor(timeInSec / 3600);
        const mm = Math.floor((timeInSec - hh * 3600) / 60);
        const ss = timeInSec - hh * 3600 - mm * 60;
        return (
            YSD_UTILS.fillZero(hh, 2) + ':' +
            YSD_UTILS.fillZero(mm, 2) + ':' +
            YSD_UTILS.fillZero(ss, 2) + ',' +
            YSD_UTILS.fillZero(SSS, 3)
        );
    },

    fillZero: (num, len) => {
        return String(num).padStart(len, '0');
    }
};