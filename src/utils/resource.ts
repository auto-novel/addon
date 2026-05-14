import { Persist, RefCount } from "@/utils/persist";
import { newError } from "@/utils/tools";
import { DELAYED_TAB_CLOSE_TIME } from "@/utils/consts";

type Tab = Browser.tabs.Tab;
type TabId = number;

type TabState = {
  tabId: number;
  refCount: number;
};

export class TabResMgr {
  private tabState: Persist<TabId, TabState> = new Persist({
    tag: "tabRes",
    key2String: (key: TabId) => key.toString(),
  });

  private tabStateOpQueues: Map<TabId, Promise<unknown>> = new Map();

  constructor() {}

  private withTabStateAtomic<T>(
    tabId: TabId,
    operation: () => Promise<T>,
  ): Promise<T> {
    const current = this.tabStateOpQueues.get(tabId) || Promise.resolve();
    const result = current.then(() => operation());
    const queueRef = result.catch(() => {});
    this.tabStateOpQueues.set(tabId, queueRef);

    queueRef.finally(() => {
      if (this.tabStateOpQueues.get(tabId) === queueRef) {
        this.tabStateOpQueues.delete(tabId);
      }
    });

    return result;
  }

  async closeTab(tab: Tab): Promise<void> {
    if (!tab.id) return;
    await browser.tabs.remove(tab.id);
  }

  static genAlarmName(tabId?: number) {
    const prefix = "delayedCloseTab-";
    if (tabId === undefined) return prefix;
    return `${prefix}${tabId}`;
  }

  async findAndCloseTab(tabId: number) {
    await this.withTabStateAtomic(tabId, async () => {
      const tabState = await this.tabState.get(tabId);
      if (!tabState) return;
      if (tabState.refCount > 0) return;

      try {
        await browser.tabs.remove(tabId);
      } catch (e) {
        debugLog.warn("[TabResMgr] remove tab failed during delayed close", {
          tabId,
          error: e,
        });
      } finally {
        await this.tabState.del(tabId);
      }
    });
  }

  private async acquireTab(tabId: number) {
    await this.withTabStateAtomic(tabId, async () => {
      const tabState = await this.tabState.get(tabId);
      if (tabState == null) {
        debugLog.warn("[TabResMgr] acquireTab on missing tab state", { tabId });
        return;
      }

      await browser.alarms.clear(TabResMgr.genAlarmName(tabId));
      tabState.refCount += 1;
      await this.tabState.set(tabId, tabState);
    });
  }

  async releaseTab(tabId: number) {
    await this.withTabStateAtomic(tabId, async () => {
      const tabState = await this.tabState.get(tabId);
      if (tabState == null) return;

      // 查询是否是由插件创建的标签页
      tabState.refCount -= 1;
      await this.tabState.set(tabId, tabState);
      if (tabState.refCount > 0) return;

      // 开始延时关闭
      await browser.alarms.create(TabResMgr.genAlarmName(tabId), {
        delayInMinutes: DELAYED_TAB_CLOSE_TIME / 60000,
      });
    });
  }

  private urlLocks = new Map<string, Promise<any>>();

  private isTabMatchingUrl(tab: Tab, targetUrl: string): boolean {
    if (!tab.url) return false;
    try {
      const current = new URL(tab.url);
      const target = new URL(targetUrl);

      // Ignore hash when matching because navigation may rewrite fragments.
      return (
        current.origin === target.origin &&
        current.pathname === target.pathname &&
        current.search === target.search
      );
    } catch {
      return false;
    }
  }

  private async getTabIfExists(tabId: number): Promise<Tab | null> {
    try {
      return await browser.tabs.get(tabId);
    } catch {
      return null;
    }
  }

  private async findReusableTab(url: string): Promise<Tab | null> {
    const tabs = await browser.tabs.query({ url });
    if (tabs.length > 0) {
      return tabs[0];
    }

    // Firefox can miss in-flight navigations in url-filtered query.
    // Fallback to full scan and exact URL comparison (ignoring hash).
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
      if (this.isTabMatchingUrl(tab, url)) {
        return tab;
      }
    }

