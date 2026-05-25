import assert from "node:assert/strict";
import test from "node:test";

import { ProjectStore } from "../src/core/projects.js";
import { CommandRouter } from "../src/core/commands.js";
import { AuthorizationStore } from "../src/core/authorization.js";
import { SessionStore } from "../src/core/sessions.js";
import { EventLog } from "../src/core/event-log.js";

function newRouter(extra = {}) {
  return new CommandRouter({
    authorization: new AuthorizationStore(),
    projects: new ProjectStore(),
    sessions: new SessionStore(),
    ...extra,
  });
}

test("project store resolves absolute paths directly", () => {
  const store = new ProjectStore();
  assert.equal(store.resolveProject("/tmp/some-repo").status, "available");
  assert.equal(store.resolveProject("/tmp/some-repo").path, "/tmp/some-repo");
});

test("turn rate limiting throws once the hourly budget is exhausted", () => {
  const router = newRouter({ maxTurnsPerHour: 3 });
  const identity = { channel: "wechat", stableId: "acct:peer", displayName: "Tester" };
  router.enforceTurnRate(identity);
  router.enforceTurnRate(identity);
  router.enforceTurnRate(identity);
  assert.throws(() => router.enforceTurnRate(identity), /每小时.*上限/);
  // A different identity has its own budget.
  assert.doesNotThrow(() =>
    router.enforceTurnRate({ channel: "wechat", stableId: "other:peer", displayName: "Other" }),
  );
});

test("router routing state survives a snapshot/restore round trip", () => {
  const router = newRouter();
  router.currentProjectByIdentity.set("wechat:acct:peer", "/repo/x");
  router.threadBindings.set("thread_1", { channel: "wechat", conversationId: "dm_peer" });
  router.conversationByIdentity.set("wechat:acct:peer", { channel: "wechat", conversationId: "dm_peer" });

  const restored = newRouter({ persisted: router.snapshot() });
  assert.equal(restored.currentProjectByIdentity.get("wechat:acct:peer"), "/repo/x");
  assert.deepEqual(restored.getThreadBinding("thread_1"), {
    channel: "wechat",
    conversationId: "dm_peer",
  });
});

test("event log restores from a snapshot and keeps incrementing ids", () => {
  const log = new EventLog();
  log.info("first");
  log.warn("second");
  const restored = new EventLog({ entries: log.snapshot() });
  assert.equal(restored.list().length, 2);
  assert.equal(restored.info("third").id, 3);
});
