export class DebugLogger {
    constructor() {
        this.reqInfoEl = document.getElementById('debug-request-info');
        this.reqBodyEl = document.getElementById('debug-request-body');
        this.resInfoEl = document.getElementById('debug-response-info');
        this.resStreamEl = document.getElementById('debug-response-stream');
    }

    clearAll() {
        this.reqInfoEl.textContent = '';
        this.reqBodyEl.textContent = '';
        this.resInfoEl.textContent = '';
        this.resStreamEl.textContent = '';
    }

    logRequest(url, options) {
        const info = {
            method: options.method,
            url: url,
            headers: options.headers,
        };
        this.reqInfoEl.textContent = JSON.stringify(info, null, 2);

        // Pretty-print the JSON body
        try {
            const bodyObject = JSON.parse(options.body);
            this.reqBodyEl.textContent = JSON.stringify(bodyObject, null, 2);
        } catch (e) {
            this.reqBodyEl.textContent = options.body; // Fallback for non-JSON
        }
    }

    logResponseInfo(response) {
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        const info = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: headers,
        };
        this.resInfoEl.textContent = JSON.stringify(info, null, 2);
    }

    logResponseChunk(chunk) {
        this.resStreamEl.textContent += chunk;
        // Auto-scroll to the bottom
        this.resStreamEl.scrollTop = this.resStreamEl.scrollHeight;
    }
}
