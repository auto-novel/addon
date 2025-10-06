import { browserInfo, detectBrowser, isDebug, isMessagingAllowed } from "@/utils/consts";
import { WebCrawler } from "@rpc/web";
import { MSG_TYPE, type AutoNovelCrawlerCommand, type Message, type MSG_CRAWLER, type MSG_RESPONSE } from "@utils/msg";
import { do_redirection } from "@utils/redirect";
import { Api } from "@utils/api";

const crawlerInstances: Map<string, WebCrawler> = new Map();

function getOrCreateCrawler(payload: AutoNovelCrawlerCommand, env: EnvType): WebCrawler {
  // Get or Create a job id.
  const job_id = env.job_id;

  const crawler =
    crawlerInstances.get(job_id) ??
    (() => {
      let newCrawler;
      if (payload.base_url == "local") {
        newCrawler = WebCrawler.fromTab(env, env.tab);
      } else {
        newCrawler = WebCrawler.fromURL(env, payload.base_url);
      }
      crawlerInstances.set(job_id, newCrawler);
      console.log(`[AutoNovel] New crawler instance created for id ${job_id}.`);
      return newCrawler;
    })();

  return crawler;
}

type Tab = chrome.tabs.Tab;
export type EnvType = {
  sender: chrome.runtime.MessageSender;
  tab: Tab;
  job_id: string;
};

const messageFn = (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) => {
  if (isDebug) {
    console.info("[AutoNovel] Received message: ", message, sender);
  }
  if (!isMessagingAllowed(sender.url ?? sender.origin ?? "")) return;
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

      const job_id = payload.job_id ?? crypto.randomUUID();
      const env: EnvType = {
        job_id,
        tab: sender.tab!,
        sender
      };

      const crawler = getOrCreateCrawler(payload, env);

      crawler
        .applyCommand(payload.cmd, payload.params, env)
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
            payload: { success: false, error: error.message }
          };
          return sendResponse(resp);
        })
        .finally(async () => {
          if (!payload.single) return;
          crawlerInstances.delete(job_id);
          await crawler.job_quit();
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
    return crawler.job_quit();
  });
  await Promise.all(quitPromises);
});

chrome.runtime.onInstalled.addListener(() => {
  console.debug(`[AutoNovel] CSC debug mode: ${isDebug}`);
});

chrome.runtime.onStartup.addListener(async () => {
  await detectBrowser();
});

chrome.action.onClicked.addListener(async () => {
  if (isDebug) {
    // const c = new WebCrawler("https://www.pixiv.net/novel/show.php?id=20701122");
    const api = Api.fromURL("https://example.com");
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
