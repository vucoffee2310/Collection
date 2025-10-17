export class Logger {
    // Accepts the DOM element directly instead of an ID
    constructor(element) {
        this.logElement = element;
        if (!this.logElement) {
            console.error(`Logger was initialized with a null element.`);
        }
    }

    _log(message, type = '', contentClass = '') {
        if (!this.logElement) return;
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const timestamp = new Date().toLocaleTimeString();
        const content = contentClass ? `<span class="${contentClass}">${message}</span>` : message;
        entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${content}`;
        this.logElement.appendChild(entry);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }
    log(message) { this._log(message); }
    info(message) { this._log(message, 'info'); }
    warn(message) { this._log(message, 'warn'); }
    error(message) { this._log(message, 'error'); }
    chunk(message) { this._log(message, '', 'log-chunk'); }
    clear() { if (this.logElement) this.logElement.innerHTML = ''; }
}