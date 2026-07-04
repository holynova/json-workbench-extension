import type { FieldShape, GeneratorSettings, JsonValue } from "./types";
import { inferShape } from "./infer";

export function generateJsonSchema(value: JsonValue, settings: GeneratorSettings): string {
  const shape = inferShape(value, { enumInference: settings.enumInference });
  const schema = {
    $schema:
      settings.schemaDraft === "draft-07"
        ? "http://json-schema.org/draft-07/schema#"
        : "https://json-schema.org/draft/2020-12/schema",
    title: "Root",
    ...shapeToSchema(shape, settings)
  };
  return JSON.stringify(schema, null, 2);
}

function shapeToSchema(shape: FieldShape, settings: GeneratorSettings): Record<string, unknown> {
  if (shape.nullable && shape.kind !== "null") {
    const child = shapeToSchema({ ...shape, nullable: false }, settings);
    return { ...child, type: Array.isArray(child.type) ? [...child.type, "null"] : [child.type, "null"] };
  }

  switch (shape.kind) {
    case "string":
      return compact({ type: "string", format: schemaFormat(shape.format), enum: shape.enumValues });
    case "integer":
      return { type: "integer" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "null":
      return { type: "null" };
    case "array":
      return { type: "array", items: shapeToSchema(shape.arrayItem ?? { kind: "unknown" }, settings) };
    case "object": {
      const fields = shape.objectFields ?? {};
      const required = Object.entries(fields)
        .filter(([, field]) => !field.optional)
        .map(([key]) => key);
      return compact({
        type: "object",
        properties: Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, shapeToSchema(field, settings)])),
        required: required.length ? required : undefined,
        additionalProperties: settings.strictObjects ? false : undefined
      });
    }
    case "union":
      return { anyOf: (shape.unionMembers ?? []).map((member) => shapeToSchema(member, settings)) };
    default:
      return {};
  }
}

function schemaFormat(format: FieldShape["format"]): string | undefined {
  if (format === "url") return "uri";
  if (format === "date-time" || format === "date" || format === "email" || format === "uuid" || format === "ipv4" || format === "ipv6") {
    return format;
  }
  return undefined;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined)) as T;
}

