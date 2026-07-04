import { describe, expect, it } from "vitest";
import { containsSensitiveKey, inferSemanticFormat, topLevelKeys } from "./semantic";

describe("semantic helpers", () => {
  it("detects semantic key and value formats", () => {
    expect(inferSemanticFormat(["user", "email"], ["a@example.com"])).toBe("email");
    expect(inferSemanticFormat(["address", "city"], ["Shanghai"])).toBe("city");
    expect(inferSemanticFormat(["id"], ["550e8400-e29b-41d4-a716-446655440000"])).toBe("uuid");
  });

  it("marks sensitive keys", () => {
    expect(containsSensitiveKey({ auth: { apiKey: "secret" } })).toBe(true);
    expect(containsSensitiveKey({ user: { name: "Alice" } })).toBe(false);
  });

  it("extracts top-level keys from objects and object arrays", () => {
    expect(topLevelKeys({ a: 1, b: 2 })).toEqual(["a", "b"]);
    expect(topLevelKeys([{ id: 1, name: "Alice" }])).toEqual(["id", "name"]);
  });
});

