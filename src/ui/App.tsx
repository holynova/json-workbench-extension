import { Clipboard, Copy, FileInput, History, Maximize2, Play, RefreshCcw, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OutputKind } from "../core/outputs";
import { defaultSettings, type GeneratorSettings, type HistoryItem, type InputSource, type RepairResult } from "../core/types";
import { clearHistory, clearSensitiveHistory, deleteHistoryItem, listHistory, saveHistoryItem } from "../history/db";
import { CodeEditor } from "./CodeEditor";
import { outputInWorker, repairInWorker } from "./workerClient";

const outputTabs: Array<{ kind: OutputKind | "diff"; label: string; language: "json" | "javascript" | "python" | "text" }> = [
  { kind: "formatted", label: "Formatted", language: "json" },
  { kind: "minified", label: "Minified", language: "json" },
  { kind: "diff", label: "Diff", language: "text" },
  { kind: "schema", label: "Schema", language: "json" },
  { kind: "typescript", label: "TypeScript", language: "javascript" },
  { kind: "zod", label: "Zod", language: "javascript" },
  { kind: "pydantic", label: "Pydantic", language: "python" },
  { kind: "mock", label: "Mock", language: "json" }
];

export function App() {
  const [view, setView] = useState<"workbench" | "history">("workbench");
  const [input, setInput] = useState("{\n  \"city\": \"Shanghai\",\n  \"status\": \"active\"\n}");
  const [source, setSource] = useState<InputSource>("manual");
  const [repairResult, setRepairResult] = useState<RepairResult | undefined>();
  const [settings, setSettings] = useState<GeneratorSettings>(defaultSettings);
  const [activeOutput, setActiveOutput] = useState<(typeof outputTabs)[number]>(outputTabs[0]);
  const [output, setOutput] = useState("");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [privateMode, setPrivateMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastSavedInput, setLastSavedInput] = useState("");

  const isFullPage = useMemo(() => location.pathname.includes("workbench"), []);

  useEffect(() => {
    void loadPendingSelection();
    void refreshHistory();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (input.trim()) void runRepair("manual", input, { saveHistory: false });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (input.trim() && input !== lastSavedInput) void runRepair("manual", input, { saveHistory: true });
    }, 1800);
    return () => window.clearTimeout(handle);
  }, [input, lastSavedInput]);

  useEffect(() => {
    if (!repairResult?.ok) {
      setOutput("");
      return;
    }
    void generateActiveOutput();
  }, [activeOutput, repairResult, settings]);

  async function loadPendingSelection() {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const data = await chrome.storage.local.get("pendingSelectionText");
    if (typeof data.pendingSelectionText === "string") {
      setInput(data.pendingSelectionText);
      setSource("selection");
      await chrome.storage.local.remove("pendingSelectionText");
      await runRepair("selection", data.pendingSelectionText, { saveHistory: true });
      setView("workbench");
    }
  }

  async function runRepair(nextSource: InputSource = source, nextInput = input, options: { saveHistory?: boolean } = { saveHistory: true }) {
    setBusy(true);
    try {
      const result = await repairInWorker(nextInput);
      setRepairResult(result);
      setSource(nextSource);
      if (result.ok && options.saveHistory) {
        await saveHistoryItem(result, nextSource, settings, { privateMode });
        setLastSavedInput(result.rawInput);
        await refreshHistory();
      }
    } finally {
      setBusy(false);
    }
  }

  async function generateActiveOutput() {
    if (!repairResult?.ok) return;
    if (activeOutput.kind === "diff") {
      setOutput(buildDiffText(repairResult.rawInput, repairResult.formatted));
      return;
    }
    setOutput(await outputInWorker(activeOutput.kind, repairResult.value, settings));
  }

  async function pasteFromClipboard() {
    const text = await navigator.clipboard.readText();
    setInput(text);
    await runRepair("clipboard", text, { saveHistory: true });
    setView("workbench");
  }

  async function importFile(file: File) {
    const text = await file.text();
    setInput(text);
    await runRepair("file", text, { saveHistory: true });
    setView("workbench");
  }

  async function refreshHistory() {
    setHistoryItems(await listHistory());
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
  }

  function refreshMock() {
    setSettings((current) => ({ ...current, mockSeed: Date.now() }));
  }

  return (
    <main className={isFullPage ? "app appFull" : "app"}>
      <header className="toolbar">
        <button onClick={pasteFromClipboard} title="Paste from clipboard">
          <Clipboard size={16} /> Paste
        </button>
        <label className="fileButton" title="Import file">
          <FileInput size={16} /> Import
          <input
            type="file"
            accept=".json,.txt,.log,application/json,text/plain"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void importFile(file);
            }}
          />
        </label>
        <button onClick={() => window.open("/workbench.html", "_blank")} title="Open full page">
          <Maximize2 size={16} /> Full
        </button>
        <button onClick={() => setPrivateMode((value) => !value)} className={privateMode ? "active" : ""} title="Private mode">
          <Settings size={16} /> Private
        </button>
      </header>

      <section className="mainTabs">
        <button className={view === "workbench" ? "active" : ""} onClick={() => setView("workbench")}>Workbench</button>
        <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
          <History size={15} /> History
        </button>
      </section>

      {view === "workbench" && (
        <section className="workspace">
          <section className="panel inputPane">
            <div className="paneHeader">
              <strong>Input</strong>
              <span>{busy ? "Processing..." : repairResult ? `Status: ${repairResult.report.status}` : "Idle"}</span>
            </div>
            <CodeEditor value={input} onChange={setInput} minHeight={isFullPage ? 620 : 260} />
            <div className="statusBar">
              <span>Source: {source}</span>
              <button onClick={() => runRepair(source, input, { saveHistory: true })}>
                <Play size={16} /> Run
              </button>
            </div>
            {repairResult && <RepairReportView result={repairResult} />}
          </section>

          <section className="panel outputPane">
            <div className="paneHeader">
              <strong>Output</strong>
              <span>{activeOutput.label}</span>
            </div>
            <div className="outputTabs">
              {outputTabs.map((tab) => (
                <button key={tab.kind} className={activeOutput.kind === tab.kind ? "active" : ""} onClick={() => setActiveOutput(tab)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="outputToolbar">
              <button onClick={copyOutput} disabled={!output}>
                <Copy size={16} /> Copy {activeOutput.label}
              </button>
              {activeOutput.kind === "mock" && (
                <>
                  <button onClick={refreshMock}>
                    <RefreshCcw size={16} /> Refresh
                  </button>
                  <select
                    value={settings.mockLocale}
                    onChange={(event) => setSettings((current) => ({ ...current, mockLocale: event.target.value as GeneratorSettings["mockLocale"] }))}
                  >
                    <option value="en">English</option>
                    <option value="zh_CN">中文</option>
                  </select>
                  <select
                    value={settings.mockArraySize}
                    onChange={(event) => setSettings((current) => ({ ...current, mockArraySize: Number(event.target.value) }))}
                  >
                    <option value={1}>1 item</option>
                    <option value={3}>3 items</option>
                    <option value={10}>10 items</option>
                  </select>
                </>
              )}
            </div>
            {repairResult?.ok ? (
              <CodeEditor value={output} readonly language={activeOutput.language} minHeight={isFullPage ? 620 : 320} />
            ) : (
              <div className="empty">Repair must succeed before outputs are available.</div>
            )}
          </section>
        </section>
      )}

      {view === "history" && (
        <section className="panel historyList">
          <div className="outputToolbar">
            <button
              onClick={async () => {
                await clearSensitiveHistory();
                await refreshHistory();
              }}
            >
              Clear sensitive
            </button>
            <button
              onClick={async () => {
                await clearHistory();
                await refreshHistory();
              }}
            >
              Clear all
            </button>
          </div>
          {historyItems.map((item) => (
            <article key={item.id} className="historyItem">
              <button
                onClick={() => {
                  setInput(item.rawInput);
                  setSource("history");
                  void runRepair("history", item.rawInput, { saveHistory: true });
                  setView("workbench");
                }}
              >
                <strong>{item.topLevelKeys.join(", ") || "JSON"}</strong>
                <span>{new Date(item.lastUsedAt).toLocaleString()} · {item.size} chars · {item.repairStatus}</span>
                {item.sensitive && <mark>sensitive</mark>}
              </button>
              <button
                className="iconOnly"
                onClick={async () => {
                  await deleteHistoryItem(item.id);
                  await refreshHistory();
                }}
              >
                Delete
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function RepairReportView({ result }: { result: RepairResult }) {
  return (
    <aside className={`repairReport ${result.ok ? "ok" : "failed"}`}>
      <strong>{result.report.status}</strong>
      {result.report.actions.map((action) => <p key={`${action.kind}-${action.message}`}>{action.message}</p>)}
      {result.report.warnings.map((warning) => <p key={`${warning.kind}-${warning.message}`}>{warning.message}</p>)}
      {!result.ok && result.report.diagnostic && (
        <>
          <p>{result.report.diagnostic.message}</p>
          <pre>{result.report.diagnostic.snippet}</pre>
          <p>{result.report.diagnostic.suggestedFix}</p>
        </>
      )}
    </aside>
  );
}

function buildDiffText(raw: string, repaired: string): string {
  return `--- Raw input\n${raw}\n\n--- Repaired JSON\n${repaired}`;
}
