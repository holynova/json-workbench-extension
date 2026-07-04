import { jsonrepair } from "jsonrepair";
import { prepareInput } from "./text";
import type { JsonValue, RepairDiagnostic, RepairResult } from "./types";

export function repairJson(input: string, options?: { extractAllBlocks?: boolean }): RepairResult {
  const prepared = prepareInput(input, options);

  try {
    const repairedText = jsonrepair(prepared.text);
    const value = JSON.parse(repairedText) as JsonValue;
    const formatted = JSON.stringify(value, null, 2);
    const minified = JSON.stringify(value);
    const changed = normalized(prepared.text) !== normalized(repairedText);
    const status = prepared.warnings.length > 0 ? "warning" : changed || prepared.actions.length > 0 ? "repaired" : "valid";

    return {
      ok: true,
      rawInput: input,
      repairedText,
      formatted,
      minified,
      value,
      report: {
        status,
        sourceMode: prepared.sourceMode,
        actions: prepared.actions,
        warnings: prepared.warnings
      }
    };
  } catch (error) {
    return {
      ok: false,
      rawInput: input,
      report: {
        status: "failed",
        sourceMode: prepared.sourceMode,
        actions: prepared.actions,
        warnings: prepared.warnings,
        diagnostic: buildDiagnostic(prepared.text, error)
      }
    };
  }
}

function normalized(value: string): string {
  return value.replace(/\s+/g, "");
}

function buildDiagnostic(input: string, error: unknown): RepairDiagnostic {
  const message = error instanceof Error ? error.message : String(error);
  const location = parseLocation(message);
  const snippet = location ? snippetAt(input, location.line, location.column) : input.slice(0, 240);

  return {
    message,
    ...location,
    snippet,
    likelyCause: inferLikelyCause(message),
    suggestedFix: inferSuggestedFix(message)
  };
}

function parseLocation(message: string): { line: number; column: number } | undefined {
  const lineColumn = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (lineColumn) {
    return { line: Number(lineColumn[1]), column: Number(lineColumn[2]) };
  }
  const position = message.match(/position\s+(\d+)/i);
  if (!position) return undefined;
  return { line: 1, column: Number(position[1]) + 1 };
}

function snippetAt(input: string, line: number, column: number): string {
  const lines = input.split(/\r?\n/);
  const current = lines[line - 1] ?? input;
  const pointer = `${" ".repeat(Math.max(column - 1, 0))}^`;
  return `${current}\n${pointer}`;
}

function inferLikelyCause(message: string): string {
  if (/colon/i.test(message)) return "A property may be missing a colon between key and value.";
  if (/comma/i.test(message)) return "A comma may be missing or trailing in an unsupported place.";
  if (/quote|string/i.test(message)) return "A string may be missing a quote or contains an invalid escape.";
  if (/end|unexpected/i.test(message)) return "The JSON may be truncated or missing a closing bracket.";
  return "The input could not be safely repaired into valid JSON.";
}

function inferSuggestedFix(message: string): string {
  if (/colon/i.test(message)) return "Check the highlighted object property and add a colon if needed.";
  if (/quote|string/i.test(message)) return "Check string boundaries and escape any raw quote characters.";
  if (/end|unexpected/i.test(message)) return "Check for a missing closing brace, bracket, or value near the end.";
  return "Review the highlighted area and provide the missing structural token.";
}

