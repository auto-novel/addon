import { clearLogs, debugLog } from "@/utils/log/backend";
import { exportLogs } from "@/utils/log/export";

import { getRedirectionResult } from "./redirect";
import { LOG_MAX_ENTRIES } from "@/utils/log/shared";

type OnClickData = Browser.contextMenus.OnClickData;
type CreateProperties = Browser.contextMenus.CreateProperties;
type Tab = Browser.tabs.Tab;

type ContextMenuDefItem = {
  info: CreateProperties;
  handler: (info: OnClickData, tab?: Tab) => void;
};

async function notify(title: string, message: string) {
  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("/icons/48.png"),
    title,
    message,
  });
}

async function handleExportLog() {
  try {
    const { count, filename } = await exportLogs();
    await notify("日志导出完成", `已导出 ${count} 条日志：${filename}`);
  } catch (error) {
    debugLog.error("Export logs failed", error);
    await notify(
      "日志导出失败",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function handleClearLogs() {
  try {
    const count = await clearLogs();
    await notify("日志已清除", `已清除 ${count} 条日志`);
  } catch (error) {
    debugLog.error("Clear logs failed", error);
    await notify(
      "日志清除失败",
      error instanceof Error ? error.message : String(error),
    );
  }
}

const contextMenuDefs: Record<string, ContextMenuDefItem> = {
  "export-log-all": {
    info: {
      id: "export-log-all",
      title: `导出全部日志（最近 ${LOG_MAX_ENTRIES} 条）`,
      type: "normal",
      contexts: ["action"],
    } satisfies CreateProperties,
    handler(info: OnClickData) {
      if (info.menuItemId != "export-log-all") return;
      void handleExportLog();
    },
  },
  "clear-logs": {
    info: {
      id: "clear-logs",
      title: "清除全部日志",
      type: "normal",
      contexts: ["action"],
    } satisfies CreateProperties,
    handler(info: OnClickData) {
      if (info.menuItemId != "clear-logs") return;
      void handleClearLogs();
    },
  },
  "copy-auth-info": {
    info: {
      id: "copy-auth-info",
      title: "复制机翻站认证信息到当前域",
      type: "normal",
      contexts: ["page"],
      documentUrlPatterns: ["*://localhost/*"],
    } satisfies CreateProperties,
    async handler(info: OnClickData, tab?: Tab) {
      if (info.menuItemId != "copy-auth-info") return;
      const targetUrl = tab?.url ?? null;
      if (!targetUrl) return;

      const novelTab = await tabResMgr.findOrCreateTab("https://n.novelia.cc", {
        maxWait: 1000,
      });
      try {
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
      } finally {
        if (novelTab.id != null) {
          await tabResMgr.releaseTab(novelTab.id, 3_000);
        }
      }
    },
  },
  "open-in-auto-novel": {
    info: {
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
        "*://*.syosetu.org/*",
        "*://*.pixiv.net/*",
        "*://*.alphapolis.co.jp/*",
        "*://novelism.jp/*",
      ],
    } satisfies CreateProperties,
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
  browser.contextMenus.removeAll();
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
