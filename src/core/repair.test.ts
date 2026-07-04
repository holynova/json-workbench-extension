import { describe, expect, it } from "vitest";
import { repairJson } from "./repair";

describe("repairJson", () => {
  it("repairs common JSON-like input conservatively", () => {
    const result = repairJson("{name: 'Alice', city: 'Shanghai',}");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ name: "Alice", city: "Shanghai" });
    expect(JSON.parse(result.formatted)).toEqual(result.value);
    expect(result.report.status).toBe("repaired");
  });

  it("converts JSONL into an array", () => {
    const result = repairJson('{"id":1,"status":"active"}\n{"id":2,"status":"inactive"}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      { id: 1, status: "active" },
      { id: 2, status: "inactive" }
    ]);
    expect(result.report.sourceMode).toBe("jsonl");
  });

  it("does not return derived data when repair fails", () => {
    const result = repairJson('{"name": "\\uZZZZ"}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.report.status).toBe("failed");
    expect(result.report.diagnostic?.suggestedFix).toBeTruthy();
  });

  it("reports line and column for multiline parse failures", () => {
    const result = repairJson('{\n  "name": "Alice",\n  "bad": "\\uZZZZ"\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.report.diagnostic?.line).toBe(3);
    expect(result.report.diagnostic?.column).toBeGreaterThan(1);
    expect(result.report.diagnostic?.snippet).toContain("^");
  });
});
