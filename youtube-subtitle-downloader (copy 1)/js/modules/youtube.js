// js/modules/youtube.js
// Handles fetching subtitle data from YouTube and converting it.
// Depends on YSD_UTILS and YSD_SrtProcessor.

const YSD_Youtube = {
    async getSubtitleList(videoId, onFound, onNotFound) {
        try {
            const url = 'https://www.youtube.com/watch?v=' + videoId;
            const html = await fetch(url).then(resp => resp.text());
            const regex = /\{"captionTracks":(\[.*?\]),/g;
            const match = regex.exec(html);
            if (!match || !match[1]) {
                return onNotFound();
            }
            const captionTracks = JSON.parse(match[1]);
            onFound(captionTracks);
        } catch (e) {
            console.error("Failed to parse caption tracks:", e);
            onNotFound();
        }
    },

    downloadCaptionFile(track, onProcessed) {
        const url = track.baseUrl;
        chrome.runtime.sendMessage({ action: 'getPot' }, async response => {
            const pot = response.pot;
            const fullUrl = pot ? `${url}&fromExt=true&c=WEB&pot=${pot}` : url;

            try {
                const xml = await fetch(fullUrl).then(resp => resp.text());
                const srtContent = this._convertFromTimedToSrtFormat(xml);
                const baseFileName = document.title.replace(/ - YouTube/gi, '') + '.' + track.languageCode;

                // FIX: Added YSD_UTILS. prefix
                YSD_UTILS.saveTextAsFile(srtContent, baseFileName + '.srt');

                const allOutputs = YSD_SrtProcessor.generateGroupedOutputsFromSrt(srtContent, baseFileName);
                if (allOutputs) {
                    onProcessed(allOutputs, baseFileName);
                }
            } catch (error) {
                console.error("Failed to download or process caption file:", error);
            }
        });
    },

    _convertFromTimedToSrtFormat(xml) {
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
                content += count + '\n' +
                    // FIX: Added YSD_UTILS. prefix
                    YSD_UTILS.formatTime(startTime) + ' --> ' + YSD_UTILS.formatTime(endTime) + '\n' +
                    // FIX: Added YSD_UTILS. prefix
                    YSD_UTILS.unescapeHTML(normalizedText) + '\n\n';
                count++;
            }
        });
        return content;
    }
};