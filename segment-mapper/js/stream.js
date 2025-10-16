import { StreamingParser } from './parser.js';

export class AIStream {
    // Accepts a single object containing all its dependencies
    constructor(dependencies) {
        this.API_KEY = "AIzaSyBjTyQ0kUUoLzkM4Qv3Bq5pT6QudSNGOSI";
        this.API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${this.API_KEY}`;
        
        // Assign dependencies from the passed object
        this.mapper = dependencies.mapper;
        this.sourceInputElement = dependencies.sourceInputElement;
        this.logger = dependencies.logger;
        this.buttonElement = dependencies.buttonElement;
        this.requestDetailsEl = dependencies.requestDetailsEl;
        this.requestDataEl = dependencies.requestDataEl;
        this.responseDetailsEl = dependencies.responseDetailsEl;
        this.responseDataStreamEl = dependencies.responseDataStreamEl;
        
        this.parser = new StreamingParser();
        this.running = false;
        this.abortController = null;
    }

    // ... all other methods are unchanged
    toggle() { if (this.running) this.stop(); else this.start(); }
    start() {
        if (this.running) return;
        const fullPrompt = this.sourceInputElement.value;
        if (!fullPrompt.trim()) {
            this.logger.error('Source input cannot be empty.');
            alert('Source input cannot be empty.');
            return;
        }
        this.clearUIDisplays();
        this.logger.info('Starting generation process...');
        this.running = true;
        this.updateButton();
        this.mapper.reset();
        this.parser.reset();
        this.abortController = new AbortController();
        const payload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 1.6,
                thinkingConfig: { thinkingBudget: 500 },
                topP: 0.4,
            }
        };
        const fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload, null, 2),
            signal: this.abortController.signal
        };
        this.displayRequestDetails(this.API_URL, fetchOptions);
        this.logger.info("Sending request to AI...");
        fetch(this.API_URL, fetchOptions)
        .then(response => {
            this.displayResponseDetails(response);
            if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
            this.logger.info(`Received response stream (${response.status}).`);
            return response.body.getReader();
        })
        .then(reader => this.processStream(reader))
        .catch(error => {
            if (error.name === 'AbortError') {
                this.logger.warn('Stream fetch aborted by user.');
            } else {
                this.logger.error(`Error fetching AI stream: ${error.message}`);
                alert(`An error occurred: ${error.message}`);
            }
            this.stop();
        });
    }
    stop() {
        if (!this.running) return;
        if (this.abortController) this.abortController.abort();
        this.running = false;
        this.updateButton();
        this.logger.warn("Process stopped.");
    }
    async processStream(reader) {
        const decoder = new TextDecoder();
        let leftover = "";
        while (this.running) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = leftover + decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            leftover = lines.pop();
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            this.responseDataStreamEl.textContent += text;
                            this.responseDataStreamEl.scrollTop = this.responseDataStreamEl.scrollHeight;
                            this.logger.chunk(`CHUNK: ${text.replace(/\n/g, ' ')}`);
                            const newSegments = this.parser.feed(text);
                            if (newSegments.length > 0) this.mapper.addTargetBatch(newSegments);
                        }
                    } catch (e) { /* Ignore */ }
                }
            }
            this.mapper.setTargetPartial(this.parser.getPending());
        }
        const final = this.parser.finalize();
        if (final.length > 0) this.mapper.addTargetBatch(final);
        this.mapper.setTargetPartial(null);
        this.logger.info("AI Stream Finished.");
        this.stop();
    }
    updateButton() { this.buttonElement.textContent = this.running ? 'Stop Generation' : 'Generate & Map'; }
    clearUIDisplays() {
        this.logger.clear();
        this.requestDetailsEl.textContent = '...';
        this.requestDataEl.textContent = '...';
        this.responseDetailsEl.textContent = '...';
        this.responseDataStreamEl.textContent = '';
    }
    displayRequestDetails(url, options) {
        const requestObj = { URL: url, Method: options.method, Headers: options.headers };
        this.requestDetailsEl.textContent = JSON.stringify(requestObj, null, 2);
        this.requestDataEl.textContent = options.body;
    }
    displayResponseDetails(response) {
        const responseObj = {
            Status: response.status,
            StatusText: response.statusText,
            OK: response.ok,
            Headers: Object.fromEntries(response.headers.entries())
        };
        this.responseDetailsEl.textContent = JSON.stringify(responseObj, null, 2);
    }
}
