import { inferShape } from "./infer";
import { isValidIdentifier, pythonFieldName, singularize, toPascalCase } from "./names";
import type { FieldShape, GeneratorSettings, JsonValue } from "./types";

export function generatePydantic(value: JsonValue, settings: GeneratorSettings): string {
  const classes: string[] = [];
  const rootType = renderPythonType(inferShape(value, { enumInference: settings.enumInference }), "Root", classes, settings);
  if (!classes.some((klass) => klass.startsWith("class Root("))) {
    classes.unshift(`Root = ${rootType}`);
  }
  return `from typing import Any, Literal\nfrom pydantic import BaseModel, Field\n\n${classes.join("\n\n")}`;
}

function renderPythonType(shape: FieldShape, name: string, classes: string[], settings: GeneratorSettings): string {
  let expression: string;
  if (shape.enumValues?.length) {
    expression = `Literal[${shape.enumValues.map((value) => JSON.stringify(value)).join(", ")}]`;
  } else {
    switch (shape.kind) {
      case "string":
        expression = "str";
        break;
      case "integer":
        expression = "int";
        break;
      case "number":
        expression = "float";
        break;
      case "boolean":
        expression = "bool";
        break;
      case "null":
        expression = "None";
        break;
      case "array":
        expression = `list[${renderPythonType(shape.arrayItem ?? { kind: "unknown" }, toPascalCase(singularize(name)), classes, settings)}]`;
        break;
      case "object": {
        const className = toPascalCase(name);
        if (!classes.some((klass) => klass.startsWith(`class ${className}(`))) {
          const fields = Object.entries(shape.objectFields ?? {}).map(([key, field]) => {
            const fieldName = pythonFieldName(key);
            const type = renderPythonType(field, key, classes, settings);
            const optional = field.optional || field.nullable;
            const annotation = optional && type !== "None" ? `${type} | None` : type;
            const alias = fieldName !== key || !isValidIdentifier(key) ? ` = Field(default=${optional ? "None" : "..."}, alias=${JSON.stringify(key)})` : optional ? " = None" : "";
            return `    ${fieldName}: ${annotation}${alias}`;
          });
          classes.push(`class ${className}(BaseModel):\n${fields.length ? fields.join("\n") : "    pass"}`);
        }
        expression = className;
        break;
      }
      case "union":
        expression = (shape.unionMembers ?? []).map((member) => renderPythonType(member, name, classes, settings)).join(" | ");
        break;
      default:
        expression = "Any";
    }
  }
  return shape.nullable && expression !== "None" ? `${expression} | None` : expression;
}

