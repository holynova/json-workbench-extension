import type { SemanticFormat } from "./types";

const formatPatterns: Array<[SemanticFormat, RegExp]> = [
  ["uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i],
  ["email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
  ["url", /^https?:\/\/\S+$/i],
  ["date-time", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/],
  ["date", /^\d{4}-\d{2}-\d{2}$/],
  ["ipv4", /^(?:\d{1,3}\.){3}\d{1,3}$/],
  ["color", /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i]
];

export function inferSemanticFormat(keyPath: string[], samples: unknown[]): SemanticFormat | undefined {
  const stringSamples = samples.filter((sample): sample is string => typeof sample === "string");
  for (const sample of stringSamples) {
    const byValue = formatPatterns.find(([, pattern]) => pattern.test(sample));
    if (byValue) return byValue[0];
  }

  const key = keyPath.at(-1) ?? "";
  const fullPath = keyPath.join(".");
  const normalizedKey = normalizeKey(key);
  const normalizedPath = normalizeKey(fullPath);

  if (/(^|_)uuid$/.test(normalizedKey)) return "uuid";
  if (/(^|_)(id|identifier)$/.test(normalizedKey)) return "id";
  if (normalizedKey.includes("email")) return "email";
  if (normalizedKey.includes("avatar") || normalizedKey.includes("image")) return "image";
  if (normalizedKey.includes("url") || normalizedKey.includes("uri") || normalizedKey.includes("website")) return "url";
  if (normalizedKey.includes("city")) return "city";
  if (normalizedKey.includes("country")) return "country";
  if (normalizedKey === "name" || normalizedKey.endsWith("_name")) return "name";
  if (normalizedKey.includes("first_name")) return "first-name";
  if (normalizedKey.includes("last_name")) return "last-name";
  if (normalizedKey.includes("username") || normalizedKey.includes("user_name")) return "username";
  if (normalizedKey.includes("company")) return "company";
  if (normalizedKey.includes("currency")) return "currency";
  if (normalizedKey.includes("price") || normalizedKey.includes("amount") || normalizedKey.includes("total")) return "price";
  if (normalizedKey === "lat" || normalizedKey.includes("latitude")) return "latitude";
  if (normalizedKey === "lng" || normalizedKey === "lon" || normalizedKey.includes("longitude")) return "longitude";
  if (/(^|_)(status|state|type|kind|role|mode|level|priority)$/.test(normalizedKey)) return "status";
  if (normalizedKey.includes("phone") || normalizedKey.includes("mobile")) return "phone";
  if (normalizedKey.includes("slug")) return "slug";
  if (normalizedPath.includes("address_city")) return "city";
  return undefined;
}

export function isSensitiveKey(keyPath: string[]): boolean {
  return keyPath.some((key) =>
    /password|passwd|pwd|token|secret|api[-_]?key|authorization|cookie|session|private[-_]?key/i.test(key)
  );
}

export function topLevelKeys(value: unknown): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) return Object.keys(value).slice(0, 20);
  if (Array.isArray(value) && value[0] && typeof value[0] === "object" && !Array.isArray(value[0])) {
    return Object.keys(value[0]).slice(0, 20);
  }
  return [];
}

export function containsSensitiveKey(value: unknown, path: string[] = []): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsSensitiveKey(item, path));
  return Object.entries(value).some(([key, child]) => isSensitiveKey([...path, key]) || containsSensitiveKey(child, [...path, key]));
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
}

