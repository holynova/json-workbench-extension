import { generateJsonSchema } from "./schema";
import { generateMock, type MockRule } from "./mock";
import { generatePydantic } from "./pydantic";
import { generateTypeScript } from "./typescript";
import { generateZod } from "./zod";
import type { GeneratorSettings, JsonValue } from "./types";

export type OutputKind = "formatted" | "minified" | "schema" | "typescript" | "zod" | "pydantic" | "mock";

export function generateOutput(kind: OutputKind, value: JsonValue, settings: GeneratorSettings, rules: MockRule[] = []): string {
  switch (kind) {
    case "formatted":
      return JSON.stringify(value, null, 2);
    case "minified":
      return JSON.stringify(value);
    case "schema":
      return generateJsonSchema(value, settings);
    case "typescript":
      return generateTypeScript(value, settings);
    case "zod":
      return generateZod(value, settings);
    case "pydantic":
      return generatePydantic(value, settings);
    case "mock":
      return generateMock(value, settings, rules);
  }
}

