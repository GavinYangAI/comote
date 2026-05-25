import assert from "node:assert/strict";
import test from "node:test";

import { SleepGuard } from "../src/core/sleep-guard.js";

function fakeSpawn(record) {
  return () => {
    const proc = {
      killed: false,
      kill() {
        this.killed = true;
      },
      unref() {},
      on() {},
    };
    record.push(proc);
    return proc;
  };
}

test("sleep guard runs caffeinate only while at least one turn is active", () => {
  const spawned = [];
  const guard = new SleepGuard({ spawn: fakeSpawn(spawned), platform: "darwin" });

  guard.acquire("turn_1");
  assert.equal(guard.isActive(), true);
  assert.equal(spawned.length, 1);

  // A second turn must not spawn a second caffeinate.
  guard.acquire("turn_2");
  assert.equal(spawned.length, 1);

  // Still active while turn_2 runs.
  guard.release("turn_1");
  assert.equal(guard.isActive(), true);

  // Last turn released -> caffeinate is killed.
  guard.release("turn_2");
  assert.equal(guard.isActive(), false);
  assert.equal(spawned[0].killed, true);
});

test("releaseAll stops caffeinate even with turns still tracked", () => {
  const spawned = [];
  const guard = new SleepGuard({ spawn: fakeSpawn(spawned), platform: "darwin" });
  guard.acquire("turn_1");
  guard.acquire("turn_2");
  guard.releaseAll();
  assert.equal(guard.isActive(), false);
  assert.equal(spawned[0].killed, true);
});

test("sleep guard is a no-op on non-macOS platforms", () => {
  const guard = new SleepGuard({
    spawn: () => {
      throw new Error("caffeinate must not spawn off macOS");
    },
    platform: "linux",
  });
  guard.acquire("turn_1");
  assert.equal(guard.isActive(), false);
});
