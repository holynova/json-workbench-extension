import { generateOutput, type OutputKind } from "../core/outputs";
import { repairJson } from "../core/repair";
import { defaultSettings, type GeneratorSettings, type JsonValue, type RepairResult } from "../core/types";
import type { MockRule } from "../core/mock";

export interface RepairRequest {
  id: string;
  type: "repair";
  input: string;
  extractAllBlocks?: boolean;
}

export interface OutputRequest {
  id: string;
  type: "output";
  kind: OutputKind;
  value: JsonValue;
  settings?: Partial<GeneratorSettings>;
  rules?: MockRule[];
}

export type WorkerRequest = RepairRequest | OutputRequest;

export type WorkerResponse =
  | { id: string; ok: true; type: "repair"; result: RepairResult }
  | { id: string; ok: true; type: "output"; output: string }
  | { id: string; ok: false; error: string };

const ctx: Worker = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === "repair") {
      post({ id: request.id, ok: true, type: "repair", result: repairJson(request.input, { extractAllBlocks: request.extractAllBlocks }) });
      return;
    }

    const settings = { ...defaultSettings, ...request.settings };
    post({
      id: request.id,
      ok: true,
      type: "output",
      output: generateOutput(request.kind, request.value, settings, request.rules ?? [])
    });
  } catch (error) {
    post({ id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

function post(response: WorkerResponse): void {
  ctx.postMessage(response);
}

