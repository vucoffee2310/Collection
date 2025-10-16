import { StreamingParser } from './parser.js';

export class AIStream {
    constructor(mapper, sourceInputElement, logger) {
        this.API_KEY = "AIzaSyBjTyQ0kUUoLzkM4Qv3Bq5pT6QudSNGOSI";
        this.API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse&key=${this.API_KEY}`;
        
        this.mapper = mapper;
        this.sourceInputElement = sourceInputElement;
        this.logger = logger; // Store the logger instance
        this.buttonElement = document.getElementById('btn');
        
        this.parser = new StreamingParser();
        this.running = false;
        this.abortController = null;
    }

    toggle() {
        if (this.running) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (this.running) return;

        const fullPrompt = this.sourceInputElement.value;
        if (!fullPrompt.trim()) {
            alert('Source input cannot be empty.');
            return;
        }
        
        this.running = true;
        this.updateButton();
        this.mapper.reset();
        this.parser.reset();
        this.logger.clearAll(); // Clear debug logs on start
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
            body: JSON.stringify(payload),
            signal: this.abortController.signal
        };

        this.logger.logRequest(this.API_URL, fetchOptions); // Log the request
        
        fetch(this.API_URL, fetchOptions)
        .then(response => {
            this.logger.logResponseInfo(response); // Log response headers
            if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
            return response.body.getReader();
        })
        .then(reader => this.processStream(reader))
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('Stream fetch aborted by user.');
            } else {
                console.error('Error fetching AI stream:', error);
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
    }

    async processStream(reader) {
        const decoder = new TextDecoder();
        let leftover = "";
        let batchBuffer = [];
        const batchSize = 3;

        while (this.running) {
            const { value, done } = await reader.read();
            if (done) break;

            const decodedChunk = decoder.decode(value, { stream: true });
            this.logger.logResponseChunk(decodedChunk); // Log raw stream chunk
            
            const chunk = leftover + decodedChunk;
            const lines = chunk.split('\n');
            leftover = lines.pop();

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            const newSegments = this.parser.feed(text);
                            if (newSegments.length > 0) batchBuffer.push(...newSegments);
                        }
                    } catch (e) { /* Ignore parsing errors */ }
                }
            }
            
            while (batchBuffer.length >= batchSize) {
                const batch = batchBuffer.splice(0, batchSize);
                this.mapper.addTargetBatch(batch);
            }
            this.mapper.setTargetPartial(this.parser.getPending());
        }

        if (batchBuffer.length > 0) this.mapper.addTargetBatch(batchBuffer);
        const final = this.parser.finalize();
        if (final.length > 0) this.mapper.addTargetBatch(final);
        
        this.mapper.setTargetPartial(null);
        console.log("\n--- AI Stream Finished ---");
        this.stop();
    }

    updateButton() {
        this.buttonElement.textContent = this.running ? 'Stop Generation' : 'Generate & Map';
    }
}
