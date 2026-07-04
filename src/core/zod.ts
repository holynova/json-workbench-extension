import { inferShape } from "./infer";
import { singularize, toPascalCase } from "./names";
import type { FieldShape, GeneratorSettings, JsonValue } from "./types";

export function generateZod(value: JsonValue, settings: GeneratorSettings): string {
  const declarations: string[] = [`import { z } from "zod";`];
  const rootExpression = renderZod(inferShape(value, { enumInference: settings.enumInference }), "Root", declarations, settings);
  if (!declarations.some((line) => line.startsWith("export const RootSchema"))) {
    declarations.push(`export const RootSchema = ${rootExpression};`);
  }
  declarations.push("export type Root = z.infer<typeof RootSchema>;");
  return declarations.join("\n\n");
}

function renderZod(shape: FieldShape, name: string, declarations: string[], settings: GeneratorSettings): string {
  let expression: string;
  if (shape.enumValues?.length && shape.enumValues.length > 1) {
    expression = `z.enum([${shape.enumValues.map((value) => JSON.stringify(value)).join(", ")}])`;
  } else {
    switch (shape.kind) {
      case "string":
        expression = zodString(shape);
        break;
      case "integer":
        expression = "z.number().int()";
        break;
      case "number":
        expression = "z.number()";
        break;
      case "boolean":
        expression = "z.boolean()";
        break;
      case "null":
        expression = "z.null()";
        break;
      case "array":
        expression = `z.array(${renderZod(shape.arrayItem ?? { kind: "unknown" }, toPascalCase(singularize(name)), declarations, settings)})`;
        break;
      case "object": {
        const schemaName = `${toPascalCase(name)}Schema`;
        if (!declarations.some((line) => line.startsWith(`export const ${schemaName}`))) {
          const fields = Object.entries(shape.objectFields ?? {}).map(([key, field]) => {
            const child = renderZod(field, key, declarations, settings);
            return `  ${JSON.stringify(key)}: ${field.optional ? `${child}.optional()` : child}`;
          });
          declarations.push(`export const ${schemaName} = z.object({\n${fields.join(",\n")}\n});`);
        }
        expression = schemaName;
        break;
      }
      case "union":
        expression = `z.union([${(shape.unionMembers ?? []).map((member) => renderZod(member, name, declarations, settings)).join(", ")}])`;
        break;
      default:
        expression = "z.unknown()";
    }
  }

  return shape.nullable && shape.kind !== "null" ? `${expression}.nullable()` : expression;
}

function zodString(shape: FieldShape): string {
  if (shape.format === "email") return "z.string().email()";
  if (shape.format === "url") return "z.string().url()";
  if (shape.format === "uuid") return "z.string().uuid()";
  if (shape.format === "date-time" || shape.format === "date") return "z.string()";
  return "z.string()";
}

