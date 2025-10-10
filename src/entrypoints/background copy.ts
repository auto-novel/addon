import { IS_DEBUG } from "@/utils/consts";
import {
  MsgType,
  type CrawlerCommand,
  type Message,
  type MsgCrawler,
  type MsgResponse,
} from "@/rpc/msg";
import { doRedirection } from "@/utils/redirect";

export default defineBackground(() => {
  const crawlerInstances: Map<string, WebCrawler> = new Map();

  function getOrCreateCrawler(
    payload: CrawlerCommand,
    env: EnvType,
  ): WebCrawler {
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
        console.log(
          `[AutoNovel] New crawler instance created for id ${job_id}.`,
        );
        return newCrawler;
      })();

    return crawler;
  }

  const messageFn = (
    message: Message,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response: any) => void,
  ) => {
    if (IS_DEBUG) {
      console.info("[AutoNovel] Received message: ", message, sender);
    }
    if (!isMessagingAllowed(sender.url ?? sender.origin ?? "")) return;
    switch (message.type) {
      case MsgType.Ping: {
        sendResponse("pong");
        break;
      }
      case MsgType.CrawlerReq: {
        const msg = message as MsgCrawler;
        const payload = msg.payload ?? {};
        if (!payload.base_url) payload.base_url = payload.params?.url;

        payload.single = payload.single ?? true;
        msg.id = msg.id ?? crypto.randomUUID();

        const job_id = payload.job_id ?? crypto.randomUUID();
        const env: EnvType = {
          job_id,
          tab: sender.tab!,
          sender,
        };

        const crawler = getOrCreateCrawler(payload, env);

        crawler
          .applyCommand(payload.cmd, payload.params, env)
          .then((result) => {
            console.debug("[AutoNovel] Crawler Result: ", result);

            const resp: MsgResponse = {
              type: MsgType.Response,
              id: msg.id,
              payload: { success: true, result },
            };
            return sendResponse(resp);
          })
          .catch((error) => {
            const resp: MsgResponse = {
              type: MsgType.Response,
              id: msg.id,
              payload: { success: false, error: error.message },
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

  browser.runtime.onMessage.addListener(messageFn);
  browser.runtime.onMessageExternal.addListener(messageFn);

  browser.tabs.onRemoved.addListener(async (tabId) => {
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

  browser.runtime.onInstalled.addListener(() => {
    console.debug(`[AutoNovel] CSC debug mode: ${IS_DEBUG}`);
    browser.declarativeNetRequest.getDynamicRules((rules) => {
      console.info("[AutoNovel] Cleaning up old rules: ", rules);
      browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((r) => r.id),
      });
    });
  });

  browser.runtime.onStartup.addListener(async () => {
    await detectBrowser();
    await browser.declarativeNetRequest.getDynamicRules((rules) => {
      console.info("[AutoNovel] Cleaning up old rules: ", rules);
      browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((r) => r.id),
      });
    });
  });

  browser.action.onClicked.addListener(async () => {
    if (IS_DEBUG) {
      // FIXME(kuriko): 怎么可能又重定向又打开设置页的
      // browser.runtime.openOptionsPage();

      // const c = new WebCrawler("https://www.pixiv.net/novel/show.php?id=20701122");
      const api = Api.fromURL("https://example.com");
      {
        const resp = await api.http_get(
          "https://echo.free.beeceptor.com",
          { a: "1", b: "2" },
          [["X-Test", "123"]],
        );
        console.log(resp);
      }
      {
        const resp = await api.http_fetch("https://echo.free.beeceptor.com");
        console.log(resp);
      }
      {
        const resp = await api.tab_http_fetch(
          "https://echo.free.beeceptor.com",
        );
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
    } else if (true /* TODO(kuriko): 检测是否是应该 redirect 的页面 */) {
      doRedirection();
    }
  });
});
