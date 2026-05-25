import assert from "node:assert/strict";
import test from "node:test";

import { EventLog } from "../src/core/event-log.js";

test("EventLog list with offset returns correct page (no overlap)", () => {
  const log = new EventLog();
  log.record("info", "msg1");
  log.record("info", "msg2");
  log.record("info", "msg3");
  log.record("info", "msg4");
  log.record("info", "msg5");

  const firstPage = log.list({ limit: 2, offset: 0 });
  const secondPage = log.list({ limit: 2, offset: 2 });

  // newest-first: msg5, msg4 | msg3, msg2
  assert.equal(firstPage.length, 2);
  assert.equal(firstPage[0].message, "msg5");
  assert.equal(firstPage[1].message, "msg4");

  assert.equal(secondPage.length, 2);
  assert.equal(secondPage[0].message, "msg3");
  assert.equal(secondPage[1].message, "msg2");

  // No overlap between pages
  const firstIds = firstPage.map((e) => e.id);
  const secondIds = secondPage.map((e) => e.id);
  assert.equal(firstIds.filter((id) => secondIds.includes(id)).length, 0);
});

test("EventLog size() returns total recorded count", () => {
  const log = new EventLog();
  assert.equal(log.size(), 0);
  log.record("info", "a");
  log.record("warn", "b");
  log.record("error", "c");
  assert.equal(log.size(), 3);
});

test("EventLog list with offset=0 and large limit returns all entries newest-first", () => {
  const log = new EventLog();
  for (let i = 1; i <= 5; i++) {
    log.record("info", `entry${i}`);
  }
  const all = log.list({ limit: 10, offset: 0 });
  assert.equal(all.length, 5);
  assert.equal(all[0].message, "entry5");
  assert.equal(all[4].message, "entry1");
});

test("EventLog list at offset beyond total returns empty array", () => {
  const log = new EventLog();
  log.record("info", "only");
  const page = log.list({ limit: 10, offset: 5 });
  assert.deepEqual(page, []);
});

test("EventLog list default (no args) still returns entries newest-first", () => {
  const log = new EventLog();
  log.record("info", "first");
  log.record("info", "second");
  const entries = log.list();
  assert.equal(entries[0].message, "second");
  assert.equal(entries[1].message, "first");
});
