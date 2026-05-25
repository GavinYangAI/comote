import assert from "node:assert/strict";
import test from "node:test";

import { Transcript } from "../src/core/transcript.js";

test("transcript records user and assistant messages per thread", () => {
  const transcript = new Transcript();
  transcript.record("thread_1", "user", "fix the bug");
  transcript.record("thread_1", "assistant", "done");
  const threads = transcript.list();
  assert.equal(threads.length, 1);
  assert.equal(threads[0].threadId, "thread_1");
  assert.deepEqual(
    threads[0].messages.map((m) => [m.role, m.text]),
    [
      ["user", "fix the bug"],
      ["assistant", "done"],
    ],
  );
});

test("transcript caps messages per thread", () => {
  const transcript = new Transcript({ maxPerThread: 3 });
  for (let i = 0; i < 6; i += 1) {
    transcript.record("thread_1", "user", `msg ${i}`);
  }
  assert.deepEqual(
    transcript.list()[0].messages.map((m) => m.text),
    ["msg 3", "msg 4", "msg 5"],
  );
});

test("transcript ignores empty input and survives a snapshot round trip", () => {
  const transcript = new Transcript();
  transcript.record("thread_1", "user", "hello");
  transcript.record("", "user", "no thread");
  transcript.record("thread_1", "assistant", "");
  const restored = new Transcript({ entries: transcript.snapshot() });
  assert.equal(restored.list().length, 1);
  assert.equal(restored.list()[0].messages.length, 1);
});

test("listThread returns first page newest-first with correct total and hasMore:true", () => {
  const transcript = new Transcript();
  for (let i = 1; i <= 5; i++) {
    transcript.record("thread_a", "user", `msg${i}`);
  }
  const result = transcript.listThread("thread_a", { limit: 2, offset: 0 });
  assert.equal(result.threadId, "thread_a");
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].text, "msg5");
  assert.equal(result.messages[1].text, "msg4");
  assert.equal(result.total, 5);
  assert.equal(result.hasMore, true);
});

test("listThread returns last page with hasMore:false", () => {
  const transcript = new Transcript();
  for (let i = 1; i <= 5; i++) {
    transcript.record("thread_a", "user", `msg${i}`);
  }
  // offset 4 → only msg1 remains
  const result = transcript.listThread("thread_a", { limit: 2, offset: 4 });
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].text, "msg1");
  assert.equal(result.total, 5);
  assert.equal(result.hasMore, false);
});

test("listThread returns empty result for missing thread", () => {
  const transcript = new Transcript();
  const result = transcript.listThread("missing");
  assert.equal(result.threadId, "missing");
  assert.deepEqual(result.messages, []);
  assert.equal(result.total, 0);
  assert.equal(result.hasMore, false);
});

test("listThread returns copies of messages, not internal references", () => {
  const transcript = new Transcript();
  transcript.record("thread_b", "user", "hello");
  const result = transcript.listThread("thread_b", { limit: 10, offset: 0 });
  result.messages[0].text = "mutated";
  const again = transcript.listThread("thread_b", { limit: 10, offset: 0 });
  assert.equal(again.messages[0].text, "hello");
});
