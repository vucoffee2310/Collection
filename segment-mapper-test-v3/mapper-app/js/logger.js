export class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 500; // Limit log entries to prevent memory issues
  }

  _log(message, type = "", contentClass = "") {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
      timestamp,
      message,
      type,
      contentClass,
    };

    this.logs.push(entry);

    // Trim old logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  log(message) {
    this._log(message);
  }
  info(message) {
    this._log(message, "info");
  }
  warn(message) {
    this._log(message, "warn");
  }
  error(message) {
    this._log(message, "error");
  }
  chunk(message) {
    this._log(message, "", "log-chunk");
  }

  clear() {
    this.logs = [];
  }

  getLogs() {
    return this.logs;
  }

  getLogsHTML() {
    if (this.logs.length === 0) {
      return '<div style="color: #888; font-style: italic;">No logs yet.</div>';
    }

    return this.logs
      .map((entry) => {
        const content = entry.contentClass
          ? `<span class="${entry.contentClass}">${this._escapeHtml(
              entry.message
            )}</span>`
          : this._escapeHtml(entry.message);

        return `<div class="log-entry ${entry.type}"><span class="timestamp">[${entry.timestamp}]</span> ${content}</div>`;
      })
      .join("");
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
