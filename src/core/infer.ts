import { inferSemanticFormat } from "./semantic";
import type { EnumInferenceMode, FieldShape, JsonValue } from "./types";

const enumLikeKeys = new Set(["status", "type", "kind", "role", "state", "category", "mode", "level", "priority"]);
const neverEnumKeys = new Set(["id", "name", "title", "description", "email", "url", "address"]);

export function inferShape(value: JsonValue, options?: { enumInference?: EnumInferenceMode; path?: string[] }): FieldShape {
  const enumInference = options?.enumInference ?? "conservative";
  const path = options?.path ?? [];

  if (value === null) return { kind: "null", nullable: true, samples: [value] };
  if (typeof value === "string") {
    return withStringMetadata({ kind: "string", samples: [value] }, path, enumInference);
  }
  if (typeof value === "number") return { kind: Number.isInteger(value) ? "integer" : "number", samples: [value] };
  if (typeof value === "boolean") return { kind: "boolean", samples: [value] };
  if (Array.isArray(value)) return inferArray(value, enumInference, path);
  return inferObject(value, enumInference, path);
}

function inferObject(value: Record<string, JsonValue>, enumInference: EnumInferenceMode, path: string[]): FieldShape {
  const fields: Record<string, FieldShape> = {};
  for (const [key, child] of Object.entries(value)) {
    fields[key] = inferShape(child, { enumInference, path: [...path, key] });
  }
  return { kind: "object", objectFields: fields, samples: [value] };
}

function inferArray(values: JsonValue[], enumInference: EnumInferenceMode, path: string[]): FieldShape {
  if (values.length === 0) return { kind: "array", arrayItem: { kind: "unknown" }, samples: [values] };
  const itemShape = mergeShapes(values.map((item) => inferShape(item, { enumInference, path })), path, enumInference);
  return { kind: "array", arrayItem: itemShape, samples: [values] };
}

export function mergeShapes(shapes: FieldShape[], path: string[] = [], enumInference: EnumInferenceMode = "conservative"): FieldShape {
  if (shapes.length === 0) return { kind: "unknown" };

  const nonNull = shapes.filter((shape) => shape.kind !== "null");
  const nullable = nonNull.length !== shapes.length;
  if (nonNull.length === 0) return { kind: "null", nullable: true };

  if (nonNull.every((shape) => shape.kind === "object")) {
    const allKeys = new Set(nonNull.flatMap((shape) => Object.keys(shape.objectFields ?? {})));
    const objectFields: Record<string, FieldShape> = {};
    for (const key of allKeys) {
      const present = nonNull.filter((shape) => shape.objectFields?.[key]);
      objectFields[key] = mergeShapes(
        present.map((shape) => shape.objectFields![key]),
        [...path, key],
        enumInference
      );
      if (present.length < nonNull.length) objectFields[key].optional = true;
    }
    return { kind: "object", nullable, objectFields, samples: collectSamples(shapes) };
  }

  if (nonNull.every((shape) => shape.kind === "array")) {
    const itemShapes = nonNull.map((shape) => shape.arrayItem ?? ({ kind: "unknown" } satisfies FieldShape));
    return { kind: "array", nullable, arrayItem: mergeShapes(itemShapes, path, enumInference), samples: collectSamples(shapes) };
  }

  const numberKinds = new Set(["number", "integer"]);
  if (nonNull.every((shape) => numberKinds.has(shape.kind))) {
    return { kind: nonNull.some((shape) => shape.kind === "number") ? "number" : "integer", nullable, samples: collectSamples(shapes) };
  }

  if (nonNull.every((shape) => shape.kind === "string")) {
    return withStringMetadata({ kind: "string", nullable, samples: collectSamples(shapes) }, path, enumInference);
  }

  const uniqueKinds = new Set(nonNull.map((shape) => shape.kind));
  if (uniqueKinds.size === 1) return { ...nonNull[0], nullable };

  return { kind: "union", nullable, unionMembers: dedupeByKind(nonNull), samples: collectSamples(shapes) };
}

function withStringMetadata(shape: FieldShape, path: string[], enumInference: EnumInferenceMode): FieldShape {
  const samples = shape.samples ?? [];
  return {
    ...shape,
    format: inferSemanticFormat(path, samples),
    enumValues: inferEnumValues(path, samples, enumInference)
  };
}

function inferEnumValues(path: string[], samples: JsonValue[], mode: EnumInferenceMode): string[] | undefined {
  if (mode === "off") return undefined;
  const values = samples.filter((sample): sample is string => typeof sample === "string");
  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length < 2 || uniqueValues.length > 12) return undefined;
  if (uniqueValues.some((value) => value.length > 40)) return undefined;

  const key = (path.at(-1) ?? "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  if (neverEnumKeys.has(key)) return undefined;
  if (mode === "aggressive") return uniqueValues;
  return enumLikeKeys.has(key) ? uniqueValues : undefined;
}

function collectSamples(shapes: FieldShape[]): JsonValue[] {
  return shapes.flatMap((shape) => shape.samples ?? []).slice(0, 50);
}

function dedupeByKind(shapes: FieldShape[]): FieldShape[] {
  const map = new Map<string, FieldShape>();
  for (const shape of shapes) map.set(shape.kind, shape);
  return Array.from(map.values());
}
