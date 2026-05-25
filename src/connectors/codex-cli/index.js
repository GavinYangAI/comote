import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class CodexCliConnector {
  getStatus() {
    return {
      name: "Codex CLI",
      role: "fallback",
      state: "available",
    };
  }

  async runPrompt({ cwd, text }) {
    const { stdout, stderr } = await execFileAsync(
      "codex",
      ["exec", "--skip-git-repo-check", "-C", cwd, text],
      { maxBuffer: 1024 * 1024 * 8 },
    );
    return {
      id: `cli_${randomUUID()}`,
      cwd,
      text,
      output: (stdout || stderr || "").trim(),
    };
  }
}
