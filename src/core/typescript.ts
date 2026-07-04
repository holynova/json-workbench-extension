import { inferShape } from "./infer";
import { singularize, toPascalCase, tsPropertyName } from "./names";
import type { FieldShape, GeneratorSettings, JsonValue } from "./types";

export function generateTypeScript(value: JsonValue, settings: GeneratorSettings): string {
  const declarations: string[] = [];
  const root = renderShape(inferShape(value, { enumInference: settings.enumInference }), "Root", declarations, settings);
  if (!declarations.some((declaration) => declaration.startsWith("interface Root") || declaration.startsWith("type Root"))) {
    declarations.unshift(`type Root = ${root};`);
  }
  return declarations.join("\n\n");
}

function renderShape(shape: FieldShape, name: string, declarations: string[], settings: GeneratorSettings): string {
  const nullable = shape.nullable ? " | null" : "";
  if (shape.enumValues?.length) return shape.enumValues.map((value) => JSON.stringify(value)).join(" | ") + nullable;

  switch (shape.kind) {
    case "string":
      return `string${nullable}`;
    case "integer":
    case "number":
      return `number${nullable}`;
    case "boolean":
      return `boolean${nullable}`;
    case "null":
      return "null";
    case "array": {
      const itemName = toPascalCase(singularize(name));
      const item = renderShape(shape.arrayItem ?? { kind: "unknown" }, itemName, declarations, settings);
      return `${wrapArrayItem(item)}[]${nullable}`;
    }
    case "object": {
      const typeName = toPascalCase(name);
      if (!declarations.some((declaration) => declaration.startsWith(`interface ${typeName}`))) {
        const fields = Object.entries(shape.objectFields ?? {}).map(([key, field]) => {
          const childName = toPascalCase(key);
          return `  ${tsPropertyName(key, settings.camelCaseFields)}${field.optional ? "?" : ""}: ${renderShape(field, childName, declarations, settings)};`;
        });
        declarations.push(`interface ${typeName} {\n${fields.join("\n")}\n}`);
      }
      return `${typeName}${nullable}`;
    }
    case "union":
      return `${(shape.unionMembers ?? []).map((member) => renderShape(member, name, declarations, settings)).join(" | ")}${nullable}`;
    default:
      return `unknown${nullable}`;
  }
}

function wrapArrayItem(value: string): string {
  return value.includes(" | ") ? `(${value})` : value;
}

