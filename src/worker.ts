import { isDebug } from "@/utils/consts";
import { WebCrawler } from "@rpc/web";
import { MSG_TYPE, type AutoNovelCrawlerCommand, type Message, type MSG_CRAWLER, type MSG_RESPONSE } from "@utils/msg";
import { do_redirection } from "@utils/redirect";
import { Api } from "@utils/api";
import type { CrawlerJob } from "@rpc/job";

chrome.runtime.onInstalled.addListener(() => {
  console.debug(`[AutoNovel] CSC production mode: ${isDebug}`);
});

const crawlerInstances: Map<number, WebCrawler> = new Map();

function getOrCreateCrawler(
  sender: chrome.runtime.MessageSender,
  payload: AutoNovelCrawlerCommand
): [number, WebCrawler] {
  const senderId = sender.tab?.id;
  if (!senderId) throw new Error(`Sender is unknown: ${sender}`);
  const existingCrawler = crawlerInstances.get(senderId);

  if (existingCrawler) {
    return [senderId, existingCrawler];
  } else {
    if (!payload.base_url) {
      throw new Error("Cannot create a new crawler without a base_url.");
    }
    const newCrawler = new WebCrawler(payload.base_url);
    crawlerInstances.set(senderId, newCrawler);
    console.log(`[AutoNovel] New crawler instance created for tab ${senderId}.`);
    return [senderId, newCrawler];
  }
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const crawler = crawlerInstances.get(tabId);
  if (crawler) {
    crawlerInstances.delete(tabId);
    await crawler.quit();
    console.log(`[AutoNovel] Crawler instance for tab ${tabId} has been cleaned up.`);
  }
});

const messageFn = (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  console.debug("[AutoNovel] Received message: ", message, sender);

  switch (message.type) {
    case MSG_TYPE.PING: {
      sendResponse("pong");
      break;
    }
    case MSG_TYPE.CRAWLER_REQ: {
      const msg = message as MSG_CRAWLER;
      const payload = msg.payload || {};
      if (!payload.base_url) payload.base_url = payload.data?.url;
      payload.single = payload.single || false;

      const [senderId, crawler] = getOrCreateCrawler(sender, payload);

      crawler
        .applyCommand(payload.cmd, payload.data)
        .then((result) => {
          console.debug("[AutoNovel] Crawler Result: ", result);

          const resp: MSG_RESPONSE = {
            type: MSG_TYPE.RESPONSE,
            id: msg.id,
            payload: { success: true, result }
          };
          return sendResponse(resp);
        })
        .catch((error) => {
          const resp: MSG_RESPONSE = {
            type: MSG_TYPE.RESPONSE,
            id: msg.id,
            payload: { success: true, error: error.message }
          };
          return sendResponse(resp);
        })
        .finally(async () => {
          if (!payload.single) return;
          crawlerInstances.delete(sender.tab!.id!);
          await crawler.quit();
        });
      break;
    }
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
  return true;
};

chrome.runtime.onMessage.addListener(messageFn);
chrome.runtime.onMessageExternal.addListener(messageFn);

chrome.action.onClicked.addListener(async () => {
  if (isDebug) {
    // const c = new WebCrawler("https://www.pixiv.net/novel/show.php?id=20701122");
    const api = new Api("https://echo.free.beeceptor.com");
    const fut = api.tab_swith_to("https://www.pixiv.net/novel/show.php?id=20701122");
    {
      const resp = await api.http_get("https://echo.free.beeceptor.com", { a: "1", b: "2" }, { "X-Test": "123" });
      console.log(resp);
    }
    {
      const resp = await api.http_post_json("https://echo.free.beeceptor.com", { hello: "world" }, { "X-Test": "123" });
      console.log(resp);
    }
    {
      await fut;
      const resp = await api.tab_http_get("https://echo.free.beeceptor.com", { a: "1", b: "2" }, { "X-Test": "123" });
      console.log(resp);
    }
    {
      const resp = await api.tab_http_post_json(
        "https://echo.free.beeceptor.com",
        { hello: "world" },
        { "X-Test": "123" }
      );
      console.log(resp);
    }
  } else {
    do_redirection();
  }
});
