import { isDebug } from "@utils/consts";
import { MSG_TYPE, type AutoNovelCrawlerCommand, type MSG_CRAWLER } from "@utils/msg";

console.log("[AutoNovel] Content script for auto-novel loaded.");

function process_ping(event: MessageEvent) {
  window.postMessage(
    {
      type: MSG_TYPE.RESPONSE,
      payload: "pong"
    },
    event.origin
  );
}

function process_crawler_request(payload: AutoNovelCrawlerCommand, event: MessageEvent) {
  const fwd_msg: MSG_CRAWLER = {
    type: MSG_TYPE.CRAWLER_REQ,
    payload
  };

  chrome.runtime.sendMessage(fwd_msg, (response) => {
    if (isDebug) {
      console.info("[AutoNovel] Crawler response:", response);
    }
    window.postMessage(
      {
        type: MSG_TYPE.RESPONSE,
        payload: response
      },
      event.origin
    );
  });
}

window.addEventListener("message", (event) => {
  // Safety check
  if (event.source !== window) {
    return;
  }

  switch (event.data.type) {
    case MSG_TYPE.PING: {
      process_ping(event);
      break;
    }
    case MSG_TYPE.CRAWLER_REQ: {
      const msg: MSG_CRAWLER = event.data;
      process_crawler_request(msg.payload, event);
      break;
    }
    default:
      return;
  }
});
