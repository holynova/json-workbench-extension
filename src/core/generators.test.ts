import { describe, expect, it } from "vitest";
import { defaultSettings } from "./types";
import { generateJsonSchema } from "./schema";
import { generateTypeScript } from "./typescript";
import { generateZod } from "./zod";
import { generatePydantic } from "./pydantic";
import { generateMock } from "./mock";
import type { JsonValue } from "./types";

const sample: JsonValue = [
  { id: "550e8400-e29b-41d4-a716-446655440000", status: "active", city: "Shanghai", email: "a@example.com" },
  { id: "550e8400-e29b-41d4-a716-446655440001", status: "inactive", city: "Beijing" }
];

describe("generators", () => {
  it("generates schema with optional fields and conservative enums", () => {
    const schema = JSON.parse(generateJsonSchema(sample, defaultSettings));
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.items.properties.status.enum).toEqual(["active", "inactive"]);
    expect(schema.items.required).not.toContain("email");
  });

  it("generates TypeScript interfaces by default", () => {
    const output = generateTypeScript(sample, defaultSettings);
    expect(output).toContain("interface Root");
    expect(output).toContain('status: "active" | "inactive";');
    expect(output).toContain("email?: string;");
  });

  it("generates Zod and Pydantic outputs", () => {
    expect(generateZod(sample, defaultSettings)).toContain("z.enum([\"active\", \"inactive\"])");
    expect(generatePydantic(sample, defaultSettings)).toContain('Literal["active", "inactive"]');
  });

  it("generates semantic mock data in Chinese", () => {
    const output = JSON.parse(generateMock(sample, { ...defaultSettings, mockLocale: "zh_CN", mockArraySize: 1, mockSeed: 42 }));
    expect(output).toHaveLength(1);
    expect(typeof output[0].city).toBe("string");
    expect(output[0].email).toContain("@");
  });
});
