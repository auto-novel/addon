import { MessageType } from "@/rpc/types";

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
  async main() {
    debugLog("Content script for auto-novel loaded.");
    if (import.meta.env.FIREFOX) {
      forwardMessageToAddon();
    }

    debugLog("Injecting Addon into web page.");
    await injectScript("/addon-world.js", {
      keepInDom: true,
    });
  },
});
