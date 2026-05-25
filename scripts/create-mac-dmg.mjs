import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const releaseDir = join(process.cwd(), "release");
const appPath = join(
  process.cwd(),
  "src-tauri",
  "target",
  "aarch64-apple-darwin",
  "release",
  "bundle",
  "macos",
  "Comote.app",
);
const dmgPath = join(releaseDir, "Comote-0.2.0-arm64.dmg");

await mkdir(releaseDir, { recursive: true });

// Stage the app alongside an "Applications" symlink so the mounted DMG shows
// the drag-to-Applications affordance. Finder renders the symlink as the
// /Applications folder icon, giving the standard installer experience.
const stagingDir = await mkdtemp(join(tmpdir(), "comote-dmg-"));
try {
  await cp(appPath, join(stagingDir, "Comote.app"), { recursive: true });
  await symlink("/Applications", join(stagingDir, "Applications"));
  await execFileAsync("hdiutil", [
    "create",
    "-volname",
    "Comote",
    "-srcfolder",
    stagingDir,
    "-ov",
    "-format",
    "UDZO",
    dmgPath,
  ]);
} finally {
  await rm(stagingDir, { recursive: true, force: true });
}

console.log(`Created ${dmgPath}`);
