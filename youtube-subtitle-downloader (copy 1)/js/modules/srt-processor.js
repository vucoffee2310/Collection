// js/modules/srt-processor.js
// Handles the advanced logic for processing raw SRT text into structured article formats.
// Depends on YSD_CONFIG and YSD_UTILS.

const YSD_SrtProcessor = {
    // Main public method
    generateGroupedOutputsFromSrt(rawSrtText, baseFileName) {
        const config = YSD_CONFIG.scriptConfig;
        const random = YSD_UTILS.createSeededRandom(config.randomSeed);
        const preparedData = this._prepareDataForGrouping(rawSrtText, config);
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

        const keysStructure = this._generateKeys(large_groups, config, random);
        return this._buildAllOutputs(large_groups, keysStructure, baseFileName);
    },

    // --- "Private" Helper Methods ---

    _prepareDataForGrouping(rawSrtText, config) {
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

                // FIX: Added YSD_UTILS. prefix
                const prevGap = prevEntry
                    ? YSD_UTILS.srtTimeToMs(current.time.split(' --> ')[0]) - YSD_UTILS.srtTimeToMs(prevEntry.time.split(' --> ')[1])
                    : Infinity;
                // FIX: Added YSD_UTILS. prefix
                const nextGap = nextEntry
                    ? YSD_UTILS.srtTimeToMs(nextEntry.time.split(' --> ')[0]) - YSD_UTILS.srtTimeToMs(current.time.split(' --> ')[1])
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
    },

    _generateKeys(largeGroupsStructure, config, random) {
        // ... (This function has no external calls, so it's OK) ...
        const generateRandomKey = (length) =>
            Array.from({ length }, () => config.keyChars.charAt(Math.floor(random() * config.keyChars.length))).join('');

        const usedLargeKeys = new Set();
        const largeKeys = [];
        while (largeKeys.length < largeGroupsStructure.length) {
            const key = generateRandomKey(config.largeKeyLen);
            if (!usedLargeKeys.has(key)) {
                usedLargeKeys.add(key);
                largeKeys.push(key);
            }
        }

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
    },

    _buildAllOutputs(largeGroups, keysStructure, baseFileName) {
        const { largeKeys, mediumKeysNested } = keysStructure;
        const outputs = {
            htmlParts: [],
            markdownProseParts: [],
            xmlEntryParts: [],
            jsonArticleContent: []
        };
        const staticEntries = [
            { id: "ABCDEF", transcript: "John (A) introduced himself and expressed his (B)" },
            { id: "NOPQRS", transcript: "delight at meeting the listener. (C)" }
        ];

        for (const entry of staticEntries) {
            outputs.jsonArticleContent.push({ id: entry.id, transcript: entry.transcript });
            outputs.markdownProseParts.push(`  - **id**: "${entry.id}"\n  - **transcript**: ${entry.transcript}\n`);
            // FIX: Added YSD_UTILS. prefix
            outputs.htmlParts.push(`<p>${YSD_UTILS.htmlEscape(entry.transcript)}</p>\n<br>`);
            // FIX: Added YSD_UTILS. prefix
            outputs.xmlEntryParts.push(`    <entry>\n      <key>${entry.id}</key>\n      <paragraph>${YSD_UTILS.htmlEscape(entry.transcript)}</paragraph>\n    </entry>`);
        }

        for (const [i, largeGroup] of largeGroups.entries()) {
            const largeKey = largeKeys[i];
            const concatenatedParts = [];

            for (const [j, mediumGroup] of largeGroup.entries()) {
                const mediumText = mediumGroup.map(utt => utt[2]).join(' ').trim();
                const mediumKey = mediumKeysNested[i][j];
                let partWithKey;

                if (i === 0 && j === 0) {
                    partWithKey = `(Hello) ${mediumText} (${mediumKey})`;
                } else {
                    partWithKey = `${mediumText} (${mediumKey})`;
                }
                concatenatedParts.push(partWithKey);
            }
            const concatenatedText = concatenatedParts.join(' ');
            // FIX: Added YSD_UTILS. prefix
            outputs.htmlParts.push(`<p>${YSD_UTILS.htmlEscape(concatenatedText)}</p>\n<br>`);
            // FIX: Added YSD_UTILS. prefix
            outputs.xmlEntryParts.push(`    <entry>\n      <key>${largeKey}</key>\n      <paragraph>${YSD_UTILS.htmlEscape(concatenatedText)}</paragraph>\n    </entry>`);
            outputs.markdownProseParts.push(`  - **id**: "${largeKey}"\n  - **transcript**: ${concatenatedText}\n`);
            outputs.jsonArticleContent.push({ id: largeKey, transcript: concatenatedText });
        }

        const mainArticleContent = outputs.markdownProseParts.join('\n');
        const today = new Date().toISOString();

        // --- BUILD MARKDOWN OUTPUT ---
        const markdownFileContent = `### **METADATA**\n\n- **title**: "Các khía cạnh chính (A) và Nội dung chính (B)"\n- **date**: \`${today.split('T')[0]}\`\n- **slug**: "key-content-aspects-for-article"\n- **layout**: "bài viết trực tiếp (C)"\n- **tags**: ["key", "content", "article", "aspects"]\n\n### **AUTHOR INFO**\n\n- **authors**: \n  - **name**: "John Smith"\n  - **url**:\n    - **ref**: "curator-url"\n  - **avatar**:\n    - **ref**: "curator-avatar"\n\n---\n\n### **MAIN ARTICLE CONTENT**\n\n${mainArticleContent}\n---\n\n### **PAGE SETTINGS**\n\n- **show_toc**: \`true\`\n- **show_author_box**: \`true\`\n- **enable_comments**: \`true\`\n\n### **CENTRAL LINK & IMAGE DEFINITIONS**\n\n- **reference_definitions**:\n  - **curator-url**: "https://johnsmith.com"\n  - **curator-avatar**: "/img/authors/john-smith.jpg"`;
        outputs.markdownProse = `Translate into Vietnamese\n\n\`\`\`markdown\n${markdownFileContent}\n\`\`\``;

        // --- BUILD JSON OUTPUT ---
        const jsonObject = {
          metadata: { title: "Các khía cạnh chính (A) và Nội dung chính (B)", date: today, slug: "key-content-aspects-for-article", layout: "bài viết trực tiếp (C)", tags: ["chính", "nội dung", "bài viết", "khía cạnh"] },
          author_info: { authors: [{ name: "John Smith", url: { ref: "curator-url" }, avatar: { ref: "curator-avatar" } }] },
          main_article_content: outputs.jsonArticleContent,
          page_settings: { show_toc: "true", show_author_box: "true", enable_comments: "true" },
          central_link_image_definitions: { reference_definitions: { "curator-url": "https://johnsmith.com", "curator-avatar": "/img/authors/john-smith.jpg" } }
        };
        outputs.jsonOutput = `Translate into Vietnamese\n\n\`\`\`json\n` + JSON.stringify(jsonObject, null, 2) + `\n\`\`\`\n`;

        // --- BUILD HTML OUTPUT ---
        outputs.htmlOutput = `Translate into Vietnamese\n\n\`\`\`html\n<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Các khía cạnh chính (A) và Nội dung chính (B)</title>\n<style>\nbody {font-family: sans-serif; line-height: 1.6;}\nbr {margin-bottom: 1em;}\np {margin-top: 0;}\n</style>\n</head>\n<body>\n${outputs.htmlParts.join('\n')}\n</body>\n</html>\n\`\`\``;

        // --- BUILD XML OUTPUT ---
        // FIX: Added YSD_UTILS. prefix
        const xmlMetadata = `  <metadata>\n    <title>${YSD_UTILS.htmlEscape("Các khía cạnh chính (A) và Nội dung chính (B)")}</title>\n    <date>${today}</date>\n    <layout>${YSD_UTILS.htmlEscape("bài viết trực tiếp (C)")}</layout>\n    <slug>key-content-aspects-for-article</slug>\n    <tags>\n      <tag>key</tag>\n      <tag>content</tag>\n      <tag>article</tag>\n      <tag>aspects</tag>\n    </tags>\n    <authors>\n      <author>\n        <name>John Smith</name>\n        <url>https://johnsmith.com</url>\n        <avatar>/img/authors/john-smith.jpg</avatar>\n      </author>\n    </authors>\n    <primary_contact>\n      <author>\n        <name>John Smith</name>\n        <url>https://johnsmith.com</url>\n        <avatar>/img/authors/john-smith.jpg</avatar>\n      </author>\n    </primary_contact>\n    <toc>1</toc>\n    <dy_rd_te>false</dy_rd_te>\n    <dy_ar_bo>true</dy_ar_bo>\n  </metadata>`;
        outputs.xmlOutput = `Translate into Vietnamese\n\`\`\`xml\n<?xml version="1.0" encoding="UTF-8"?>\n<document>\n${xmlMetadata}\n  <content>\n${outputs.xmlEntryParts.join('\n')}\n  </content>\n</document>\n\`\`\`\n`;

        // --- FINAL CLEANUP ---
        outputs.allMediumKeys = [].concat(...(keysStructure.mediumKeysNested || []));
        delete outputs.htmlParts;
        delete outputs.markdownProseParts;
        delete outputs.xmlEntryParts;
        delete outputs.jsonArticleContent;
        return outputs;
    }
};