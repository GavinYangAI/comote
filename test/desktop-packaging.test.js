import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("desktop packaging targets the requested Tauri installer artifacts", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const tauriConfig = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));

  assert.equal(packageJson.version, "0.2.0");
  assert.match(packageJson.scripts["dist:mac"], /--bundles app/);
  assert.match(packageJson.scripts["dist:mac"], /--target aarch64-apple-darwin/);
  assert.match(packageJson.scripts["dist:mac"], /create-mac-dmg\.mjs/);
  assert.match(packageJson.scripts["dist:win"], /--bundles nsis/);
  assert.match(packageJson.scripts["dist:win"], /--target x86_64-pc-windows-msvc/);
  assert.match(packageJson.scripts["dist:win"], /collect-tauri-artifacts\.mjs win/);
  assert.equal(tauriConfig.productName, "Comote");
  assert.equal(tauriConfig.version, "0.2.0");
  assert.equal(tauriConfig.identifier, "dev.comote.desktop");
  assert.deepEqual(tauriConfig.bundle.targets, ["app", "dmg", "nsis"]);
  assert.equal(tauriConfig.bundle.fileAssociations, undefined);
  assert.equal(tauriConfig.bundle.externalBin[0], "binaries/comote-node");
});
