import { StreamingParser } from './parser.js';

export class AIStream {
    constructor(dependencies) {
        this.API_KEY = "AIzaSyBjTyQ0kUUoLzkM4Qv3Bq5pT6QudSNGOSI";
        this.API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${this.API_KEY}`;
        
        this.mapper = dependencies.mapper;
        this.logger = dependencies.logger;
        this.sourceInputElement = dependencies.sourceInputElement;
        
        this.buttonElement = dependencies.buttonElement;
        this.requestDetailsEl = dependencies.requestDetailsEl;
        this.requestDataEl = dependencies.requestDataEl;
        this.networkResponseDetailsEl = dependencies.networkResponseDetailsEl;
        this.generationSummaryEl = dependencies.generationSummaryEl;
        this.responseDataStreamEl = dependencies.responseDataStreamEl;
        
        this.parser = new StreamingParser();
        this.running = false;
        this.abortController = null;
        this.startTime = 0;
        this.generationSummary = {};
    }

    toggle() { if (this.running) this.stop('Aborted'); else this.start(); }

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
        
        this.startTime = performance.now();
        this.generationSummary = { status: 'In Progress...', /* ... */ };
        this.displayGenerationSummary();

        this.running = true;
        this.updateButton();
        this.mapper.reset();
        this.parser.reset();
        this.abortController = new AbortController();

        const payload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 1.4,
                thinkingConfig: { thinkingBudget: 600 },
                topP: 0.6,
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

        // --- START: REVISED FETCH LOGIC ---
        fetch(this.API_URL, fetchOptions)
        .then(async (response) => { // Make this callback async to use await
            this.displayNetworkResponseDetails(response);
            if (!response.ok) {
                // If response is not OK, process the error body before throwing
                throw await this._createApiError(response);
            }
            this.logger.info(`Received response stream (${response.status}).`);
            return response.body.getReader();
        })
        .then(reader => this.processStream(reader))
        .then(() => {
            this.stop('Completed');
        })
        .catch(error => {
            const status = error.name === 'AbortError' ? 'Aborted' : 'Error';
            // The error.message now contains our detailed string
            if (status === 'Error') {
                this.logger.error(error.message); // Log the full detailed error
                alert(error.message); // Show the full detailed error
            }
            this.stop(status, error.message);
        });
        // --- END: REVISED FETCH LOGIC ---
    }
    
    // --- START: NEW HELPER METHOD FOR ERROR HANDLING ---
    /**
     * Creates a detailed error object from a failed API response.
     * @param {Response} response The failed fetch response object.
     * @returns {Error} A new Error object with detailed information.
     */
    async _createApiError(response) {
        let errorDetails = `API Error: ${response.status} ${response.statusText}`;
        try {
            // Attempt to parse the body as JSON for structured error info from the API
            const errorData = await response.json();
            errorDetails += `\n\nDetails:\n${JSON.stringify(errorData, null, 2)}`;
        } catch (e) {
            // If JSON parsing fails, the body might be plain text or HTML (e.g., from a gateway)
            const errorText = await response.text();
            if (errorText) {
                errorDetails += `\n\nResponse Body:\n${errorText}`;
            }
        }
        return new Error(errorDetails);
    }
    // --- END: NEW HELPER METHOD ---

    stop(finalStatus, errorMessage = '') {
        if (!this.running) return;
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort();
        }
        this.running = false;
        this.updateButton();
        if (finalStatus !== 'Aborted' && finalStatus !== 'Error') {
             this.logger.info(`Process finished with status: ${finalStatus}`);
        } else if (finalStatus === 'Aborted') {
            this.logger.warn("Process stopped by user.");
        }

        this.finalizeSummary(finalStatus, errorMessage);
        this.displayGenerationSummary();
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
                        if (data.candidates?.[0]?.finishReason) {
                            this.generationSummary.finishReason = data.candidates[0].finishReason;
                        }
                        if (text) {
                            this.responseDataStreamEl.textContent += text;
                            this.responseDataStreamEl.scrollTop = this.responseDataStreamEl.scrollHeight;
                            this.logger.chunk(`CHUNK: ${text.replace(/\n/g, ' ')}`);
                            const newSegments = this.parser.feed(text);
                            if (newSegments.length > 0) {
                                this.generationSummary.segmentsParsed += newSegments.length;
                                this.mapper.addTargetBatch(newSegments);
                            }
                            this.generationSummary.chunksReceived++;
                        }
                    } catch (e) { /* Ignore */ }
                }
            }
            this.mapper.setTargetPartial(this.parser.getPending());
        }
        const final = this.parser.finalize();
        if (final.length > 0) {
            this.generationSummary.segmentsParsed += final.length;
            this.mapper.addTargetBatch(final);
        }
        this.mapper.setTargetPartial(null);
        this.mapper.finalize();
    }
    
    finalizeSummary(status, errorMessage) {
        const duration = ((performance.now() - this.startTime) / 1000).toFixed(2);
        this.generationSummary.status = status;
        this.generationSummary.duration = `${duration} seconds`;
        if (errorMessage) {
            this.generationSummary.errorDetails = errorMessage;
        }
    }

    displayGenerationSummary() {
        if (this.generationSummaryEl) {
            this.generationSummaryEl.textContent = JSON.stringify(this.generationSummary, null, 2);
        }
    }

    updateButton() {
        this.buttonElement.textContent = this.running ? 'Stop Generation' : 'Generate & Map';
    }

    clearUIDisplays() {
        this.logger.clear();
        this.requestDetailsEl.textContent = '...';
        this.requestDataEl.textContent = '...';
        this.networkResponseDetailsEl.textContent = '...';
        this.generationSummaryEl.textContent = '...';
        this.responseDataStreamEl.textContent = '';
    }
    
    displayRequestDetails(url, options) {
        const requestObj = { URL: url, Method: options.method, Headers: options.headers };
        this.requestDetailsEl.textContent = JSON.stringify(requestObj, null, 2);
        this.requestDataEl.textContent = options.body;
    }
    
    displayNetworkResponseDetails(response) {
        const responseObj = {
            Status: response.status,
            StatusText: response.statusText,
            OK: response.ok,
            Headers: Object.fromEntries(response.headers.entries())
        };
        this.networkResponseDetailsEl.textContent = JSON.stringify(responseObj, null, 2);
    }
}
