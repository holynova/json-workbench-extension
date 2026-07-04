const selectionStorageKey = "pendingSelectionText";
const contextMenuId = "fix-selected-json";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureContextMenu();
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(() => {
  void ensureContextMenu();
});

async function ensureContextMenu(): Promise<void> {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: contextMenuId,
    title: "Fix selected JSON",
    contexts: ["selection"]
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  await openSidePanel(tab.windowId);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-json-workbench") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await openSidePanel(tab?.windowId);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== contextMenuId || !info.selectionText) return;
  await chrome.storage.local.set({ [selectionStorageKey]: info.selectionText });
  await openSidePanel(tab?.windowId);
});

async function openSidePanel(windowId?: number): Promise<void> {
  if (typeof windowId === "number") {
    await chrome.sidePanel.open({ windowId });
  }
}
