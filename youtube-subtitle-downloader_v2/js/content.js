const $ = s => document.querySelector(s);
const getVideoId = () => new URL(location.href).searchParams.get('v');

// ====================================================================
// UTILS
// ====================================================================

const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        console.log('✅ Copied to clipboard');
    } catch (err) {
        console.error('❌ Failed to copy:', err);
        // Fallback for older browsers (optional)
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            console.log('✅ Copied via fallback');
        } catch (e) {
            alert('Failed to copy text.');
        }
        document.body.removeChild(textarea);
    }
};

// ====================================================================
// SECTION 1: CORE TEXT PROCESSING
// ====================================================================

function xmlToSingleParagraph(xml) {
    const characters = ['Q', 'Z', 'P', 'H', 'W', 'D', 'N', 'K', 'T', 'G', 'B', 'Y', 'V', 'S', 'U', 'R', 'J', 'E', 'O', 'M', 'C', 'L', 'X', 'A', 'F', 'I'];
    const utterances = new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('text');
    let result = "";
    let markerCount = 0;
    Array.from(utterances).forEach((el, index) => {
        const text = (el.textContent || '').replace(/[\r\n]+/g, ' ').trim();
        if (!text) return;

        if (index % 5 === 0) {
            const charToInsert = characters[markerCount % characters.length];
            result += `(${charToInsert}) `;
            markerCount++;
        }

        result += text + " ";
    });
    return result.trim();
}

function processSubtitles(xml) {
    return xmlToSingleParagraph(xml);
}

function buildAIPrompt(bodyContent) {
    return `Translate into Vietnamese\n\n${bodyContent}`;
}

// ====================================================================
// SECTION 2: SEND TO AI
// ====================================================================

const sendToAI = (content) => {
    const API_KEY = "AIzaSyAzddIKNOyH3qWYcdkAWNoKKobVzRa2RXQ"; // ⚠️ Insecure
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${API_KEY}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: content }] }],
        generationConfig: {
            temperature: 1.4,
            thinkingConfig: { thinkingBudget: 600 },
            topP: 0.6,
        }
    };

    console.log("Sending to AI...");
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.body.getReader();
    })
    .then(reader => {
        const decoder = new TextDecoder();
        let leftover = "";

        function read() {
            reader.read().then(({ value, done }) => {
                if (done) return console.log("\n--- AI Stream Finished ---");
                const chunk = leftover + decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                leftover = lines.pop();

                for (let line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (text) console.log(text);
                        } catch (e) { /* ignore */ }
                    }
                }
                read();
            });
        }
        read();
    })
    .catch(error => console.error('Error:', error));
};

const getAndProcessSubs = async (track) => {
    const { pot } = await new Promise(resolve =>
        chrome.runtime.sendMessage({ action: 'getPot' }, resolve)
    ) || {};
    if (!pot) {
        alert('Please enable subtitles and refresh the page');
        return null;
    }
    const xml = await fetch(`${track.baseUrl}&fromExt=true&c=WEB&pot=${pot}`).then(r => r.text());
    const bodyContent = processSubtitles(xml);
    return buildAIPrompt(bodyContent);
};

// ====================================================================
// SECTION 3: YOUTUBE UI INTEGRATION
// ====================================================================

const getLabel = track =>
    track?.name?.simpleText ||
    track?.name?.runs?.map(r => r.text).join('') ||
    track?.languageName?.simpleText ||
    track?.languageCode ||
    'Unknown';

const createUI = tracks => {
    $('#captionDownloadContainer')?.remove();
    const div = Object.assign(document.createElement('div'), {
        id: 'captionDownloadContainer',
        style: 'padding:10px 5px 10px 0;margin:10px 0;font-size:15px'
    });

    if (!tracks?.length) {
        div.textContent = 'No subtitles found';
    } else {
        div.append('Actions: ');
        tracks.forEach(track => {
            const label = getLabel(track);

            // Process & Send Button
            const sendBtn = Object.assign(document.createElement('a'), {
                textContent: `[Process & Send ${label} to AI]`,
                href: '#',
                style: 'margin-left:10px;cursor:pointer;color:mediumpurple;font-weight:bold;text-decoration:underline',
                onclick: async (e) => {
                    e.preventDefault();
                    const content = await getAndProcessSubs(track);
                    if (content) sendToAI(content);
                }
            });

            // Copy Button
            const copyBtn = Object.assign(document.createElement('a'), {
                textContent: `[Copy]`,
                href: '#',
                style: 'margin-left:8px;cursor:pointer;color:teal;font-weight:bold;text-decoration:underline',
                onclick: async (e) => {
                    e.preventDefault();
                    const content = await getAndProcessSubs(track);
                    if (content) copyToClipboard(content);
                }
            });

            div.append(sendBtn, copyBtn);
        });
    }

    const target = $('#bottom-row') || $('#meta #meta-contents #container #top-row');
    target?.parentNode?.insertBefore(div, target);
};

const getSubs = async videoId => {
    try {
        const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`).then(r => r.text());
        const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
        const tracks = match ? JSON.parse(match[1])?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [] : [];
        createUI(tracks);
    } catch (e) {
        console.error(e);
        createUI([]);
    }
};

let url = '';
const check = () => {
    if (location.href === url) return;
    url = location.href;
    const videoId = getVideoId();
    videoId ? getSubs(videoId) : $('#captionDownloadContainer')?.remove();
};

setInterval(check, 500);
check();
