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
import { alarmLisener } from "./alarm";
import { redirectToAutoNovel } from "./redirect";
import { addContextMenu, handleContextMenu } from "./context-menu";

export default defineBackground(() => {
  debugLog.info(`CSC debug mode: ${IS_DEBUG}`);

  rulesMgr.clear();
  rateLimiter.init();

  browser.alarms.onAlarm.addListener(alarmLisener);

  browser.runtime.onInstalled.addListener(addContextMenu);
  browser.contextMenus.onClicked.addListener(handleContextMenu);

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
        break;
      }
      case MessageType.Request: {
        const msg = message as MessageRequest;

        debugLog(sender);

        if (sender.url === undefined || sender.tab?.id == undefined) {
          throw newError(`Invalid sender: ${sender}`);
        }

        const env: EnvType = {
          sender: {
            url: sender.url,
            tabId: sender.tab?.id,
            origin: sender.origin,
          },
        };

        dispatchCommand(msg.payload.cmd, msg.payload.params, env)
          .then((result) => {
            debugLog("Crawler Result: ", result);

            const resp = {
              type: MessageType.Response,
              id: msg.id,
              payload: { success: true, result },
            };
            return sendResponse(resp);
          })
          .catch((error) => {
            const resp: MessageResponse = {
              type: MessageType.Response,
              id: msg.id,
              payload: { success: false, error: error.message },
            };
            return sendResponse(resp);
          });
        break;
      }
      default:
        throw newError(`Unknown message type: ${message.type}`);
    }
    return true;
  };

  browser.runtime.onMessage.addListener(messageFn);
  browser.runtime.onMessageExternal.addListener(messageFn);

  browser.action.onClicked.addListener(redirectToAutoNovel);

  if (IS_DEBUG) {
    browser.runtime.openOptionsPage();
  }
});
