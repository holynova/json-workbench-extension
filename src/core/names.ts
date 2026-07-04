export function toPascalCase(value: string): string {
  const words = splitWords(value);
  const result = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  return result || "Value";
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function singularize(value: string): string {
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("s") && value.length > 1) return value.slice(0, -1);
  return value;
}

export function isValidIdentifier(value: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(value);
}

export function tsPropertyName(key: string, camelCase: boolean): string {
  const output = camelCase ? toCamelCase(key) : key;
  return isValidIdentifier(output) ? output : JSON.stringify(output);
}

export function pythonFieldName(key: string): string {
  const candidate = toCamelCase(key).replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(candidate) ? candidate : `field_${candidate}`;
}

function splitWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

