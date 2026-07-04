import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import packageJson from "../package.json" with { type: "json" };

const releaseDir = resolve("release");
const zipPath = resolve(releaseDir, `json-workbench-extension-${packageJson.version}.zip`);

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });
execFileSync("zip", ["-r", zipPath, ".", "-x", "*.DS_Store", "__MACOSX/*"], { cwd: resolve("dist"), stdio: "inherit" });

console.log(`Created ${zipPath}`);
