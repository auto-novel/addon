import { isDebug } from "@/utils/consts";
import { WebCrawler } from "@rpc/web";
import { MSG_TYPE, type MSG_CRAWLER } from "@utils/msg";
import { do_redirection } from "@utils/redirect";
import { Api } from "@utils/api";
import { sleep } from "@utils/tools";

chrome.runtime.onInstalled.addListener(() => {
  console.debug(`[AutoNovel] CSC production mode: ${isDebug}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== MSG_TYPE.CRAWLER_REQ) return;
  const msg = message as MSG_CRAWLER;
  const payload = msg.payload || {};
  if (!payload.base_url) payload.base_url = payload.data?.url;
  payload.continue = payload.continue || false;

  const crawler = new WebCrawler(payload.base_url);
  crawler
    .applyCommand(payload.cmd, payload.data)
    .then((result) => {
      if (isDebug) {
        console.log("[AutoNovel] Crawler Result: ", result);
      }
      return sendResponse({ success: true, result });
    })
    .catch((error) => sendResponse({ success: false, error: error.message }))
    .finally(async () => {
      if (payload.continue) return;
      await crawler.quit();
    });
  return true;
});

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
    // await api.close();
  } else {
    do_redirection();
  }
});
