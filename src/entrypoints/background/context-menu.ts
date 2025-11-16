import { getRedirectionResult } from "./redirect";

type OnClickData = Browser.contextMenus.OnClickData;
type CreateProperties = Browser.contextMenus.CreateProperties;
type Tab = Browser.tabs.Tab;

type ContextMenuDefItem = {
  info: CreateProperties;
  handler: (info: OnClickData, tab?: Tab) => void;
};

const contextMenuDefs: Record<string, ContextMenuDefItem> = {
  "copy-auth-info": {
    info: <CreateProperties>{
      id: "copy-auth-info",
      title: "复制机翻站认证信息到当前域",
      type: "normal",
      contexts: ["page"],
      documentUrlPatterns: ["*://localhost/*"],
    },
    async handler(info: OnClickData, tab?: Tab) {
      if (info.menuItemId != "copy-auth-info") return;
      const targetUrl = tab?.url ?? null;
      if (!targetUrl) return;

      const novelTab = await tabResMgr.findOrCreateTab("https://n.novelia.cc", {
        maxWait: 500,
      });
      const authInfo: string = await browserRemoteExecution({
        target: { tabId: novelTab.id! },
        func: () => {
          const data = localStorage.getItem("auth") ?? "";
          console.warn("Addon request auto info:", data);
          return data;
        },
        args: [],
      });
      debugLog.info("Got auth info:", authInfo);

      if (!authInfo) {
        await browser.notifications.create({
          type: "basic",
          iconUrl: browser.runtime.getURL("/icons/48.png"),
          title: "错误",
          message: `错误：请先登录 n.novelia.cc 获取认证信息`,
        });
        return;
      }

      await browser.scripting.executeScript({
        target: { tabId: tab!.id! },
        func: (authInfo: string) => {
          localStorage.setItem("auth", authInfo);
          alert("已成功复制认证信息到当前域，按确定后刷新页面。");
          window.location.reload();
        },
        args: [authInfo],
      });
    },
  },
  "open-in-auto-novel": {
    info: <CreateProperties>{
      id: "open-in-auto-novel",
      title: "在机翻站中打开链接",
      type: "normal",
      contexts: ["page", "link"],
      documentUrlPatterns: [
        "*://*.amazon.co.jp/*",
        "*://kakuyomu.jp/*",
        "*://*.syosetu.com/*",
        "*://novelup.plus/*",
        "*://syosetu.org/*",
        "*://*.pixiv.net/*",
        "*://*.alphapolis.co.jp/*",
        "*://novelism.jp/*",
      ],
    },
    handler(info: OnClickData, tab?: Tab) {
      if (info.menuItemId != "open-in-auto-novel") return;
      const targetUrl = info.linkUrl ?? info.pageUrl ?? tab?.url ?? null;
      if (targetUrl == null) return;

      const redir = getRedirectionResult(targetUrl);
      if (!redir) {
        browser.notifications.create({
          type: "basic",
          iconUrl: browser.runtime.getURL("/icons/48.png"),
          title: "错误：无法识别该链接",
          message: `无法解析该链接: ${targetUrl}\n请确认该链接为机翻站支持的站点。`,
        });
        return;
      }

      browser.tabs.create({
        url: redir.url,
        active: false,
        index: tab?.index ? tab?.index + 1 : undefined,
        openerTabId: tab?.id,
      });
    },
  },
};

export function addContextMenu() {
  for (const [_, item] of Object.entries(contextMenuDefs)) {
    browser.contextMenus.create(item.info);
  }
}

export function handleContextMenu(info: OnClickData, tab?: Tab) {
  const handler = contextMenuDefs[info.menuItemId as string]?.handler;
  if (handler) {
    return handler(info, tab);
  }
}
