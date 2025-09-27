import { isDebug } from "@/utils/consts";
import { WebCrawler } from "@rpc/web";
import { MSG_TYPE, type MSG_CRAWLER } from "@utils/msg";

chrome.runtime.onInstalled.addListener(() => {
  console.debug(`AutoNovel CSC production mode: ${isDebug}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== MSG_TYPE.CRAWLER_REQ) return;
  const msg = message as MSG_CRAWLER;
  const payload = msg.payload || {};
  payload.base_url ??= payload.data?.url;
  const crawler = new WebCrawler(payload.base_url);
  crawler
    .applyCommand(payload.cmd, payload.data)
    .then((result) => sendResponse({ success: true, result }))
    .catch((error) => sendResponse({ success: false, error: error.message }))
    .finally(async () => {
      await crawler.quit();
    });
  return true;
});