    return null;
  }

  findOrCreateTab(
    url: string,
    options?: {
      forceNewTab?: boolean;
      maxWait?: number;
    },
  ): Promise<Tab> {
    debugLog(`[TabResMgr] findOrCreateTab: ${url}`);
    const normalizedUrl = new URL(url);
    url = normalizedUrl.toString();

    const maxWait = options?.maxWait ?? MAX_PAGE_LOAD_WAIT_TIME;
    const createNewTabFn = async (): Promise<Tab> => {
      debugLog(`[TabResMgr] Creating new tab for URL: ${url}`);
      const tabRet = await browser.tabs.create({ url, active: false });

      let readyListener: (
        tabId: number,
        changeInfo: { status?: string },
        updatedTab: Tab,
      ) => void = () => {};

      const readyPromise = new Promise<void>((resolve) => {
        readyListener = (
          tabId: number,
          changeInfo: { status?: string },
          _updatedTab: Tab,
        ) => {
          if (tabId === tabRet.id && changeInfo.status === "complete") {
            browser.tabs.onUpdated.removeListener(readyListener);
            resolve();
          }
        };
        browser.tabs.onUpdated.addListener(readyListener);
      });

      await Promise.race([readyPromise, sleep(maxWait)]);
      browser.tabs.onUpdated.removeListener(readyListener);

      // 对于 Create 出来的标签页，由插件负责关闭。
      if (!tabRet.id) throw newError(`Tab has no id: ${url}`);
      await this.tabState.set(tabRet.id, {
        tabId: tabRet.id,
        refCount: 0,
      });

      return tabRet;
    };

    const criticalSection = async () => {
      let tab: Tab;
      let tabAcquired = false;

      if (options?.forceNewTab) {
        tab = await createNewTabFn();
      } else {
        const reusableTab = await this.findReusableTab(url);

        if (reusableTab?.id != null) {
          // Acquire first to clear delayed-close alarm as early as possible.
          await this.acquireTab(reusableTab.id);
          tabAcquired = true;

          const aliveTab = await this.getTabIfExists(reusableTab.id);
          if (aliveTab && this.isTabMatchingUrl(aliveTab, url)) {
            tab = aliveTab;
          } else {
            await this.releaseTab(reusableTab.id);
            tabAcquired = false;
            tab = await createNewTabFn();
          }
        } else {
          tab = await createNewTabFn();
        }
      }

      if (tab.id == null) throw newError(`Tab has no id: ${tab}`);
      if (!tabAcquired) {
        await this.acquireTab(tab.id);
      }

      return tab;
    };

    // 获取当前 URL 的锁，如果不存在则创建一个已解决的 Promise 作为起点
    const currentLock = this.urlLocks.get(url) || Promise.resolve();

    const result = currentLock.then(() => criticalSection());
    // 将此 URL 的锁更新为当前操作完成后的 Promise
    const lockRef = result.catch(() => {});
    this.urlLocks.set(url, lockRef);

    lockRef.finally(() => {
      // 只有当 Map 中的锁仍然是当前这个操作时才移除
      // 避免移除掉后续排队的任务设置的新锁
      if (this.urlLocks.get(url) === lockRef) {
        this.urlLocks.delete(url);
      }
    });

    return result;
  }
}

export const tabResMgr = new TabResMgr();

class RulesManager {
  // NOTE(kuriko): all RW is inside worker thread, so it's atomic
  ruleRefCount: RefCount = new RefCount("dnrRuleRefCount");

  async add(rules: Browser.declarativeNetRequest.Rule[]) {
    try {
      // NOTE(kuriko): JSON.stringify is stable for arrays
      const key = b64EncodeUnicode(JSON.stringify(rules));
      await this.ruleRefCount.inc(key);
      await browser.declarativeNetRequest.updateSessionRules({
        addRules: rules,
        removeRuleIds: rules.map((rule) => rule.id),
      });
    } catch (e) {
      const msg = `Failed to install rules, ignoring: ${e}`;
      debugLog.error(msg);
      throw newError(msg);
    }
  }

  async remove(rules: Browser.declarativeNetRequest.Rule[]) {
    try {
      const key = b64EncodeUnicode(JSON.stringify(rules));
      const cnt = await this.ruleRefCount.dec(key);
      if (cnt <= 0) {
        await browser.declarativeNetRequest.updateSessionRules({
          removeRuleIds: rules.map((rule) => rule.id),
        });
      }
    } catch (e) {
      const msg = `Failed to uninstall rules, ignoring: ${e}`;
      debugLog.error(msg);
      throw newError(msg);
    }
  }

  async clear() {
    const dynamicRules = await browser.declarativeNetRequest.getDynamicRules();
    debugLog("Cleaning up old browser rules: ", dynamicRules);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: dynamicRules.map((r) => r.id),
    });

    const sessionRules = await browser.declarativeNetRequest.getSessionRules();
    debugLog("Cleaning up old session rules: ", sessionRules);
    await browser.declarativeNetRequest.updateSessionRules({
      removeRuleIds: sessionRules.map((r) => r.id),
    });

    await this.ruleRefCount.clear();
  }
}

export const rulesMgr = new RulesManager();
