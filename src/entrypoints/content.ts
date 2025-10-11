import { browserInfo, IS_DEBUG } from "@/utils/consts";
import { MessageType } from "@/rpc/types";

/*
  Here we use externally_connectable in manifest.json to allow the web page to connect to the extension directly.
*/
function process_forward(event: MessageEvent) {
  if (browserInfo.isChrome) {
    browser.runtime.sendMessage(event.data, (response) => {
      debugLog("Crawler response:", response);
      window.postMessage(response, event.origin);
    });
  } else if (browserInfo.isFirefox) {
    browser.runtime.sendMessage(event.data).then((resp) => {
      window.postMessage(resp, event.origin);
    });
  } else {
    throw new Error("Unsupported browser");
  }
}

export default defineContentScript({
  matches: [
    "http://localhost/*",
    "https://*.novelia.cc/*",
    "https://*.fishhawk.top/*",
  ],
  main() {
    debugLog("Content script for auto-novel loaded.");
    window.addEventListener("message", (event) => {
      if (event.source !== window) {
        return;
      }

      let isValidMessage = false;
      for (const key of Object.keys(MessageType)) {
        if (event.data?.type === (MessageType as any)[key]) {
          if (browserInfo.isChrome) {
            if (IS_DEBUG) {
              debugLog(
                "In Production Mode, please use chrome.runtime.postMessage",
              );
            }
            return;
          }
          isValidMessage = true;
          break;
        }
      }
      if (event.data?.type == MessageType.Response) return; // Ignore responses.
      if (!isValidMessage) return; // Ignore unknown messages.
      process_forward(event);
    });
  },
});
