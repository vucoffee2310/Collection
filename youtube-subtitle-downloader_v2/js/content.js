const $ = s => document.querySelector(s);
const getVideoId = () => new URL(location.href).searchParams.get('v');

// ====================================================================
// SECTION 1: CORE TEXT PROCESSING PIPELINE
// ====================================================================

function xmlToSingleParagraph(xml) {
    const characters = ['Q', 'Z', 'P', 'H', 'W', 'D', 'N', 'K', 'T', 'G', 'B', 'Y', 'V', 'S', 'U', 'R', 'J', 'E', 'O', 'M', 'C', 'L', 'X', 'A', 'F', 'I'];
    const utterances = new DOMParser().parseFromString(xml, 'text/xml').getElementsByTagName('text');
    let result = "";
    let markerCount = 0;
    Array.from(utterances).forEach((el, index) => {
        const text = (el.textContent || '').replace(/[\r\n]+/g, ' ').trim();
        if (!text) return;
        result += text + " ";
        if ((index + 1) % 5 === 0) {
            const charToInsert = characters[markerCount % characters.length];
            result += `(${charToInsert}) `;
            markerCount++;
        }
    });
    return result.trim();
};

function isBreakPointValid(text, index) {
  const textBefore = text.substring(0, index).trim();
  const textAfter = text.substring(index).trim();
  const isPrecededByMarker = textBefore.match(/\([A-Z]\)$/);
  const isSucceededByMarker = textAfter.match(/^\([A-Z]\)/);
  return !isPrecededByMarker && !isSucceededByMarker;
}

function breakIntoParagraphsRandomly(text, minLength = 150, maxLength = 500) {
  if (!text || typeof text !== 'string') return "";
  let remainingText = text.replace(/\s\s+/g, ' ').trim();
  const finalParagraphs = [];
  while (remainingText.length > 0) {
    if (remainingText.length <= maxLength) {
      finalParagraphs.push(remainingText);
      break;
    }
    let breakIndex = -1;
    const randomTargetLength = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let searchStart = randomTargetLength;
    while (breakIndex === -1 && searchStart >= minLength) {
        let potentialIndex = remainingText.lastIndexOf(' ', searchStart);
        if (potentialIndex < minLength) break; 
        if (isBreakPointValid(remainingText, potentialIndex)) {
            breakIndex = potentialIndex;
        }
        searchStart = potentialIndex - 1; 
    }
    if (breakIndex === -1) breakIndex = randomTargetLength;
    const newPara = remainingText.substring(0, breakIndex).trim();
    finalParagraphs.push(newPara);
    remainingText = remainingText.substring(breakIndex).trim();
  }
  return finalParagraphs.join('\n\n');
}

function processSubtitles(xml) {
    const singleLongParagraph = xmlToSingleParagraph(xml);
    const formattedParagraphs = breakIntoParagraphsRandomly(singleLongParagraph);
    return formattedParagraphs;
}

function addFrontmatterAndFooter(bodyContent) {
    const frontmatter = `Translate into Vietnamese\n\n\`\`\`\n---
title: My Third Blog Post
author: Astro Learner
description: "I had some challenges, but asking in the community really helped!"
image:
    url: "https://docs.astro.build/assets/rays.webp"
    alt: "The Astro logo on a dark background with rainbow rays."
pubDate: 2022-07-15
tags: ["astro", "learning in public", "setbacks", "community"]
---\n`;

    const footer = `\n---
Let's keep in touch to stay up to date with the latest updates from Astro. https://github.com/withastro/astro\n\`\`\``;
    return `${frontmatter}\n(Z) ${bodyContent}\n${footer}`;
}

// ====================================================================
// SECTION 2: ACTIONS (SEND TO AI)
// ====================================================================

const sendToAI = (content) => {
    const API_KEY = "AIzaSyAzddIKNOyH3qWYcdkAWNoKKobVzRa2RXQ"; // WARNING: Hardcoding keys is insecure.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${API_KEY}`;

    const payload = { // <--- Define the payload object here
        contents: [{
            role: "user",
            parts: [{ text: content }]
        }],
        generationConfig: {
            temperature: 0.8,
            topP: 0.9,
        }
    };

    console.log("Payload before sending to AI:");
    console.log(payload); // <--- Console log the payload

    console.log("Sending content to AI. Check console for streaming response...");
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload) // <--- Use the stringified payload
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
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
                const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (textContent) {
                    console.log(textContent);
                }
              } catch (e) {
                // Ignore empty or malformed data chunks
              }
            }
          }
          read();
        });
      }
      read();
    })
    .catch(error => console.error('Error sending to AI:', error));
};

const getAndProcessSubs = async (track) => {
    const { pot } = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getPot' }, resolve)) || {};
    if (!pot) {
        alert('Please enable subtitles and refresh the page');
        return null;
    }
    const xml = await fetch(`${track.baseUrl}&fromExt=true&c=WEB&pot=${pot}`).then(r => r.text());
    const bodyContent = processSubtitles(xml);
    return addFrontmatterAndFooter(bodyContent);
};

// ====================================================================
// SECTION 3: YOUTUBE PAGE INTERACTION & UI
// ====================================================================

const getLabel = track => track?.name?.simpleText || track?.name?.runs?.map(r => r.text).join('') || track?.languageName?.simpleText || track?.languageCode || 'Unknown';

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
            div.append(Object.assign(document.createElement('a'), {
                textContent: `[Process & Send ${getLabel(track)} to AI]`,
                title: 'Send formatted text to the AI for processing',
                href: 'javascript:void(0)',
                style: 'margin-left:10px;cursor:pointer;color:mediumpurple;font-weight:bold;text-decoration:underline',
                onclick: async () => {
                    const content = await getAndProcessSubs(track);
                    if(content) sendToAI(content);
                }
            }));
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