// Installs ONLY the runtime (production) deps into a staging tree so the
// packaged app can `require()` them, without dragging in devDependencies
// (like @tauri-apps/cli, which would balloon the bundle by tens of MB).
import { execFile } from "node:child_process";
import { copyFile, mkdir, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const stageDir = join(root, "build-assets", "runtime-deps");

await rm(join(stageDir, "node_modules"), { recursive: true, force: true });
await mkdir(stageDir, { recursive: true });
await copyFile(join(root, "package.json"), join(stageDir, "package.json"));

const lockfile = join(root, "package-lock.json");
if (await fileExists(lockfile)) {
  await copyFile(lockfile, join(stageDir, "package-lock.json"));
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const { stdout } = await execFileAsync(
  npmCommand,
  ["install", "--omit=dev", "--no-audit", "--no-fund"],
  { cwd: stageDir },
);
process.stdout.write(stdout);

console.log(`Installed production deps into ${stageDir}/node_modules`);

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
