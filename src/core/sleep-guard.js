import { spawn as realSpawn } from "node:child_process";

/**
 * Keeps the Mac awake while Codex turns are running. Without this, the Mac
 * sleeps once the user walks away, the daemon stops polling, and the phone
 * bridge goes silent — defeating the whole point of a remote companion.
 *
 * Reference-counted: caffeinate runs while at least one turn is active.
 * A no-op on non-macOS platforms.
 */
export class SleepGuard {
  constructor({ spawn = realSpawn, platform = process.platform, onChange = null } = {}) {
    this.spawn = spawn;
    this.platform = platform;
    this.onChange = onChange;
    this.active = new Set();
    this.process = null;
  }

  acquire(key) {
    this.active.add(key);
    this.#sync();
  }

  release(key) {
    this.active.delete(key);
    this.#sync();
  }

  releaseAll() {
    this.active.clear();
    this.#sync();
  }

  isActive() {
    return Boolean(this.process);
  }

  #sync() {
    if (this.platform !== "darwin") {
      return;
    }
    if (this.active.size > 0 && !this.process) {
      this.process = this.spawn("caffeinate", ["-i"], { stdio: "ignore" });
      this.process.unref?.();
      this.process.on?.("error", () => {
        this.process = null;
      });
      this.process.on?.("exit", () => {
        this.process = null;
      });
      this.onChange?.(true);
    } else if (this.active.size === 0 && this.process) {
      this.process.kill?.();
      this.process = null;
      this.onChange?.(false);
    }
  }
}
