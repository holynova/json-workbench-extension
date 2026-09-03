import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(projectRoot, "docs");
const destination = resolve(projectRoot, "dist");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });

console.log(`Copied the Pages static site from ${source} into ${destination}`);
