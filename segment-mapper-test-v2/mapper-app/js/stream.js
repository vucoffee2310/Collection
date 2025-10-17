import { StreamingParser } from './parser.js';

export class AIStream {
    constructor(dependencies) {
        this.API_KEY = "AIzaSyCTpoqrJt3e7tSmo7-LS2fPAHlUPDEe9Zk";
        this.API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${this.API_KEY}`;
        
        this.mapper = dependencies.mapper;
        this.logger = dependencies.logger;
        this.sourceInputElement = dependencies.sourceInputElement;
        this.sendToDebugWindow = dependencies.sendToDebugWindow;
        
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
        
        // Performance optimization: batch segment updates
        this.segmentQueue = [];
        this.processingSegments = false;
        
        // Throttle partial updates
        this.lastPartialUpdate = 0;
        this.partialUpdateThrottle = 200; // ms
    }

    toggle() { 
        if (this.running) this.stop('Aborted'); 
        else this.start(); 
    }

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
        
        // Notify debug window to reset
        this.sendToDebugWindow('RESET', {});
        
        this.startTime = performance.now();
        this.generationSummary = { 
            status: 'In Progress...', 
            chunksReceived: 0,
            segmentsParsed: 0,
            finishReason: null
        };
        this.displayGenerationSummary();

        this.running = true;
        this.updateButton();
        this.mapper.reset();
        this.parser.reset();
        this.segmentQueue = [];
        this.abortController = new AbortController();

        const payload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 1.5,
                thinkingConfig: { thinkingBudget: 500 },
                topP: 0.5,
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
        .then(async (response) => {
            this.displayNetworkResponseDetails(response);
            if (!response.ok) {
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
            if (status === 'Error') {
                this.logger.error(error.message);
                alert(error.message);
            }
            this.stop(status, error.message);
        });
    }
    
    async _createApiError(response) {
        let errorDetails = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorDetails += `\n\nDetails:\n${JSON.stringify(errorData, null, 2)}`;
        } catch (e) {
            const errorText = await response.text();
            if (errorText) {
                errorDetails += `\n\nResponse Body:\n${errorText}`;
            }
        }
        return new Error(errorDetails);
    }

    stop(finalStatus, errorMessage = '') {
        if (!this.running) return;
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort();
        }
        this.running = false;
        this.updateButton();
        
        // Process any remaining segments
        if (this.segmentQueue.length > 0) {
            this.processSegmentQueue();
        }
        
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
        let chunkCount = 0;
        
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
                            // Update response data stream
                            this.responseDataStreamEl.textContent += text;
                            this.responseDataStreamEl.scrollTop = this.responseDataStreamEl.scrollHeight;
                            
                            // Throttle log updates
                            if (chunkCount % 5 === 0) {
                                this.logger.chunk(`CHUNK: ${text.substring(0, 50).replace(/\n/g, ' ')}...`);
                            }
                            
                            // Parse segments
                            const newSegments = this.parser.feed(text);
                            if (newSegments.length > 0) {
                                this.queueSegments(newSegments);
                            }
                            
                            this.generationSummary.chunksReceived++;
                            chunkCount++;
                            
                            // Throttle partial updates
                            const now = performance.now();
                            if (now - this.lastPartialUpdate > this.partialUpdateThrottle) {
                                const pending = this.parser.getPending();
                                if (pending) {
                                    this.mapper.setTargetPartial(pending);
                                }
                                this.lastPartialUpdate = now;
                            }
                        }
                    } catch (e) { 
                        // Ignore parse errors
                    }
                }
            }
        }
        
        // Finalize
        const final = this.parser.finalize();
        if (final.length > 0) {
            this.queueSegments(final);
        }
        
        // Process remaining queue
        this.processSegmentQueue();
        
        this.mapper.setTargetPartial(null);
        this.mapper.finalize();
    }
    
    queueSegments(segments) {
        this.segmentQueue.push(...segments);
        
        if (!this.processingSegments) {
            this.processingSegments = true;
            // Use microtask for better performance
            queueMicrotask(() => this.processSegmentQueue());
        }
    }
    
    processSegmentQueue() {
        if (this.segmentQueue.length === 0) {
            this.processingSegments = false;
            return;
        }
        
        // Process in batches
        const batchSize = 5;
        const batch = this.segmentQueue.splice(0, batchSize);
        
        this.generationSummary.segmentsParsed += batch.length;
        this.mapper.addTargetBatch(batch);
        
        // Send to debug window (batched)
        batch.forEach(segment => {
            this.sendToDebugWindow('TARGET_SEGMENT', { segment });
        });
        
        // Continue processing if more segments exist
        if (this.segmentQueue.length > 0) {
            requestAnimationFrame(() => this.processSegmentQueue());
        } else {
            this.processingSegments = false;
        }
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