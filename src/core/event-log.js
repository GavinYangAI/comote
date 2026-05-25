/**
 * In-memory ring buffer of diagnostic events for the settings UI Logs panel.
 * Events are ephemeral by design — they are not persisted across daemon restarts.
 */
export class EventLog {
  constructor({ capacity = 200, entries = [] } = {}) {
    this.capacity = capacity;
    this.entries = entries.slice(-capacity).map((entry) => ({ ...entry }));
    this.sequence = this.entries.reduce((max, entry) => Math.max(max, entry.id ?? 0), 0);
  }

  // Chronological (oldest-first) snapshot for persistence.
  snapshot() {
    return this.entries.map((entry) => ({ ...entry }));
  }

  record(level, message, detail = null) {
    const entry = {
      id: ++this.sequence,
      at: new Date().toISOString(),
      level,
      message: String(message ?? ""),
      ...(detail == null ? {} : { detail }),
    };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.splice(0, this.entries.length - this.capacity);
    }
    return entry;
  }

  info(message, detail) {
    return this.record("info", message, detail);
  }

  warn(message, detail) {
    return this.record("warn", message, detail);
  }

  error(message, detail) {
    return this.record("error", message, detail);
  }

  list({ limit = 100, offset = 0 } = {}) {
    const newestFirst = this.entries.slice().reverse();
    return newestFirst.slice(offset, offset + limit).map((entry) => ({ ...entry }));
  }

  size() {
    return this.entries.length;
  }
}
