import { isDebug } from "@utils/consts";
import { MSG_TYPE, type AutoNovelCrawlerCommand, type MSG_CRAWLER, type MSG_RESPONSE } from "@utils/msg";

console.log("[AutoNovel] Content script for auto-novel loaded.");

/*
  Here we use externally_connectable in manifest.json to allow the web page to connect to the extension directly.
*/

function process_ping(event: MessageEvent) {
  window.postMessage(
    {
      type: MSG_TYPE.RESPONSE,
      id: event.data.id,
      payload: "pong"
    },
    event.origin
  );
}

function process_crawler_request(payload: AutoNovelCrawlerCommand, event: MessageEvent) {
  const fwd_msg: MSG_CRAWLER = {
    id: event.data.id,
    type: MSG_TYPE.CRAWLER_REQ,
    payload
  };

  chrome.runtime.sendMessage(fwd_msg, (response) => {
    console.debug("[AutoNovel] Crawler response:", response);
    const resp: MSG_RESPONSE = {
      id: event.data.id,
      type: MSG_TYPE.RESPONSE,
      payload: response
    };
    window.postMessage(resp, event.origin);
  });
}

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }

  for (const key of Object.keys(MSG_TYPE)) {
    if (event.data.type === (MSG_TYPE as any)[key]) {
      if (isDebug) {
        console.info("[AutoNovel] In Production Mode, please use chrome.runtime.postMessage");
        return;
      }
      break;
    }
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
