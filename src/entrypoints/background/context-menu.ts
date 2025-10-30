import { getRedirectionResult } from "./redirect";

type OnClickData = Browser.contextMenus.OnClickData;
type CreateProperties = Browser.contextMenus.CreateProperties;
type Tab = Browser.tabs.Tab;

type ContextMenuDefItem = {
  info: CreateProperties;
  handler: (info: OnClickData, tab?: Tab) => void;
};

const contextMenuDefs: Record<string, ContextMenuDefItem> = {
  "open-in-auto-novel": {
    info: <CreateProperties>{
      id: "open-in-auto-novel",
      title: "在机翻站中打开链接",
      type: "normal",
      contexts: ["page", "link"],
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
