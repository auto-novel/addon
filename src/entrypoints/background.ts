import { IS_DEBUG } from "@/utils/consts";
import {
  MessageRequest,
  MessageResponse,
  MessageType,
  type Message,
} from "@/rpc/types";
import { doRedirection } from "@/utils/redirect";
import { debugLog } from "@/utils/tools";
import { alarmLisener } from "@/utils/alarm";

import * as Api from "@/utils/api";
import { dispatchCommand } from "@/rpc/web";
import { EnvType } from "@/rpc/types";

export default defineBackground(() => {
  debugLog.info(`CSC debug mode: ${IS_DEBUG}`);
  rulesMgr.clear();

  browser.alarms.onAlarm.addListener(alarmLisener);

  const messageFn = (
    message: Message,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response: any) => void,
  ) => {
    if (IS_DEBUG) {
      debugLog("Received message: ", message, sender);
    }

    // FIXME(kuriko): check sender origin to prevent abuse
    // consts.ts / isMessagingAllowed function

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

  browser.action.onClicked.addListener(async () => {
    debugLog("Browser action clicked");
    if (IS_DEBUG) {
      try {
        // FIXME(kuriko): 怎么可能又重定向又打开设置页的
        const resp = await Api.tab_http_fetch(
          "https://www.amazon.co.jp",
          "https://www.amazon.co.jp/dp/4098505789",
          {},
        );
        debugLog("http_fetch: ", resp);
      } catch (e) {
        debugLog.error("Error in browser action: ", e);
      }
      return;
    }

    doRedirection();
    browser.runtime.openOptionsPage();
  });
  browser.runtime.openOptionsPage();
});
