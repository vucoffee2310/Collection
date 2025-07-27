// js/modules/ui.js
// Handles creating, managing, and removing all UI elements on the page.
// Depends on YSD_CONFIG, YSD_UTILS, and YSD_Youtube.

const YSD_UI = {
    insertPosition: null,
    copyToClipboardEnabled: false,

    canInsert() {
        for (const selector of YSD_CONFIG.INSERTION_POINT_SELECTORS) {
            this.insertPosition = document.querySelector(selector);
            if (this.insertPosition) return true;
        }
        return false;
    },

    buildGui(captionTracks) {
        this.removeIfAlreadyExists();

        const mainContainer = this._createOutterContainer('Subtitle: ', YSD_CONFIG.CONTAINER_ID);
        captionTracks.forEach(track => {
            const link = this._createDownloadLink(track);
            mainContainer.appendChild(link);
        });

        const toggleContainer = this._createToggleCheckbox();
        const processedContainer = this._createOutterContainer('', YSD_CONFIG.PROCESSED_LINKS_CONTAINER_ID);
        processedContainer.style.cssText = 'padding: 10px 5px 10px 0; margin: 0 0 10px 0; color: green; font-size: 15px; line-height: 1.5;';

        this._addToCurrentPage(mainContainer);
        this._addToCurrentPage(toggleContainer);
        this._addToCurrentPage(processedContainer);
    },

    displayProcessedFileLinks(outputs, baseFileName) {
        const container = document.getElementById(YSD_CONFIG.PROCESSED_LINKS_CONTAINER_ID);
        if (!container) return;
        container.innerHTML = 'Processed files: ';

        const createLink = (text, title, fileName, data) => {
            const link = document.createElement('a');
            link.textContent = text;
            link.href = 'javascript:;';
            link.title = title;
            link.style.cssText = 'margin-left: 10px; cursor: pointer; color: #007bff; text-decoration: underline; background: transparent; border: none; font-size: 15px;';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                YSD_UTILS.saveTextAsFile(data, fileName);
                if (this.copyToClipboardEnabled) YSD_UTILS.copyToClipboard(data, link);
            });
            return link;
        };

        container.appendChild(createLink('original subtitle to md', 'Download prose Markdown and copy if enabled', baseFileName + '.md', outputs.markdownProse));
        container.appendChild(document.createTextNode(' - '));
        container.appendChild(createLink('original subtitle to html', 'Download processed HTML and copy if enabled', baseFileName + '.html', outputs.htmlOutput));
        container.appendChild(document.createTextNode(' - '));
        container.appendChild(createLink('original subtitle to xml', 'Download processed XML and copy if enabled', baseFileName + '.xml', outputs.xmlOutput));
        container.appendChild(document.createTextNode(' - '));
        container.appendChild(createLink('original subtitle to json', 'Download processed JSON and copy if enabled', baseFileName + '.json', outputs.jsonOutput));
        
        const mediumKeysBtn = document.createElement('button');
        mediumKeysBtn.textContent = 'Copy & Download mediumKeys (array)';
        mediumKeysBtn.title = 'Copy and download the array of all mediumKeys used (JSON)';
        mediumKeysBtn.style.cssText = 'margin-left: 10px; cursor: pointer; color: #fff; background: #007bff; border: none; border-radius: 3px; padding: 3px 8px; font-size: 14px;';
        mediumKeysBtn.addEventListener('click', () => {
            const keysArray = outputs.allMediumKeys || [];
            const keysJson = JSON.stringify(keysArray);
            YSD_UTILS.saveTextAsFile(keysJson, baseFileName + '.mediumKeys.json');
            if (this.copyToClipboardEnabled) YSD_UTILS.copyToClipboard(keysJson, mediumKeysBtn);
        });
        container.appendChild(mediumKeysBtn);
    },

    notifyNotFound() {
        this.removeIfAlreadyExists();
        const container = this._createOutterContainer('No subtitle', YSD_CONFIG.CONTAINER_ID);
        this._addToCurrentPage(container);
    },

    removeIfAlreadyExists() {
        [YSD_CONFIG.CONTAINER_ID, YSD_CONFIG.PROCESSED_LINKS_CONTAINER_ID, YSD_CONFIG.TOGGLE_CONTAINER_ID].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    },

    // --- "Private" Helper Methods ---
    _addToCurrentPage(container) {
        if (this.insertPosition && this.insertPosition.parentNode) {
            this.insertPosition.parentNode.insertBefore(container, this.insertPosition);
        }
    },

    _createOutterContainer(text, id) {
        const container = document.createElement('div');
        container.id = id;
        container.style.cssText = 'padding: 10px 5px 10px 0; margin: 0 0 10px 0; color: blue; font-size: 15px; line-height: 1.5;';
        container.textContent = text;
        return container;
    },

    _createDownloadLink(track) {
        const link = document.createElement('a');
        link.textContent = track.name.simpleText;
        link.href = 'javascript:;';
        link.title = 'Please click to download SRT and generate processed files';
        link.style.cssText = 'margin-left: 10px; cursor: pointer; color: red; text-decoration: underline; background: transparent; border: none; font-size: 15px;';
        link.addEventListener('click', () => {
            YSD_Youtube.downloadCaptionFile(track, this.displayProcessedFileLinks.bind(this));
        });
        return link;
    },

    _createToggleCheckbox() {
        const container = this._createOutterContainer('', YSD_CONFIG.TOGGLE_CONTAINER_ID);
        container.style.cssText = 'padding: 0px 5px 10px 0; margin: 0; font-size: 14px; color: blue; line-height: 1.5;';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'copyToggleCheckbox';
        checkbox.checked = this.copyToClipboardEnabled;
        checkbox.style.cssText = 'margin-right: 5px; vertical-align: middle;';
        checkbox.addEventListener('change', (e) => {
            this.copyToClipboardEnabled = e.target.checked;
            YSD_UTILS.saveCopySetting(this.copyToClipboardEnabled);
        });

        const label = document.createElement('label');
        label.htmlFor = 'copyToggleCheckbox';
        label.textContent = 'Also copy to clipboard when clicking a processed file link';
        label.style.cssText = 'cursor: pointer; font-weight: normal; color: #333; vertical-align: middle;';

        container.appendChild(checkbox);
        container.appendChild(label);
        return container;
    }
};