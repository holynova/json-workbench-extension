import type { RepairAction, RepairWarning } from "./types";

export interface PreparedInput {
  text: string;
  sourceMode: "json" | "jsonl" | "json-block" | "multi-json-block" | "unknown";
  actions: RepairAction[];
  warnings: RepairWarning[];
}

export function stripMarkdownFence(input: string): { text: string; action?: RepairAction } {
  const trimmed = input.trim();
  const match = trimmed.match(/^```(?:json|jsonc|javascript|js)?\s*\n([\s\S]*?)\n```$/i);
  if (!match) return { text: input };
  return {
    text: match[1],
    action: { kind: "markdown-fence", message: "Removed surrounding Markdown code fence." }
  };
}

export function looksLikeJsonl(input: string): boolean {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((line) => line.startsWith("{") || line.startsWith("["));
}

export function jsonlToArrayText(input: string): string {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return `[${lines.join(",")}]`;
}

export function extractLikelyJsonBlock(input: string): { text: string; action?: RepairAction; warning?: RepairWarning } {
  const start = findFirstJsonStart(input);
  if (start === -1) return { text: input };

  const end = findMatchingEnd(input, start);
  if (end === -1) {
    return {
      text: input.slice(start),
      action: { kind: "json-block", message: "Extracted a JSON-like block from surrounding text." },
      warning: {
        kind: "unterminated-block",
        message: "The extracted block appears to be unterminated; repair will attempt to close it."
      }
    };
  }

  if (start === 0 && end === input.length - 1) return { text: input };

  return {
    text: input.slice(start, end + 1),
    action: { kind: "json-block", message: "Extracted the most likely JSON block from surrounding text." }
  };
}

export function extractAllJsonBlocks(input: string): PreparedInput {
  const blocks: string[] = [];
  let offset = 0;
  while (offset < input.length) {
    const relativeStart = findFirstJsonStart(input.slice(offset));
    if (relativeStart === -1) break;
    const start = offset + relativeStart;
    const end = findMatchingEnd(input, start);
    if (end === -1) break;
    blocks.push(input.slice(start, end + 1));
    offset = end + 1;
  }

  return {
    text: `[${blocks.join(",")}]`,
    sourceMode: "multi-json-block",
    actions: [{ kind: "multi-json-block", message: `Extracted ${blocks.length} JSON blocks as an array.` }],
    warnings:
      blocks.length === 0
        ? [{ kind: "no-json-blocks", message: "No complete JSON blocks were found." }]
        : []
  };
}

export function prepareInput(input: string, options?: { extractAllBlocks?: boolean }): PreparedInput {
  const actions: RepairAction[] = [];
  const warnings: RepairWarning[] = [];
  const stripped = stripMarkdownFence(input);
  let text = stripped.text.trim();
  if (stripped.action) actions.push(stripped.action);

  if (options?.extractAllBlocks) {
    const extracted = extractAllJsonBlocks(text);
    return {
      ...extracted,
      actions: [...actions, ...extracted.actions],
      warnings: [...warnings, ...extracted.warnings]
    };
  }

  if (looksLikeJsonl(text)) {
    actions.push({ kind: "jsonl", message: "Converted JSONL lines into a JSON array." });
    return { text: jsonlToArrayText(text), sourceMode: "jsonl", actions, warnings };
  }

  const first = text.trim()[0];
  if (first !== "{" && first !== "[") {
    const extracted = extractLikelyJsonBlock(text);
    text = extracted.text;
    if (extracted.action) actions.push(extracted.action);
    if (extracted.warning) warnings.push(extracted.warning);
    return { text, sourceMode: "json-block", actions, warnings };
  }

  return { text, sourceMode: "json", actions, warnings };
}

function findFirstJsonStart(input: string): number {
  const objectStart = input.indexOf("{");
  const arrayStart = input.indexOf("[");
  if (objectStart === -1) return arrayStart;
  if (arrayStart === -1) return objectStart;
  return Math.min(objectStart, arrayStart);
}

function findMatchingEnd(input: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (char === "\\") {
        escape = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      stack.push(char);
    } else if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (stack.at(-1) !== expected) return -1;
      stack.pop();
      if (stack.length === 0) return index;
    }
  }

  return -1;
}

