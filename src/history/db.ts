import Dexie, { type Table } from "dexie";
import { sha256 } from "../core/hash";
import { containsSensitiveKey, topLevelKeys } from "../core/semantic";
import type { GeneratorSettings, HistoryItem, InputSource, RepairSuccess } from "../core/types";

class JsonWorkbenchDb extends Dexie {
  history!: Table<HistoryItem, string>;

  constructor() {
    super("json-workbench");
    this.version(1).stores({
      history: "id, inputHash, lastUsedAt, sensitive, source"
    });
  }
}

export const db = new JsonWorkbenchDb();

export async function saveHistoryItem(
  result: RepairSuccess,
  source: InputSource,
  settings: GeneratorSettings,
  options?: { privateMode?: boolean; maxItems?: number }
): Promise<HistoryItem | undefined> {
  if (options?.privateMode) return undefined;
  const inputHash = await sha256(result.rawInput);
  const existing = await db.history.where("inputHash").equals(inputHash).first();
  const now = new Date().toISOString();

  if (existing) {
    const updated: HistoryItem = {
      ...existing,
      repairedJson: result.formatted,
      repairStatus: result.report.status,
      sensitive: containsSensitiveKey(result.value),
      topLevelKeys: topLevelKeys(result.value),
      size: result.rawInput.length,
      mockLocale: settings.mockLocale,
      mockSeed: settings.mockSeed,
      updatedAt: now,
      lastUsedAt: now,
      useCount: existing.useCount + 1
    };
    await db.history.put(updated);
    return updated;
  }

  const item: HistoryItem = {
    id: crypto.randomUUID(),
    inputHash,
    rawInput: result.rawInput,
    repairedJson: result.formatted,
    source,
    repairStatus: result.report.status,
    sensitive: containsSensitiveKey(result.value),
    topLevelKeys: topLevelKeys(result.value),
    size: result.rawInput.length,
    mockLocale: settings.mockLocale,
    mockSeed: settings.mockSeed,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    useCount: 1
  };
  await db.history.add(item);
  await enforceHistoryLimit(options?.maxItems ?? 50);
  return item;
}

export async function listHistory(): Promise<HistoryItem[]> {
  return db.history.orderBy("lastUsedAt").reverse().toArray();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await db.history.delete(id);
}

export async function clearHistory(): Promise<void> {
  await db.history.clear();
}

export async function clearSensitiveHistory(): Promise<void> {
  const sensitiveItems = await db.history.filter((item) => item.sensitive).toArray();
  await db.history.bulkDelete(sensitiveItems.map((item) => item.id));
}

async function enforceHistoryLimit(maxItems: number): Promise<void> {
  const count = await db.history.count();
  if (count <= maxItems) return;
  const overflow = count - maxItems;
  const oldest = await db.history.orderBy("lastUsedAt").limit(overflow).toArray();
  await db.history.bulkDelete(oldest.map((item) => item.id));
}
