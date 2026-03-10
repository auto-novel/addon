import {
  EnvType,
  MessageRequest,
  MessageResponse,
  MessageType,
  type Message,
} from "@/rpc/types";
import { dispatchCommand } from "@/rpc/web";
import { IS_DEBUG } from "@/utils/consts";
import { debugLog } from "@/utils/tools";
import { alarmListener } from "./alarm";
import { redirectToAutoNovel } from "./redirect";
import { addContextMenu, handleContextMenu } from "./context-menu";
import { SpoofInit } from "@/entrypoints/background/spoof";

let resolveInit: () => void;
const initCompletePromise: Promise<void> = new Promise((resolve) => {
  resolveInit = resolve;
});

const messageFn = (
  message: Message,
  sender: Browser.runtime.MessageSender,
  sendResponse: (response: any) => void,
) => {
  if (IS_DEBUG) {
    debugLog("Received message: ", message, sender);
  }

  switch (message.type) {
    case MessageType.Ping: {
      sendResponse("pong");
      return false;
    }
    case MessageType.Request: {
      const msg = message as MessageRequest;
      debugLog(sender);

      if (sender.url === undefined || sender.tab?.id == undefined) {
        console.error(`Invalid sender: ${sender}`);
        return false;
      }

      const env: EnvType = {
        sender: {
          url: sender.url,
          tabId: sender.tab?.id,
          origin: sender.origin,
        },
      };

      (async () => {
        await initCompletePromise;
        dispatchCommand(msg.payload.cmd, msg.payload.params, env)
          .then((result) => {
            debugLog("Crawler Result: ", result);

            const resp = {
              type: MessageType.Response,
              id: msg.id,
              payload: { success: true, result },
            };
            sendResponse(resp);
          })
          .catch((error) => {
            const resp: MessageResponse = {
              type: MessageType.Response,
              id: msg.id,
              payload: { success: false, error: error.message },
            };
            sendResponse(resp);
          });
      })();

      return true;
    }
    default: {
      debugLog.error(`Unknown message type: ${message.type}`);
      return false;
    }
  }
};

async function initSessionState() {
  try {
    debugLog.info("Initializing session state...");
    await rulesMgr.clear();
    await SpoofInit().then(() => debugLog.info("Spoof rules initialized."));
  } catch (e) {
    debugLog.error("Session init failed", e);
  } finally {
    debugLog.info("Session state initialized.");
    if (resolveInit) resolveInit();
  }
}

export default defineBackground(() => {
  debugLog.info(`CSC debug mode: ${IS_DEBUG}`);

  rateLimiter.init();
  initSessionState();

  // Firefox mobile does not support context menus
  if (browser.contextMenus) {
    addContextMenu();
    browser.contextMenus.onClicked.addListener(handleContextMenu);
  }

  browser.runtime.onInstalled.addListener(async () => {});

  // Message Communication
  browser.runtime.onMessage.addListener(messageFn);
  browser.runtime.onMessageExternal.addListener(messageFn);

  // Alarm
  browser.alarms.onAlarm.addListener(alarmListener);

  // Toolbar button click
  browser.action.onClicked.addListener(redirectToAutoNovel);

  if (IS_DEBUG) {
    browser.runtime.openOptionsPage();
  }
});
