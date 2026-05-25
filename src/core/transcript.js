/**
 * Per-thread conversation history so the local UI can show what was said
 * over the phone bridge — user prompts and Codex replies, keyed by threadId.
 * Bounded and persisted; not a full event store.
 */
export class Transcript {
  constructor({ entries = [], maxPerThread = 50, maxThreads = 20 } = {}) {
    this.maxPerThread = maxPerThread;
    this.maxThreads = maxThreads;
    this.threads = new Map();
    for (const entry of entries) {
      if (!entry?.threadId) {
        continue;
      }
      this.threads.set(entry.threadId, {
        threadId: entry.threadId,
        updatedAt: entry.updatedAt ?? null,
        messages: (entry.messages ?? []).slice(-maxPerThread),
      });
    }
  }

  record(threadId, role, text) {
    if (!threadId || !text) {
      return;
    }
    let thread = this.threads.get(threadId);
    if (!thread) {
      thread = { threadId, updatedAt: null, messages: [] };
      this.threads.set(threadId, thread);
    }
    const now = new Date().toISOString();
    thread.messages.push({ role, text: String(text), at: now });
    if (thread.messages.length > this.maxPerThread) {
      thread.messages.splice(0, thread.messages.length - this.maxPerThread);
    }
    thread.updatedAt = now;
    if (this.threads.size > this.maxThreads) {
      const oldest = [...this.threads.values()].sort((a, b) =>
        (a.updatedAt ?? "").localeCompare(b.updatedAt ?? ""),
      )[0];
      if (oldest) {
        this.threads.delete(oldest.threadId);
      }
    }
  }

  list() {
    return [...this.threads.values()]
      .map((thread) => ({ ...thread, messages: thread.messages.map((message) => ({ ...message })) }))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }

  listThread(threadId, { limit = 20, offset = 0 } = {}) {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return { threadId, messages: [], total: 0, hasMore: false };
    }
    const newestFirst = thread.messages.slice().reverse();
    const page = newestFirst.slice(offset, offset + limit).map((m) => ({ ...m }));
    return {
      threadId,
      messages: page,
      total: thread.messages.length,
      hasMore: offset + page.length < thread.messages.length,
    };
  }

  snapshot() {
    return this.list();
  }
}
