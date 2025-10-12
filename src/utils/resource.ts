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

  private onLoadPromises: Map<TabId, Promise<Tab>> = new Map();

  constructor() {}

  public waitAnyTab(tab: Tab): Promise<Tab> {
    if (!tab.id) return Promise.reject("no tab id");
    if (tab.status === "complete") return Promise.resolve(tab);

    if (this.onLoadPromises.has(tab.id)) {
      debugLog("reusing existing onLoad promise for tab", tab.id);
      return this.onLoadPromises.get(tab.id)!;
    }

    const promise = new Promise<Tab>((resolve) => {
      const listener = (
        tabId: number,
        info: { status?: string },
        newTab: Tab,
      ) => {
        if (tabId === tab.id && info.status === "complete") {
          this.onLoadPromises.delete(tab.id!);
          clearTimeout(timeoutId);
          browser.tabs.onUpdated.removeListener(listener);
          resolve(newTab); // NOTE(kuriko): return the newTab states
        }
      };

      const timeoutId = setTimeout(() => {
        debugLog.warn("[TabResMgr] waitAnyTab timeout, resolving anyway", tab);
        this.onLoadPromises.delete(tab.id!);
        browser.tabs.onUpdated.removeListener(listener);
        debugLog.warn("timeout: ", tab);
        resolve(tab);
      }, MAX_PAGE_LOAD_WAIT_TIME);

      browser.tabs.onUpdated.addListener(listener);
    });

    this.onLoadPromises.set(tab.id, promise);
    return promise;
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
    const tabState = await this.tabState.get(tabId);
    if (!tabState) return;
    await Promise.all([browser.tabs.remove(tabId), this.tabState.del(tabId)]);
  }

  private async acquireTab(tabId: number) {
    const tabState = await this.tabState.get(tabId);
    if (tabState != null) {
      browser.alarms.clear(TabResMgr.genAlarmName(tabId));
      tabState.refCount += 1;
      await this.tabState.set(tabId, tabState);
    }
  }

  async releaseTab(tabId: number) {
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
  }

  async findOrCreateTab(url: string): Promise<Tab> {
    debugLog(`[TabResMgr] findOrCreateTab: ${url}`);
    const normalizedUrl = new URL(url);
    url = normalizedUrl.toString();

    const tabs = await browser.tabs.query({ url });
    // FIXME(kuriko): 如果用户此时手动关闭了标签页怎么办？
    let tab;
    if (tabs.length > 0) {
      tab = tabs[0];
    } else {
      tab = await browser.tabs.create({
        url,
        active: false,
      });
      // 对于 Create 出来的标签页，由插件负责关闭。
      if (!tab.id) throw newError(`Tab has no id: ${url}`);
      this.tabState.set(tab.id, {
        tabId: tab.id,
        refCount: 0,
      });
    }
    tab = await this.waitAnyTab(tab);

    if (tab.id == null) throw newError(`Tab has no id: ${tab}`);
    await this.acquireTab(tab.id);

    return tab;
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

  clear() {
    // Clear all rules
    browser.declarativeNetRequest.getDynamicRules((rules) => {
      debugLog("Cleaning up old rules: ", rules);
      browser.declarativeNetRequest.updateSessionRules({
        removeRuleIds: rules.map((r) => r.id),
      });
    });
    // Clear all persisted data
    this.ruleRefCount.clear();
  }
}

export const rulesMgr = new RulesManager();
