import { inferShape } from "./infer";
import { inferSemanticFormat } from "./semantic";
import type { FieldShape, GeneratorSettings, JsonValue, MockLocale, SemanticFormat } from "./types";

export interface MockRule {
  id: string;
  enabled: boolean;
  priority: number;
  match: { key?: string; path?: string };
  generator: SemanticFormat | "fixed" | "enum" | "number-range";
  fixedValue?: JsonValue;
  enumValues?: JsonValue[];
  min?: number;
  max?: number;
  locale?: MockLocale;
}

const en = {
  firstNames: ["Alice", "Maya", "Jordan", "Noah"],
  lastNames: ["Chen", "Rivera", "Smith", "Patel"],
  cities: ["San Francisco", "Berlin", "Tokyo", "London"],
  countries: ["United States", "Germany", "Japan", "United Kingdom"],
  companies: ["Acme Labs", "Northstar Systems", "Riverline Studio"],
  statuses: ["active", "pending", "disabled"]
};

const zh = {
  firstNames: ["明", "雨", "欣", "航"],
  lastNames: ["王", "李", "张", "陈"],
  cities: ["上海", "北京", "杭州", "深圳"],
  countries: ["中国", "新加坡", "日本", "美国"],
  companies: ["星河科技", "云杉数据", "北辰系统"],
  statuses: ["启用", "待处理", "停用"]
};

export function generateMock(value: JsonValue, settings: GeneratorSettings, rules: MockRule[] = []): string {
  const shape = inferShape(value, { enumInference: settings.enumInference });
  const rng = mulberry32(settings.mockSeed);
  const mock = mockForShape(shape, [], settings, rng, rules);
  return JSON.stringify(mock, null, 2);
}

function mockForShape(
  shape: FieldShape,
  path: string[],
  settings: GeneratorSettings,
  rng: () => number,
  rules: MockRule[]
): JsonValue {
  const rule = findRule(path, rules);
  if (rule) return applyRule(rule, settings, rng);

  if (shape.enumValues?.length) return pick(shape.enumValues, rng);
  if (shape.nullable && rng() < 0.1) return null;

  switch (shape.kind) {
    case "string":
      return semanticString(shape.format ?? inferSemanticFormat(path, shape.samples ?? []), settings.mockLocale, rng);
    case "integer":
      return Math.floor(1 + rng() * 1000);
    case "number":
      return Number((rng() * 1000).toFixed(2));
    case "boolean":
      return rng() > 0.5;
    case "null":
      return null;
    case "array":
      return Array.from({ length: settings.mockArraySize }, () => mockForShape(shape.arrayItem ?? { kind: "unknown" }, path, settings, rng, rules));
    case "object":
      return Object.fromEntries(
        Object.entries(shape.objectFields ?? {}).map(([key, field]) => [key, mockForShape(field, [...path, key], settings, rng, rules)])
      );
    case "union":
      return mockForShape(pick(shape.unionMembers ?? [{ kind: "unknown" }], rng), path, settings, rng, rules);
    default:
      return "value";
  }
}

function semanticString(format: SemanticFormat | undefined, locale: MockLocale, rng: () => number): string {
  const data = locale === "zh_CN" ? zh : en;
  switch (format) {
    case "uuid":
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const value = Math.floor(rng() * 16);
        const output = char === "x" ? value : (value & 0x3) | 0x8;
        return output.toString(16);
      });
    case "email":
      return `user${Math.floor(rng() * 1000)}@example.com`;
    case "url":
      return `https://example.com/${Math.floor(rng() * 1000)}`;
    case "date":
      return "2026-07-04";
    case "date-time":
      return "2026-07-04T12:00:00.000Z";
    case "city":
      return pick(data.cities, rng);
    case "country":
      return pick(data.countries, rng);
    case "first-name":
      return pick(data.firstNames, rng);
    case "last-name":
      return pick(data.lastNames, rng);
    case "name":
      return locale === "zh_CN" ? `${pick(data.lastNames, rng)}${pick(data.firstNames, rng)}` : `${pick(data.firstNames, rng)} ${pick(data.lastNames, rng)}`;
    case "username":
      return `user_${Math.floor(rng() * 10000)}`;
    case "company":
      return pick(data.companies, rng);
    case "currency":
      return locale === "zh_CN" ? "CNY" : "USD";
    case "price":
      return String(Number((rng() * 1000).toFixed(2)));
    case "latitude":
      return String(Number((-90 + rng() * 180).toFixed(6)));
    case "longitude":
      return String(Number((-180 + rng() * 360).toFixed(6)));
    case "phone":
      return locale === "zh_CN" ? `138${Math.floor(10000000 + rng() * 89999999)}` : `+1-415-${Math.floor(1000 + rng() * 8999)}`;
    case "slug":
      return "sample-item";
    case "status":
      return pick(data.statuses, rng);
    case "image":
      return "https://example.com/image.png";
    case "id":
      return `id_${Math.floor(rng() * 100000)}`;
    default:
      return locale === "zh_CN" ? "示例文本" : "sample text";
  }
}

function findRule(path: string[], rules: MockRule[]): MockRule | undefined {
  const currentPath = path.join(".");
  const key = path.at(-1);
  return rules
    .filter((rule) => rule.enabled)
    .sort((a, b) => b.priority - a.priority)
    .find((rule) => rule.match.path === currentPath || rule.match.key === key);
}

function applyRule(rule: MockRule, settings: GeneratorSettings, rng: () => number): JsonValue {
  if (rule.generator === "fixed") return rule.fixedValue ?? null;
  if (rule.generator === "enum") return pick(rule.enumValues ?? ["value"], rng);
  if (rule.generator === "number-range") {
    const min = rule.min ?? 0;
    const max = rule.max ?? 100;
    return Number((min + rng() * (max - min)).toFixed(2));
  }
  return semanticString(rule.generator, rule.locale ?? settings.mockLocale, rng);
}

function pick<T>(values: T[], rng: () => number): T {
  return values[Math.floor(rng() * values.length)]!;
}

function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

