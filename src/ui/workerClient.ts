import type { OutputKind } from "../core/outputs";
import type { GeneratorSettings, JsonValue, RepairResult } from "../core/types";
import type { MockRule } from "../core/mock";
import type { WorkerRequest, WorkerResponse } from "../worker/processor";

const worker = new Worker(new URL("../worker/processor.ts", import.meta.url), { type: "module" });
const pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();

worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
  const response = event.data;
  const callbacks = pending.get(response.id);
  if (!callbacks) return;
  pending.delete(response.id);
  if (!response.ok) {
    callbacks.reject(new Error(response.error));
  } else if (response.type === "repair") {
    callbacks.resolve(response.result);
  } else {
    callbacks.resolve(response.output);
  }
};

export function repairInWorker(input: string, options?: { extractAllBlocks?: boolean }): Promise<RepairResult> {
  return request<RepairResult>({ id: crypto.randomUUID(), type: "repair", input, extractAllBlocks: options?.extractAllBlocks });
}

export function outputInWorker(
  kind: OutputKind,
  value: JsonValue,
  settings: GeneratorSettings,
  rules: MockRule[] = []
): Promise<string> {
  return request<string>({ id: crypto.randomUUID(), type: "output", kind, value, settings, rules });
}

function request<T>(message: WorkerRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    pending.set(message.id, { resolve: resolve as (value: unknown) => void, reject });
    worker.postMessage(message);
  });
}

