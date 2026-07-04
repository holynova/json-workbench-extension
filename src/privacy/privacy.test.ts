import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(__dirname, "../..");

describe("privacy guardrails", () => {
  it("keeps manifest permissions minimal", () => {
    const manifest = JSON.parse(readFileSync(join(projectRoot, "public/manifest.json"), "utf8"));
    expect(manifest.permissions).toEqual(["sidePanel", "contextMenus", "storage", "clipboardRead"]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(JSON.stringify(manifest.content_security_policy)).not.toContain("http");
  });

  it("does not use runtime network APIs in source", () => {
    const source = collectSource(join(projectRoot, "src"));
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bXMLHttpRequest\b/);
    expect(source).not.toMatch(/\bWebSocket\b/);
  });
});

function collectSource(dir: string): string {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return collectSource(path);
      if (!/\.(ts|tsx)$/.test(path) || path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return "";
      return readFileSync(path, "utf8");
    })
    .join("\n");
}

