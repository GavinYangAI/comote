import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { makeIcns, makeIco, makeIconPngSet } from "./icon-utils.mjs";

const buildAssetsDir = join(process.cwd(), "build-assets");
await mkdir(buildAssetsDir, { recursive: true });

const pngs = makeIconPngSet();
await writeFile(join(buildAssetsDir, "AppIcon.png"), pngs.get(1024));
await writeFile(join(buildAssetsDir, "AppIcon.icns"), makeIcns(pngs));
await writeFile(join(buildAssetsDir, "AppIcon.ico"), makeIco(pngs));

console.log(`Generated desktop assets in ${buildAssetsDir}`);
