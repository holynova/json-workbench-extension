const selectionStorageKey = "pendingSelectionText";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fix-selected-json",
    title: "Fix selected JSON",
    contexts: ["selection"]
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  await openSidePanel(tab.windowId);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-json-workbench") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await openSidePanel(tab?.windowId);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "fix-selected-json" || !info.selectionText) return;
  await chrome.storage.local.set({ [selectionStorageKey]: info.selectionText });
  await openSidePanel(tab?.windowId);
});

async function openSidePanel(windowId?: number): Promise<void> {
  if (typeof windowId === "number") {
    await chrome.sidePanel.open({ windowId });
  }
}

