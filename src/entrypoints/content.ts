import { MessageType } from "@/rpc/types";

function isAddonDebugLogMessage(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data != null &&
    (data as { type?: unknown }).type === MessageType.DebugLog
  );
}

function forwardDebugLogToAddon() {
  window.addEventListener("message", (event) => {
    if (event.source !== window || !isAddonDebugLogMessage(event.data)) return;
    browser.runtime.sendMessage(event.data).catch((error) => {
      console.warn("[AutoNovel.addon] Failed to forward debug log", error);
    });
  });
}

// Firefox 不支持 MAIN 域直接向插件发送消息，需要通过 content script 转发
function forwardMessageToAddon() {
  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }

    let isValidMessage = false;
    for (const key of Object.keys(MessageType)) {
      if (event.data?.type === (MessageType as any)[key]) {
        isValidMessage = true;
        break;
      }
    }
    if (event.data?.type == MessageType.Response) return; // Ignore responses.
    if (event.data?.type == MessageType.DebugLog) return; // Handled by forwardDebugLogToAddon.
    if (!isValidMessage) return; // Ignore unknown messages.

    browser.runtime.sendMessage(event.data).then((resp) => {
      window.postMessage(resp, event.origin);
    });
  });
}

export default defineContentScript({
  matches: [
    "http://localhost/*",
    "https://*.novelia.cc/*",
    "https://*.fishhawk.top/*",
  ],
  runAt: "document_start",
  async main() {
    // add addon mark to notify web side
    document.documentElement.dataset.autoNovelAddon = "loading";

    forwardDebugLogToAddon();
    console.info("Content script for auto-novel loaded.");
    if (import.meta.env.FIREFOX) {
      forwardMessageToAddon();
    }

    console.info("Injecting Addon into web page.");
    await injectScript("/inject.js", {
      keepInDom: true,
    });
  },
});
