import { Clipboard, Copy, Eraser, FileInput, Github, History, Maximize2, RefreshCcw, Save, Settings } from "lucide-react";
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

const repoUrl = "https://github.com/holynova/json-workbench-extension";

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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const isFullPage = useMemo(() => location.pathname.includes("workbench"), []);

  useEffect(() => {
    void loadPendingSelection();
    void refreshHistory();
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local" || typeof changes.pendingSelectionText?.newValue !== "string") return;
      void loadPendingSelection();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
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
    try {
      await writeClipboard(output);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    } finally {
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  function refreshMock() {
    setSettings((current) => ({ ...current, mockSeed: Date.now() }));
  }

  return (
    <main className={isFullPage ? "app appFull" : "app"}>
      <header className="toolbar">
        <div className="brandBlock">
          <span className="eyebrow">Local JSON workbench</span>
          <h1>Repair, inspect, and derive.</h1>
        </div>
        <div className="toolbarActions">
          <button className="button buttonSecondary" onClick={pasteFromClipboard} title="Paste from clipboard">
            <Clipboard size={16} /> Paste
          </button>
          <label className="button buttonSecondary fileButton" title="Import file">
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
          <button className="button buttonGhost" onClick={() => window.open("/workbench.html", "_blank")} title="Open full page">
            <Maximize2 size={16} /> Full
          </button>
          <a className="button buttonGhost" href={repoUrl} target="_blank" rel="noreferrer" title="Open GitHub repository">
            <Github size={16} /> GitHub
          </a>
          <button
            onClick={() => setPrivateMode((value) => !value)}
            className={privateMode ? "button buttonToggle active" : "button buttonToggle"}
            title="Private mode stops this session from writing input or repaired JSON to local history."
          >
            <Settings size={16} /> Private
          </button>
          <span className={privateMode ? "privateHint active" : "privateHint"}>
            {privateMode ? "History saving is paused." : "Private pauses local history for this session."}
          </span>
        </div>
      </header>

      <section className="mainTabs">
        <button className={view === "workbench" ? "tabButton active" : "tabButton"} onClick={() => setView("workbench")}>Workbench</button>
        <button className={view === "history" ? "tabButton active" : "tabButton"} onClick={() => setView("history")}>
          <History size={15} /> History
        </button>
      </section>

      {view === "workbench" && (
        <section className="workspace">
          <section className="panel inputPane">
            <div className="paneHeader">
              <div>
                <span className="paneKicker">01</span>
                <strong>Input</strong>
              </div>
              <StatusBadge busy={busy} status={repairResult?.report.status} />
            </div>
            <div className="inputControls">
              <div className="sourceRow">
                <span className="sourceChip">Source: {source}</span>
              </div>
              <div className="statusBar">
                <button className="button buttonGhost" onClick={() => setInput("")}>
                  <Eraser size={16} /> Clear
                </button>
                <button className="button buttonPrimary" onClick={() => runRepair(source, input, { saveHistory: true })}>
                  <Save size={16} /> Save Snapshot
                </button>
              </div>
            </div>
            <CodeEditor
              className="workbenchEditor"
              value={input}
              onChange={setInput}
              minHeight={isFullPage ? 520 : 260}
              errorLine={!repairResult?.ok ? repairResult?.report.diagnostic?.line : undefined}
              errorColumn={!repairResult?.ok ? repairResult?.report.diagnostic?.column : undefined}
            />
            {repairResult && <RepairReportView result={repairResult} />}
          </section>

          <section className="panel outputPane">
            <div className="paneHeader">
              <div>
                <span className="paneKicker">02</span>
                <strong>Output</strong>
              </div>
              <span>{activeOutput.label}</span>
            </div>
            <div className="outputTabs">
              {outputTabs.map((tab) => (
                <button key={tab.kind} className={activeOutput.kind === tab.kind ? "outputTab active" : "outputTab"} onClick={() => setActiveOutput(tab)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="outputToolbar">
              <button className={copyState === "copied" ? "button buttonSuccess" : "button buttonPrimary"} onClick={copyOutput} disabled={!output}>
                <Copy size={16} /> {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : `Copy ${activeOutput.label}`}
              </button>
              {activeOutput.kind === "mock" && (
                <>
                  <button className="button buttonSecondary" onClick={refreshMock}>
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
              <CodeEditor className="workbenchEditor" value={output} readonly language={activeOutput.language} minHeight={isFullPage ? 520 : 320} />
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
              className="button buttonSecondary"
              onClick={async () => {
                await clearSensitiveHistory();
                await refreshHistory();
              }}
            >
              Clear sensitive
            </button>
            <button
              className="button buttonDanger"
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
                className="historyLoadButton"
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
                className="button buttonGhost iconOnly"
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

function StatusBadge({ busy, status }: { busy: boolean; status?: RepairResult["report"]["status"] }) {
  if (busy) return <span className="statusBadge processing">Processing</span>;
  if (!status) return <span className="statusBadge idle">Idle</span>;
  return <span className={`statusBadge ${status}`}>{status}</span>;
}

async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!copied) throw new Error("Copy command failed");
  }
}

function buildDiffText(raw: string, repaired: string): string {
  return `--- Raw input\n${raw}\n\n--- Repaired JSON\n${repaired}`;
}
