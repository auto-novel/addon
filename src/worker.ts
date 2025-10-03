import { isDebug } from "@/utils/consts";
import { WebCrawler } from "@rpc/web";
import { MSG_TYPE, type AutoNovelCrawlerCommand, type Message, type MSG_CRAWLER, type MSG_RESPONSE } from "@utils/msg";
import { do_redirection } from "@utils/redirect";
import { Api } from "@utils/api";

chrome.runtime.onInstalled.addListener(() => {
  console.debug(`[AutoNovel] CSC production mode: ${isDebug}`);
});

const crawlerInstances: Map<string, WebCrawler> = new Map();

function getOrCreateCrawler(payload: AutoNovelCrawlerCommand): [string, WebCrawler] {
  // Get or Create a job id.
  const job_id = payload.job_id ?? crypto.randomUUID();

  const crawler =
    crawlerInstances.get(job_id) ??
    (() => {
      if (!payload.base_url) {
        throw new Error("Cannot create a new crawler without a base_url.");
      }
      const newCrawler = new WebCrawler(payload.base_url);
      crawlerInstances.set(job_id, newCrawler);
      console.log(`[AutoNovel] New crawler instance created for id ${job_id}.`);
      return newCrawler;
    })();

  if (crawler.url != payload.base_url) {
    // Change the base URL if it's different.
    // This is for the case when not using single mode.
    crawler.url = payload.base_url;
  }

  return [job_id, crawler];
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const toRemove = crawlerInstances
    .entries()
    .filter(([_, crawler]) => crawler.api.tab_id === tabId)
    .toArray();

  if (toRemove.length === 0) return;

  for (const [job_id, _] of toRemove) {
    crawlerInstances.delete(job_id);
  }
  const quitPromises = toRemove.map(([_, crawler]) => {
    if (!crawler) return Promise.resolve();
    return crawler.quit();
  });
  await Promise.all(quitPromises);
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
      const payload = msg.payload ?? {};
      if (!payload.base_url) payload.base_url = payload.params?.url;
      payload.single = payload.single ?? true;
      msg.id = msg.id ?? crypto.randomUUID();

      const [job_id, crawler] = getOrCreateCrawler(payload);

      crawler
        .applyCommand(payload.cmd, payload.params)
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
          crawlerInstances.delete(job_id);
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
    const api = new Api("https://example.com");
    {
      const resp = await api.http_get("https://echo.free.beeceptor.com", { a: "1", b: "2" }, [["X-Test", "123"]]);
      console.log(resp);
    }
    {
      const resp = await api.http_fetch("https://echo.free.beeceptor.com");
      console.log(resp);
    }
    {
      const resp = await api.tab_http_fetch("https://echo.free.beeceptor.com");
      console.log(resp);
    }
    // {
    //   const resp = await api.http_post_json("https://echo.free.beeceptor.com", { hello: "world" }, [["X-Test", "123"]]);
    //   console.log(resp);
    // }
    // {
    //   await fut;
    //   const resp = await api.tab_http_get("https://echo.free.beeceptor.com", { a: "1", b: "2" }, [["X-Test", "123"]]);
    //   console.log(resp);
    // }
    // {
    //   const resp = await api.tab_http_post_json(
    //     "https://echo.free.beeceptor.com",
    //     { hello: "world" },
    //     [["X-Test", "123"]]
    //   );
    //   console.log(resp);
    // }
  } else {
    do_redirection();
  }
});
